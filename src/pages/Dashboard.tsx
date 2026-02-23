import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Calendar, TrendingUp, TrendingDown, Target } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, subMonths, subQuarters } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { QuickStats } from "@/components/dashboard/QuickStats";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { FAB } from "@/components/expense/FAB";
import { AddExpenseSheet } from "@/components/expense/AddExpenseSheet";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface DashboardData {
  totalBalance: number;
  monthlyEarnings: number;
  monthlyExpenses: number;
  netSavings: number;
}

interface ProjectionData {
  best: number;
  worst: number;
  conventional: number;
}

type DateRangeType = "month" | "quarter" | "custom";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
  const [stats, setStats] = useState<DashboardData>({
    totalBalance: 0,
    monthlyEarnings: 0,
    monthlyExpenses: 0,
    netSavings: 0,
  });
  const [profile, setProfile] = useState<{ name: string } | null>(null);
  const [dateRangeType, setDateRangeType] = useState<DateRangeType>("month");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [selectedQuarter, setSelectedQuarter] = useState<number>(Math.floor(new Date().getMonth() / 3) + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [customStartDate, setCustomStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [customEndDate, setCustomEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [projections, setProjections] = useState<ProjectionData>({
    best: 0,
    worst: 0,
    conventional: 0,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const getDateRange = () => {
    let startDate: Date;
    let endDate: Date;

    if (dateRangeType === "month") {
      const [year, month] = selectedMonth.split("-").map(Number);
      startDate = startOfMonth(new Date(year, month - 1, 1));
      endDate = endOfMonth(new Date(year, month - 1, 1));
    } else if (dateRangeType === "quarter") {
      const year = parseInt(selectedYear);
      const quarterStartMonth = (selectedQuarter - 1) * 3;
      startDate = startOfQuarter(new Date(year, quarterStartMonth, 1));
      endDate = endOfQuarter(new Date(year, quarterStartMonth, 1));
    } else {
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
    }

    return {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      startDateStr: format(startDate, "yyyy-MM-dd"),
      endDateStr: format(endDate, "yyyy-MM-dd"),
    };
  };

  const calculateProjections = async (currentEarnings: number, currentExpenses: number) => {
    if (!user) return;

    // Fetch historical data (last 3 months)
    const now = new Date();
    const threeMonthsAgo = subMonths(now, 3);
    const startDate = startOfMonth(threeMonthsAgo).toISOString();
    const endDate = endOfMonth(now).toISOString();

    // Get historical earnings
    const { data: historicalTimesheets } = await supabase
      .from("timesheets")
      .select("hours_worked, hourly_pay, work_date")
      .eq("user_id", user.id)
      .gte("work_date", startDate.split("T")[0])
      .lte("work_date", endDate.split("T")[0]);

    // Get historical expenses
    const { data: historicalExpenses } = await supabase
      .from("expenses")
      .select("amount, date_time")
      .eq("user_id", user.id)
      .gte("date_time", startDate)
      .lte("date_time", endDate);

    if (!historicalTimesheets || !historicalExpenses) return;

    // Group by month period (month-year key)
    const monthlyData: Record<string, { earnings: number; expenses: number }> = {};

    historicalTimesheets.forEach(ts => {
      const date = new Date(ts.work_date);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { earnings: 0, expenses: 0 };
      }
      monthlyData[monthKey].earnings += Number(ts.hours_worked) * Number(ts.hourly_pay);
    });

    historicalExpenses.forEach(exp => {
      const date = new Date(exp.date_time);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { earnings: 0, expenses: 0 };
      }
      monthlyData[monthKey].expenses += Number(exp.amount);
    });

    const earningsArray = Object.values(monthlyData).map(m => m.earnings).filter(v => v > 0);
    const expensesArray = Object.values(monthlyData).map(m => m.expenses).filter(v => v > 0);

    if (earningsArray.length === 0 || expensesArray.length === 0) {
      // Not enough data, use current month as baseline
      const avgEarnings = currentEarnings;
      const avgExpenses = currentExpenses;
      
      setProjections({
        best: avgEarnings * 1.2 - avgExpenses * 0.8, // 20% more earnings, 20% less expenses
        worst: avgEarnings * 0.8 - avgExpenses * 1.2, // 20% less earnings, 20% more expenses
        conventional: avgEarnings - avgExpenses, // Same as current
      });
      return;
    }

    // Calculate averages
    const avgEarnings = earningsArray.reduce((a, b) => a + b, 0) / earningsArray.length;
    const avgExpenses = expensesArray.reduce((a, b) => a + b, 0) / expensesArray.length;

    // Calculate min/max for best/worst case
    const minEarnings = Math.min(...earningsArray);
    const maxEarnings = Math.max(...earningsArray);
    const minExpenses = Math.min(...expensesArray);
    const maxExpenses = Math.max(...expensesArray);

    setProjections({
      best: maxEarnings - minExpenses, // Best earnings, lowest expenses
      worst: minEarnings - maxExpenses, // Worst earnings, highest expenses
      conventional: avgEarnings - avgExpenses, // Average scenario
    });
  };

  const fetchDashboardData = async () => {
    if (!user) return;

    setIsLoading(true);

    // Fetch profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("name")
      .eq("user_id", user.id)
      .single();

    setProfile(profileData);

    // Fetch bank accounts total
    const { data: bankAccounts } = await supabase
      .from("bank_accounts")
      .select("current_balance")
      .eq("user_id", user.id);

    const bankTotal = bankAccounts?.reduce((sum, acc) => sum + Number(acc.current_balance), 0) || 0;

    // Fetch cash account
    const { data: cashAccount } = await supabase
      .from("cash_account")
      .select("current_balance")
      .eq("user_id", user.id)
      .single();

    const cashTotal = cashAccount?.current_balance ? Number(cashAccount.current_balance) : 0;

    // Get date range based on selection
    const { start, end, startDateStr, endDateStr } = getDateRange();

    // Fetch expenses for selected period
    const { data: periodExpenses } = await supabase
      .from("expenses")
      .select("amount")
      .eq("user_id", user.id)
      .gte("date_time", start)
      .lte("date_time", end);

    const totalPeriodExpenses = periodExpenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;

    // Fetch earnings from timesheets for selected period
    const { data: periodTimesheets } = await supabase
      .from("timesheets")
      .select("hours_worked, hourly_pay")
      .eq("user_id", user.id)
      .gte("work_date", startDateStr)
      .lte("work_date", endDateStr);

    const totalPeriodEarnings = periodTimesheets?.reduce(
      (sum, ts) => sum + Number(ts.hours_worked) * Number(ts.hourly_pay),
      0
    ) || 0;

    // Fetch recent expenses
    const { data: recent } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("date_time", { ascending: false })
      .limit(5);

    setRecentExpenses(recent || []);
    setStats({
      totalBalance: bankTotal + cashTotal,
      monthlyEarnings: totalPeriodEarnings,
      monthlyExpenses: totalPeriodExpenses,
      netSavings: totalPeriodEarnings - totalPeriodExpenses,
    });

    // Calculate projections
    await calculateProjections(totalPeriodEarnings, totalPeriodExpenses);

    setIsLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, dateRangeType, selectedMonth, selectedQuarter, selectedYear, customStartDate, customEndDate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <AppLayout>
      {/* Header */}
      <header className="glass-header px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{greeting()}</p>
            <h1 className="text-xl font-bold">{profile?.name || "User"}</h1>
          </div>
          <button 
            onClick={() => navigate("/more")}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center touch-feedback"
          >
            <Settings className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {/* Date Range Selection */}
        <section className="bg-card rounded-2xl border border-border p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Date Range</h2>
          </div>
          
          <Select value={dateRangeType} onValueChange={(value) => setDateRangeType(value as DateRangeType)}>
            <SelectTrigger className="touch-input h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Monthly</SelectItem>
              <SelectItem value="quarter">Quarterly</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {dateRangeType === "month" && (
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="touch-input"
            />
          )}

          {dateRangeType === "quarter" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Quarter</label>
                <Select
                  value={selectedQuarter.toString()}
                  onValueChange={(value) => setSelectedQuarter(parseInt(value))}
                >
                  <SelectTrigger className="touch-input h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Q1 (Jan-Mar)</SelectItem>
                    <SelectItem value="2">Q2 (Apr-Jun)</SelectItem>
                    <SelectItem value="3">Q3 (Jul-Sep)</SelectItem>
                    <SelectItem value="4">Q4 (Oct-Dec)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Year</label>
                <Input
                  type="number"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="touch-input"
                  min="2020"
                  max={new Date().getFullYear() + 1}
                />
              </div>
            </div>
          )}

          {dateRangeType === "custom" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Start Date</label>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="touch-input"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">End Date</label>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="touch-input"
                />
              </div>
            </div>
          )}
        </section>

        {/* Quick Stats */}
        <section>
          <QuickStats
            totalBalance={stats.totalBalance}
            monthlyEarnings={stats.monthlyEarnings}
            monthlyExpenses={stats.monthlyExpenses}
            netSavings={stats.netSavings}
          />
        </section>

        {/* Projections */}
        <section className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Projections</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Based on your historical data, here's what your savings could look like:
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-success/10 border border-success/20">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-success" />
                <span className="text-sm font-medium">Best Case</span>
              </div>
              <span className="text-lg font-bold text-success">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  minimumFractionDigits: 0,
                }).format(projections.best)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Conventional</span>
              </div>
              <span className="text-lg font-bold text-primary">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  minimumFractionDigits: 0,
                }).format(projections.conventional)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-destructive/10 border border-destructive/20">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-destructive" />
                <span className="text-sm font-medium">Worst Case</span>
              </div>
              <span className="text-lg font-bold text-destructive">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  minimumFractionDigits: 0,
                }).format(projections.worst)}
              </span>
            </div>
          </div>
        </section>

        {/* Recent Activity */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
            <button 
              onClick={() => navigate("/expenses")}
              className="text-sm text-primary"
            >
              View All
            </button>
          </div>
          <RecentActivity expenses={recentExpenses} isLoading={isLoading} />
        </section>
      </div>

      {/* FAB */}
      <FAB onClick={() => setShowAddExpense(true)} />

      {/* Add Expense Sheet */}
      <AddExpenseSheet
        isOpen={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        onSuccess={fetchDashboardData}
      />
    </AppLayout>
  );
}
