import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";
import { getDaysInMonth, getDate, format, startOfMonth, endOfMonth } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { QuickStats } from "@/components/dashboard/QuickStats";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { FAB } from "@/components/expense/FAB";
import { AddExpenseSheet } from "@/components/expense/AddExpenseSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DashboardData {
  totalBalance: number;
  monthlyEarnings: number;
  monthlyExpenses: number;
  netSavings: number;
  totalDebt: number;
}

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
    totalDebt: 0,
  });
  const [profile, setProfile] = useState<{ name: string } | null>(null);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [budgetLimits, setBudgetLimits] = useState<any[]>([]);
  const [fixedExpensesList, setFixedExpensesList] = useState<any[]>([]);
  const [categorySpend, setCategorySpend] = useState<Record<string, number>>({});
  const [showCategoryOverride, setShowCategoryOverride] = useState<string | null>(null);
  const [overrideInput, setOverrideInput] = useState("");
  const [currencySymbol, setCurrencySymbol] = useState("$");
  const [paidFixedNames, setPaidFixedNames] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const fetchDashboardData = async () => {
    if (!user) return;

    setIsLoading(true);

    // Fetch profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("name, currency_symbol")
      .eq("user_id", user.id)
      .single();

    setProfile(profileData);
    setCurrencySymbol(profileData?.currency_symbol || "$");

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

    // Current month range
    const now = new Date();
    const start = startOfMonth(now).toISOString();
    const end = endOfMonth(now).toISOString();
    const startDateStr = format(startOfMonth(now), "yyyy-MM-dd");
    const endDateStr = format(endOfMonth(now), "yyyy-MM-dd");

    // Fetch expenses for current month
    const { data: periodExpenses } = await supabase
      .from("expenses")
      .select("amount")
      .eq("user_id", user.id)
      .gte("date_time", start)
      .lte("date_time", end);

    const totalPeriodExpenses = periodExpenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;

    // Fetch earnings from timesheets for current month
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

    // Fetch total debt
    const { data: debts } = await supabase
      .from("debts")
      .select("current_amount")
      .eq("user_id", user.id);

    const totalDebt = debts?.reduce((sum, d) => sum + Number(d.current_amount), 0) || 0;

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
      totalDebt,
    });

    // Fetch monthly income
    const { data: incomeData } = await (supabase as any)
      .from("income_settings")
      .select("monthly_income")
      .eq("user_id", user.id)
      .single();
    setMonthlyIncome(incomeData?.monthly_income ? Number(incomeData.monthly_income) : 0);

    // Fetch budget limits
    const { data: limitsData } = await (supabase as any)
      .from("budget_limits")
      .select("*")
      .eq("user_id", user.id);
    setBudgetLimits(limitsData || []);

    // Fetch fixed expenses
    const { data: fixedData } = await (supabase as any)
      .from("fixed_expenses")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true);
    setFixedExpensesList(fixedData || []);

    // Fetch category breakdown for current month
    const { data: catExpenses } = await supabase
      .from("expenses")
      .select("category, amount")
      .eq("user_id", user.id)
      .gte("date_time", start)
      .lte("date_time", end);

    const catMap: Record<string, number> = {};
    catExpenses?.forEach((e) => {
      catMap[e.category] = (catMap[e.category] || 0) + Number(e.amount);
    });
    setCategorySpend(catMap);

    const { data: paidFixed } = await (supabase as any)
      .from("expenses")
      .select("expense_name")
      .eq("user_id", user.id)
      .eq("is_fixed", true)
      .gte("date_time", start)
      .lte("date_time", end);
    setPaidFixedNames(new Set((paidFixed || []).map((e: any) => e.expense_name)));

    setIsLoading(false);
  };

  const getEffectiveBudgetLimit = (category: string) => {
    const currentMonth = format(new Date(), "yyyy-MM");
    const row = budgetLimits.find((b) => b.category === category);
    if (!row) return 0;
    if (row.month_override && row.override_month === currentMonth) {
      return Number(row.month_override);
    }
    return Number(row.default_limit);
  };

  const totalBudget = budgetLimits.reduce((sum, b) => {
    const currentMonth = format(new Date(), "yyyy-MM");
    const limit = b.month_override && b.override_month === currentMonth ? Number(b.month_override) : Number(b.default_limit);
    return sum + limit;
  }, 0);

  const now = new Date();
  const daysInMonth = getDaysInMonth(now);
  const daysElapsed = getDate(now);
  const daysLeft = daysInMonth - daysElapsed;

  const burnRate = daysElapsed > 0 ? stats.monthlyExpenses / daysElapsed : 0;
  const projectedMonthEnd = burnRate * daysInMonth;
  const totalFixed = fixedExpensesList.reduce((s, f) => s + Number(f.amount), 0);
  const projectedFinal = Math.max(
    projectedMonthEnd,
    stats.monthlyExpenses +
      fixedExpensesList.filter((f) => (f.due_day || new Date(f.due_date).getDate()) > getDate(now)).reduce((s, f) => s + Number(f.amount), 0),
  );
  const predictedSavings = monthlyIncome - projectedFinal;
  const dailyBudgetLeft = daysLeft > 0 ? (totalBudget - stats.monthlyExpenses) / daysLeft : 0;

  const CATEGORY_COLORS: Record<string, string> = {
    rent: "#ef4444",
    utilities: "#6b7280",
    grocery: "#22c55e",
    fast_food: "#eab308",
    transport: "#3b82f6",
    credit_card: "#8b5cf6",
    entertainment: "#a855f7",
    healthcare: "#ec4899",
    shopping: "#f97316",
    other: "#78716c",
  };

  const handleSaveCategoryOverride = async (category: string) => {
    if (!user || !overrideInput) return;
    const currentMonth = format(new Date(), "yyyy-MM");
    const existing = budgetLimits.find((b) => b.category === category);
    await (supabase as any).from("budget_limits").upsert(
      {
        user_id: user.id,
        category,
        default_limit: existing?.default_limit || 0,
        month_override: parseFloat(overrideInput),
        override_month: currentMonth,
      },
      { onConflict: "user_id,category" },
    );
    toast.success("Override saved");
    setShowCategoryOverride(null);
    setOverrideInput("");
    fetchDashboardData();
  };

  const upcomingBills = fixedExpensesList.filter((f) => !paidFixedNames.has(f.expense_name));

  const handleMarkFixedPaid = async (fixed: any) => {
    await (supabase as any).from("expenses").insert({
      user_id: user.id,
      expense_name: fixed.expense_name,
      amount: fixed.amount,
      category: fixed.category,
      payment_method: "bank_transfer",
      is_fixed: true,
      date_time: new Date().toISOString(),
    });
    toast.success(`${fixed.expense_name} marked as paid`);
    fetchDashboardData();
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

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
        {monthlyIncome === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-sm text-muted-foreground">
              <button onClick={() => navigate("/settings")} className="text-primary underline">
                Set your income in Settings
              </button>{" "}
              to see your forecast
            </p>
          </div>
        ) : (
          <div
            className={cn(
              "rounded-2xl border p-4 space-y-2",
              predictedSavings >= 0 ? "bg-green-950/30 border-green-800" : "bg-red-950/30 border-red-800",
            )}
          >
            <div className="flex justify-between items-center">
              <p className="font-semibold text-base">{format(new Date(), "MMMM yyyy")}</p>
              <p className="text-sm text-muted-foreground">
                Income: {currencySymbol}
                {monthlyIncome.toLocaleString()}
              </p>
            </div>
            <p className={cn("text-lg font-bold", predictedSavings >= 0 ? "text-green-400" : "text-red-400")}>
              {predictedSavings >= 0
                ? `✅ On Track — Saving ${Math.abs(predictedSavings).toLocaleString()}`
                : `🔴 Overspending — Over by ${Math.abs(predictedSavings).toLocaleString()}`}
            </p>
            <p className="text-xs text-muted-foreground">
              Projected spend: {currencySymbol}
              {projectedFinal.toLocaleString()}
            </p>
          </div>
        )}

        <div className="bg-card rounded-2xl border border-border p-4 flex justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground">Net Worth</p>
            <p
              className={cn(
                "text-2xl font-bold",
                stats.totalBalance - stats.totalDebt >= 0 ? "text-green-400" : "text-red-400",
              )}
            >
              {currencySymbol}
              {(stats.totalBalance - stats.totalDebt).toLocaleString()}
            </p>
          </div>
          <p className="text-xs text-muted-foreground text-right whitespace-pre-line">
            Assets: {currencySymbol}
            {stats.totalBalance.toLocaleString()}
            {"\n"}
            Liabilities: {currencySymbol}
            {stats.totalDebt.toLocaleString()}
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <div className="flex justify-between items-center">
            <p className="font-semibold">This Month's Budget</p>
            <p className="text-sm text-muted-foreground">
              {totalBudget > 0 ? `${Math.round((stats.monthlyExpenses / totalBudget) * 100)}% used` : "No budget set"}
            </p>
          </div>

          {totalBudget === 0 ? (
            <button onClick={() => navigate("/settings")} className="text-sm text-primary">
              Set budget limits in Settings →
            </button>
          ) : (
            <>
              <div className="w-full h-4 rounded-full overflow-hidden flex bg-muted">
                {Object.entries(categorySpend).map(([cat, amount]) => (
                  <div
                    key={cat}
                    style={{
                      width: `${Math.min((amount / totalBudget) * 100, 100)}%`,
                      backgroundColor: CATEGORY_COLORS[cat] || "#78716c",
                      minWidth: amount > 0 ? "4px" : "0",
                    }}
                  />
                ))}
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
                {Object.entries(categorySpend).map(([cat, amount]) => {
                  const currentMonth = format(new Date(), "yyyy-MM");
                  const limitRow = budgetLimits.find((b) => b.category === cat);
                  const hasOverride = limitRow?.month_override && limitRow?.override_month === currentMonth;
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        setShowCategoryOverride(cat);
                        setOverrideInput(getEffectiveBudgetLimit(cat).toString());
                      }}
                      className="flex items-center gap-1.5 bg-secondary rounded-full px-3 py-1.5 text-xs whitespace-nowrap touch-feedback"
                    >
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
                      <span className="capitalize">{cat.replace("_", " ")}</span>
                      <span className="font-medium">
                        {currencySymbol}
                        {amount.toLocaleString()}
                      </span>
                      {hasOverride && <span>✏️</span>}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {showCategoryOverride && (
            <div className="bg-secondary rounded-xl p-3 space-y-2 border border-border">
              <p className="font-medium capitalize">{showCategoryOverride.replace("_", " ")}</p>
              <p className="text-xs text-muted-foreground">
                Spent: {currencySymbol}
                {(categorySpend[showCategoryOverride] || 0).toLocaleString()} | Default: {currencySymbol}
                {budgetLimits.find((b) => b.category === showCategoryOverride)?.default_limit || 0}
              </p>
              <Input
                type="number"
                placeholder="Override limit for this month only"
                value={overrideInput}
                onChange={(e) => setOverrideInput(e.target.value)}
                className="touch-input"
              />
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={() => handleSaveCategoryOverride(showCategoryOverride)}>
                  Save Override
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowCategoryOverride(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        <div
          className={cn(
            "rounded-2xl border p-4 flex justify-between items-center",
            dailyBudgetLeft > (totalBudget / daysInMonth) * 0.8
              ? "bg-green-950/30 border-green-800"
              : dailyBudgetLeft > 0
                ? "bg-yellow-950/30 border-yellow-800"
                : "bg-red-950/30 border-red-800",
          )}
        >
          <div>
            <p className="text-2xl font-bold">
              {currencySymbol}
              {Math.max(0, dailyBudgetLeft).toLocaleString(undefined, { maximumFractionDigits: 0 })}/day
            </p>
            <p className="text-sm text-muted-foreground">remaining budget pace</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">{daysLeft}</p>
            <p className="text-xs text-muted-foreground">days left</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <p className="font-semibold">Upcoming This Month</p>
          {upcomingBills.length === 0 ? (
            <p className="text-sm text-muted-foreground">All bills paid this month ✅</p>
          ) : (
            upcomingBills
              .sort((a, b) => (a.due_day || new Date(a.due_date).getDate()) - (b.due_day || new Date(b.due_date).getDate()))
              .map((bill) => (
                <div key={bill.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[bill.category] }} />
                    <div>
                      <p className="font-medium text-sm">{bill.expense_name}</p>
                      <p className="text-xs text-muted-foreground">Due {bill.due_day}th</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">
                      {currencySymbol}
                      {Number(bill.amount).toLocaleString()}
                    </p>
                    <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => handleMarkFixedPaid(bill)}>
                      Mark Paid
                    </Button>
                  </div>
                </div>
              ))
          )}
        </div>

        {/* Quick Stats */}
        <section>
          <QuickStats
            totalBalance={stats.totalBalance}
            monthlyEarnings={stats.monthlyEarnings}
            monthlyExpenses={stats.monthlyExpenses}
            netSavings={stats.netSavings}
            totalDebt={stats.totalDebt}
          />
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
