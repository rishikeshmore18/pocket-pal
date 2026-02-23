import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, TrendingUp, TrendingDown, Target } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, subMonths } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";

type DateRangeType = "month" | "quarter" | "custom";

interface ProjectionData {
  best: number;
  worst: number;
  conventional: number;
}

export default function Stats() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [categoryData, setCategoryData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);

  // Date range state
  const [dateRangeType, setDateRangeType] = useState<DateRangeType>("month");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [selectedQuarter, setSelectedQuarter] = useState<number>(Math.floor(new Date().getMonth() / 3) + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [customStartDate, setCustomStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [customEndDate, setCustomEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  // Projections
  const [projections, setProjections] = useState<ProjectionData>({ best: 0, worst: 0, conventional: 0 });

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

    const now = new Date();
    const threeMonthsAgo = subMonths(now, 3);
    const startDate = startOfMonth(threeMonthsAgo).toISOString();
    const endDate = endOfMonth(now).toISOString();

    const { data: historicalTimesheets } = await supabase
      .from("timesheets")
      .select("hours_worked, hourly_pay, work_date")
      .eq("user_id", user.id)
      .gte("work_date", startDate.split("T")[0])
      .lte("work_date", endDate.split("T")[0]);

    const { data: historicalExpenses } = await supabase
      .from("expenses")
      .select("amount, date_time")
      .eq("user_id", user.id)
      .gte("date_time", startDate)
      .lte("date_time", endDate);

    if (!historicalTimesheets || !historicalExpenses) return;

    const monthlyData: Record<string, { earnings: number; expenses: number }> = {};

    historicalTimesheets.forEach(ts => {
      const date = new Date(ts.work_date);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      if (!monthlyData[monthKey]) monthlyData[monthKey] = { earnings: 0, expenses: 0 };
      monthlyData[monthKey].earnings += Number(ts.hours_worked) * Number(ts.hourly_pay);
    });

    historicalExpenses.forEach(exp => {
      const date = new Date(exp.date_time);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      if (!monthlyData[monthKey]) monthlyData[monthKey] = { earnings: 0, expenses: 0 };
      monthlyData[monthKey].expenses += Number(exp.amount);
    });

    const earningsArray = Object.values(monthlyData).map(m => m.earnings).filter(v => v > 0);
    const expensesArray = Object.values(monthlyData).map(m => m.expenses).filter(v => v > 0);

    if (earningsArray.length === 0 || expensesArray.length === 0) {
      setProjections({
        best: currentEarnings * 1.2 - currentExpenses * 0.8,
        worst: currentEarnings * 0.8 - currentExpenses * 1.2,
        conventional: currentEarnings - currentExpenses,
      });
      return;
    }

    const minEarnings = Math.min(...earningsArray);
    const maxEarnings = Math.max(...earningsArray);
    const minExpenses = Math.min(...expensesArray);
    const maxExpenses = Math.max(...expensesArray);
    const avgEarnings = earningsArray.reduce((a, b) => a + b, 0) / earningsArray.length;
    const avgExpenses = expensesArray.reduce((a, b) => a + b, 0) / expensesArray.length;

    setProjections({
      best: maxEarnings - minExpenses,
      worst: minEarnings - maxExpenses,
      conventional: avgEarnings - avgExpenses,
    });
  };

  const fetchStats = async () => {
    if (!user) return;

    setIsLoading(true);

    const { start, end, startDateStr, endDateStr } = getDateRange();

    // Fetch expenses by category for selected period
    const { data: expenses } = await supabase
      .from("expenses")
      .select("category, amount")
      .eq("user_id", user.id)
      .gte("date_time", start)
      .lte("date_time", end);

    if (expenses) {
      const categoryTotals = expenses.reduce((acc, exp) => {
        acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount);
        return acc;
      }, {} as Record<string, number>);

      const colors = [
        "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4",
        "#f97316", "#ec4899", "#84cc16", "#6366f1", "#14b8a6", "#a855f7",
      ];

      const data = Object.entries(categoryTotals).map(([cat, value], i) => ({
        name: EXPENSE_CATEGORIES.find(c => c.value === cat)?.label || cat,
        value,
        color: colors[i % colors.length],
      }));

      setCategoryData(data);
      setTotalExpenses(expenses.reduce((sum, exp) => sum + Number(exp.amount), 0));
    }

    // Fetch income for selected period
    const { data: timesheets } = await supabase
      .from("timesheets")
      .select("hours_worked, hourly_pay")
      .eq("user_id", user.id)
      .gte("work_date", startDateStr)
      .lte("work_date", endDateStr);

    const income = timesheets?.reduce((sum, ts) => sum + Number(ts.hours_worked) * Number(ts.hourly_pay), 0) || 0;
    setTotalIncome(income);

    const expTotal = expenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
    await calculateProjections(income, expTotal);

    setIsLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user, dateRangeType, selectedMonth, selectedQuarter, selectedYear, customStartDate, customEndDate]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

  return (
    <AppLayout>
      {/* Header */}
      <header className="glass-header px-4 py-4">
        <h1 className="text-xl font-bold">Statistics</h1>
        <p className="text-sm text-muted-foreground">Analyze your finances</p>
      </header>

      <div className="px-4 py-4 space-y-6">
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

        {isLoading ? (
          <div className="space-y-4">
            <div className="h-64 bg-muted rounded-2xl animate-pulse" />
            <div className="h-32 bg-muted rounded-2xl animate-pulse" />
          </div>
        ) : (
          <>
            {/* Spending by Category */}
            <section className="bg-card rounded-2xl border border-border p-4">
              <h2 className="font-semibold mb-4">Spending by Category</h2>
              {categoryData.length > 0 ? (
                <>
                  <div className="h-48 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          dataKey="value"
                          stroke="none"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{formatCurrency(totalExpenses)}</p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 mt-4">
                    {categoryData.map((cat, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0 border-2 border-background"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-sm font-medium flex-1 truncate">{cat.name}</span>
                        <span className="text-sm font-semibold ml-auto">{formatCurrency(cat.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-center text-muted-foreground py-8">No expenses in this period</p>
              )}
            </section>

            {/* Income vs Expenses */}
            <section className="bg-card rounded-2xl border border-border p-4">
              <h2 className="font-semibold mb-4">Income vs Expenses</h2>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "Income", value: totalIncome, fill: "#10b981" },
                      { name: "Expenses", value: totalExpenses, fill: "#ef4444" },
                    ]}
                    layout="vertical"
                  >
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={70} tick={{ fill: "#a3a3a3", fontSize: 12 }} />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card rounded-2xl border border-border p-4">
                <p className="text-sm text-muted-foreground">Net Savings</p>
                <p className={`text-xl font-bold ${netSavings >= 0 ? "text-success" : "text-destructive"}`}>
                  {formatCurrency(netSavings)}
                </p>
              </div>
              <div className="bg-card rounded-2xl border border-border p-4">
                <p className="text-sm text-muted-foreground">Savings Rate</p>
                <p className={`text-xl font-bold ${savingsRate >= 0 ? "text-success" : "text-destructive"}`}>
                  {savingsRate}%
                </p>
              </div>
            </div>

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
                  <span className="text-lg font-bold text-success">{formatCurrency(projections.best)}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Conventional</span>
                  </div>
                  <span className="text-lg font-bold text-primary">{formatCurrency(projections.conventional)}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-destructive" />
                    <span className="text-sm font-medium">Worst Case</span>
                  </div>
                  <span className="text-lg font-bold text-destructive">{formatCurrency(projections.worst)}</span>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}
