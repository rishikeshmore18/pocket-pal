import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";
import { getDaysInMonth, getDate, format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { QuickStats } from "@/components/dashboard/QuickStats";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { FAB } from "@/components/expense/FAB";
import { AddExpenseSheet } from "@/components/expense/AddExpenseSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getCardPaymentObligation } from "@/lib/cardUtils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DashboardData {
  totalBalance: number;
  monthlyEarnings: number;
  monthlyExpenses: number;
  netSavings: number;
  totalDebt: number;
}

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
  const [paySchedule, setPaySchedule] = useState<any>(null);
  const [upcomingPaydays, setUpcomingPaydays] = useState<Date[]>([]);
  const [creditCards, setCreditCards] = useState<any[]>([]);
  const [cardPaymentSchedules, setCardPaymentSchedules] = useState<any[]>([]);
  const [editingCardPayment, setEditingCardPayment] = useState<string | null>(null);
  const [editingPaymentAmount, setEditingPaymentAmount] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const calculateUpcomingPaydays = (schedule: any): Date[] => {
    if (!schedule) return [];

    const today = new Date();
    const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfThisMonth = endOfMonth(today);
    const paydays: Date[] = [];

    if (schedule.pay_frequency === "weekly") {
      const targetDay =
        schedule.pay_day_of_week === 0 || schedule.pay_day_of_week
          ? Number(schedule.pay_day_of_week)
          : 4;

      let current = new Date(startToday);
      while (current <= endOfThisMonth) {
        if (current.getDay() === targetDay) {
          paydays.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
      }

      if (schedule.last_pay_date) {
        const anchor = parseISO(schedule.last_pay_date);
        const normalizedAnchor = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
        if (
          normalizedAnchor >= startToday &&
          normalizedAnchor <= endOfThisMonth &&
          !paydays.find((d) => d.getTime() === normalizedAnchor.getTime())
        ) {
          paydays.push(normalizedAnchor);
        }
      }
    } else if (schedule.pay_frequency === "monthly" && schedule.pay_day_of_month) {
      const payDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        Math.min(Number(schedule.pay_day_of_month), getDaysInMonth(today)),
      );
      if (payDate >= startToday && payDate <= endOfThisMonth) {
        paydays.push(payDate);
      }
    }

    return paydays.sort((a, b) => a.getTime() - b.getTime());
  };

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

    // Fetch credit cards for liabilities + payment planning
    const { data: cards } = await (supabase as any)
      .from("credit_cards")
      .select("*")
      .eq("user_id", user.id);
    const creditCardsData = cards || [];
    setCreditCards(creditCardsData);
    const totalCardOutstanding = creditCardsData.reduce(
      (sum: number, card: any) => sum + Number(card.current_outstanding || 0),
      0,
    );

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
      totalDebt: totalDebt + totalCardOutstanding,
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

    // Fetch pay schedule
    const { data: payData } = await (supabase as any)
      .from("pay_schedule")
      .select("*")
      .eq("user_id", user.id)
      .single();
    setPaySchedule(payData || null);

    if (payData) {
      setUpcomingPaydays(calculateUpcomingPaydays(payData));
    } else {
      setUpcomingPaydays([]);
    }

    // Fetch card payment schedules for current month
    const { data: cardSchedules } = await (supabase as any)
      .from("card_payment_schedule")
      .select("*")
      .eq("user_id", user.id);
    setCardPaymentSchedules(cardSchedules || []);

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

  const getFixedDueDay = (fixed: any) => {
    if (fixed?.due_day) return Number(fixed.due_day);
    if (fixed?.due_date) return parseISO(fixed.due_date).getDate();
    return 31;
  };

  const getMonthlyProjectedPay = (): number => {
    if (!paySchedule?.pay_amount) return 0;

    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    if (paySchedule.pay_frequency === "weekly") {
      const targetDay =
        paySchedule.pay_day_of_week === 0 || paySchedule.pay_day_of_week
          ? Number(paySchedule.pay_day_of_week)
          : 4;

      let count = 0;
      const cursor = new Date(monthStart);

      while (cursor <= monthEnd) {
        if (cursor.getDay() === targetDay) {
          count += 1;
        }
        cursor.setDate(cursor.getDate() + 1);
      }

      return count * Number(paySchedule.pay_amount);
    }

    return Number(paySchedule.pay_amount || 0);
  };

  const getCardScheduledPaymentAmount = (card: any) => {
    const currentMonth = format(new Date(), "yyyy-MM");
    const schedule = cardPaymentSchedules.find((s) => s.card_id === card.id);
    const defaultAmount = getCardPaymentObligation(card);

    if (schedule?.override_month === currentMonth && schedule?.custom_amount !== null && schedule?.custom_amount !== undefined) {
      return Number(schedule.custom_amount);
    }

    return defaultAmount;
  };

  const getSmartPaymentPlan = () => {
    if (upcomingPaydays.length === 0 || creditCards.length === 0) return [];

    const plan: Array<{
      payday: Date;
      paydayLabel: string;
      totalPay: number;
      recommendations: Array<{
        card: any;
        amount: number;
        reason: string;
        urgency: "high" | "medium" | "low";
      }>;
    }> = [];

    upcomingPaydays.forEach((payday, index) => {
      const paydayLabel = format(payday, "EEE, MMM d");
      const payAmount = Number(paySchedule?.pay_amount || 0);
      const recommendations: Array<{
        card: any;
        amount: number;
        reason: string;
        urgency: "high" | "medium" | "low";
      }> = [];

      creditCards.forEach((card) => {
        if (Number(card.current_outstanding) === 0) return;

        const obligation = getCardScheduledPaymentAmount(card);
        if (obligation === 0) return;

        const dueDay = card.due_day || 28;
        const dueDate = new Date(payday.getFullYear(), payday.getMonth(), dueDay);
        const daysUntilDue = Math.ceil((dueDate.getTime() - payday.getTime()) / (1000 * 60 * 60 * 24));

        const isNextPaydayCloser =
          index < upcomingPaydays.length - 1 &&
          Math.abs(upcomingPaydays[index + 1].getTime() - dueDate.getTime()) <
            Math.abs(payday.getTime() - dueDate.getTime());

        if (daysUntilDue >= 0 && daysUntilDue <= 10 && !isNextPaydayCloser) {
          let urgency: "high" | "medium" | "low" = "low";
          let reason = "";

          if (daysUntilDue <= 3) {
            urgency = "high";
            reason = `Due in ${daysUntilDue} days`;
          } else if (daysUntilDue <= 7) {
            urgency = "medium";
            reason = `Due ${format(dueDate, "MMM d")}`;
          } else {
            urgency = "low";
            reason = `Due ${format(dueDate, "MMM d")}`;
          }

          if (card.is_zero_apr && !card.minimum_payment_mode) {
            reason += ` · Pay ${currencySymbol}${obligation.toFixed(0)} to stay at ${card.target_utilization}% utilization`;
          } else if (card.minimum_payment_mode) {
            reason += " · Minimum payment only";
          }

          recommendations.push({ card, amount: obligation, reason, urgency });
        }
      });

      recommendations.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.urgency] - order[b.urgency];
      });

      plan.push({ payday, paydayLabel, totalPay: payAmount, recommendations });
    });

    return plan.filter((p) => p.recommendations.length > 0 || upcomingPaydays.indexOf(p.payday) === 0);
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
  const totalCardObligation = creditCards.reduce((sum, card) => sum + getCardScheduledPaymentAmount(card), 0);
  const effectiveMonthlySpend = stats.monthlyExpenses + totalCardObligation;
  const burnRate = daysElapsed > 0 ? effectiveMonthlySpend / daysElapsed : 0;
  const projectedMonthEnd = burnRate * daysInMonth;
  const projectedFinal = Math.max(
    projectedMonthEnd,
    effectiveMonthlySpend +
      fixedExpensesList
        .filter((f) => !paidFixedNames.has(f.expense_name) && getFixedDueDay(f) > getDate(now))
        .reduce((s, f) => s + Number(f.amount), 0),
  );
  const predictedSavings = monthlyIncome - projectedFinal;
  const dailyBudgetLeft = daysLeft > 0 ? (totalBudget - effectiveMonthlySpend) / daysLeft : 0;
  const categorySpendForBar = { ...categorySpend };
  if (totalCardObligation > 0) {
    categorySpendForBar.credit_card = (categorySpendForBar.credit_card || 0) + totalCardObligation;
  }
  const currentMonth = format(new Date(), "yyyy-MM");

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

  const handleSaveCardPaymentEdit = async (cardId: string, newAmount: number, dueDay: number) => {
    if (!user) return;
    if (Number.isNaN(newAmount) || newAmount < 0) {
      toast.error("Enter a valid amount");
      return;
    }

    await (supabase as any).from("card_payment_schedule").upsert(
      {
        user_id: user.id,
        card_id: cardId,
        due_day: dueDay,
        custom_amount: newAmount,
        override_month: currentMonth,
      },
      { onConflict: "user_id,card_id" },
    );
    toast.success("Payment amount updated");
    setEditingCardPayment(null);
    setEditingPaymentAmount("");
    fetchDashboardData();
  };

  const handleMarkFixedPaid = async (fixed: any) => {
    if (!user) return;
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

  const handleMarkCardPaymentPaid = async (card: any, amount: number) => {
    if (!user) return;

    await (supabase as any).from("expenses").insert({
      user_id: user.id,
      expense_name: `${card.card_name} Payment`,
      category: "credit_card",
      amount,
      payment_method: "bank_transfer",
      is_fixed: true,
      date_time: new Date().toISOString(),
    });

    const newOutstanding = Math.max(0, Number(card.current_outstanding) - amount);
    await (supabase as any)
      .from("credit_cards")
      .update({ current_outstanding: newOutstanding })
      .eq("id", card.id);

    await (supabase as any)
      .from("card_payment_schedule")
      .update({ is_paid: true, paid_date: format(new Date(), "yyyy-MM-dd") })
      .eq("user_id", user.id)
      .eq("card_id", card.id);

    toast.success(`${card.card_name} payment logged`);
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
                ? `On Track - Saving ${Math.abs(predictedSavings).toLocaleString()}`
                : `Overspending - Over by ${Math.abs(predictedSavings).toLocaleString()}`}
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
              {totalBudget > 0 ? `${Math.round((effectiveMonthlySpend / totalBudget) * 100)}% used` : "No budget set"}
            </p>
          </div>

          {totalBudget === 0 ? (
            <button onClick={() => navigate("/settings")} className="text-sm text-primary">
              Set budget limits in Settings -&gt;
            </button>
          ) : (
            <>
              <div className="w-full h-4 rounded-full overflow-hidden flex bg-muted">
                {Object.entries(categorySpendForBar).map(([cat, amount]) => (
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
                {Object.entries(categorySpendForBar).map(([cat, amount]) => {
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
                      {hasOverride && <span>edited</span>}
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
                {(categorySpendForBar[showCategoryOverride] || 0).toLocaleString()} | Default: {currencySymbol}
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

        {paySchedule ? (
          <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
            <div className="flex justify-between items-center">
              <p className="font-semibold">Paycheck Schedule</p>
              <button onClick={() => navigate("/settings")} className="text-xs text-primary">
                Edit -&gt;
              </button>
            </div>

            {paySchedule.pay_amount && (
              <div className="flex justify-between items-center py-2 border-b border-border">
                <div>
                  <p className="text-sm text-muted-foreground">Projected this month</p>
                  <p className="text-lg font-bold text-green-400">
                    {currencySymbol}
                    {getMonthlyProjectedPay().toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Per paycheck</p>
                  <p className="font-semibold">
                    {currencySymbol}
                    {Number(paySchedule.pay_amount).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {upcomingPaydays.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium">Upcoming paydays this month</p>
                {upcomingPaydays.map((payday, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <p className="text-sm font-medium">{format(payday, "EEEE, MMM d")}</p>
                    </div>
                    {paySchedule.pay_amount && (
                      <p className="text-sm text-green-400 font-medium">
                        +{currencySymbol}
                        {Number(paySchedule.pay_amount).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No more paydays this month</p>
            )}

            {(() => {
              const plan = getSmartPaymentPlan();
              if (plan.length === 0) return null;
              const hasRecommendations = plan.some((p) => p.recommendations.length > 0);
              if (!hasRecommendations) return null;

              return (
                <div className="space-y-3 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground font-medium">Smart payment plan</p>
                  {plan.map((p, i) => {
                    if (p.recommendations.length === 0) return null;
                    const totalToPay = p.recommendations.reduce((s, r) => s + r.amount, 0);
                    return (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-semibold text-green-400">{p.paydayLabel}</p>
                          <p className="text-xs text-muted-foreground">
                            Pay: {currencySymbol}
                            {totalToPay.toFixed(0)} of{" "}
                            {paySchedule.pay_amount
                              ? `${currencySymbol}${Number(paySchedule.pay_amount).toLocaleString()} paycheck`
                              : "your paycheck"}
                          </p>
                        </div>
                        {p.recommendations.map((rec, j) => (
                          <div
                            key={j}
                            className={cn(
                              "flex justify-between items-start rounded-xl p-2.5",
                              rec.urgency === "high"
                                ? "bg-red-950/30 border border-red-800"
                                : rec.urgency === "medium"
                                  ? "bg-yellow-950/30 border border-yellow-800"
                                  : "bg-secondary",
                            )}
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium">{rec.card.card_name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{rec.reason}</p>
                            </div>
                            <p
                              className={cn(
                                "text-sm font-bold ml-3",
                                rec.urgency === "high"
                                  ? "text-red-400"
                                  : rec.urgency === "medium"
                                    ? "text-yellow-400"
                                    : "text-foreground",
                              )}
                            >
                              {currencySymbol}
                              {rec.amount.toFixed(0)}
                            </p>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        ) : (
          <button
            onClick={() => navigate("/settings")}
            className="w-full bg-card rounded-2xl border border-border border-dashed p-4 text-sm text-muted-foreground text-center touch-feedback"
          >
            + Set up your pay schedule to see smart payment timing
          </button>
        )}

        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <p className="font-semibold">Upcoming This Month</p>
          {upcomingBills.length === 0 &&
          creditCards.filter((c) => Number(c.current_outstanding) > 0).length === 0 ? (
            <p className="text-sm text-muted-foreground">All bills paid this month</p>
          ) : (
            <>
              {upcomingBills
                .sort((a, b) => getFixedDueDay(a) - getFixedDueDay(b))
                .map((bill) => (
                <div key={bill.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[bill.category] }} />
                    <div>
                      <p className="font-medium text-sm">{bill.expense_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Due {bill.due_date ? format(new Date(bill.due_date), "MMM d") : `${getFixedDueDay(bill)}th`}
                      </p>
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
                ))}

              {creditCards
                .filter((card) => Number(card.current_outstanding) > 0 && card.due_day)
                .sort((a, b) => (a.due_day || 28) - (b.due_day || 28))
                .map((card) => {
                  const schedule = cardPaymentSchedules.find((s) => s.card_id === card.id);
                  const defaultAmount = getCardPaymentObligation(card);
                  const displayAmount =
                    schedule?.override_month === currentMonth && schedule?.custom_amount !== null && schedule?.custom_amount !== undefined
                      ? Number(schedule.custom_amount)
                      : defaultAmount;
                  const dueDate = card.due_day;
                  const isEditing = editingCardPayment === card.id;

                  let badge = null;
                  if (card.minimum_payment_mode) {
                    badge = (
                      <span className="text-[10px] bg-orange-900/40 text-orange-400 border border-orange-700 rounded-full px-1.5 py-0.5">
                        Min Pay
                      </span>
                    );
                  } else if (card.is_zero_apr) {
                    badge = (
                      <span className="text-[10px] bg-green-900/40 text-green-400 border border-green-700 rounded-full px-1.5 py-0.5">
                        Strategy
                      </span>
                    );
                  }

                  const today = new Date();
                  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                  const dueDateThisMonth = new Date(today.getFullYear(), today.getMonth(), dueDate);
                  const isPastDue = dueDateThisMonth < todayDateOnly;

                  return (
                    <div key={card.id} className={cn("py-2 border-b border-border last:border-0", isPastDue && "opacity-60")}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-3 h-3 rounded-full flex-shrink-0 bg-purple-500" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-medium text-sm">{card.card_name}</p>
                              {badge}
                              {schedule?.override_month === currentMonth && schedule?.custom_amount ? (
                                <span className="text-[10px] text-primary">edited</span>
                              ) : null}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Due {dueDate}
                              {dueDate === 1 ? "st" : dueDate === 2 ? "nd" : dueDate === 3 ? "rd" : "th"}
                              {isPastDue ? " · Past due" : ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-2">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                value={editingPaymentAmount}
                                onChange={(e) => setEditingPaymentAmount(e.target.value)}
                                className="w-24 h-8 text-sm text-right"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveCardPaymentEdit(card.id, parseFloat(editingPaymentAmount), card.due_day)}
                                className="p-1.5 text-green-400 touch-feedback"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCardPayment(null);
                                  setEditingPaymentAmount("");
                                }}
                                className="p-1.5 text-muted-foreground touch-feedback"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="text-right">
                                <p className="font-semibold text-sm">
                                  {currencySymbol}
                                  {displayAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </p>
                                {defaultAmount !== displayAmount ? (
                                  <p className="text-[10px] text-muted-foreground line-through">
                                    {currencySymbol}
                                    {defaultAmount.toFixed(0)}
                                  </p>
                                ) : null}
                              </div>
                              <button
                                onClick={() => {
                                  setEditingCardPayment(card.id);
                                  setEditingPaymentAmount(displayAmount.toString());
                                }}
                                className="p-1.5 text-primary touch-feedback opacity-70 hover:opacity-100"
                                title="Edit payment amount"
                              >
                                Edit
                              </button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs px-2"
                                onClick={() => handleMarkCardPaymentPaid(card, displayAmount)}
                              >
                                Pay
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </>
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
