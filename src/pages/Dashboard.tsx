import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { QuickStats } from "@/components/dashboard/QuickStats";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { FAB } from "@/components/expense/FAB";
import { AddExpenseSheet } from "@/components/expense/AddExpenseSheet";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface DashboardData {
  totalBalance: number;
  monthlyEarnings: number;
  monthlyExpenses: number;
  netSavings: number;
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
  });
  const [profile, setProfile] = useState<{ name: string } | null>(null);

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

    // Get current month date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    // Fetch monthly expenses
    const { data: monthlyExpenses } = await supabase
      .from("expenses")
      .select("amount")
      .eq("user_id", user.id)
      .gte("date_time", startOfMonth)
      .lte("date_time", endOfMonth);

    const totalMonthlyExpenses = monthlyExpenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;

    // Fetch monthly earnings from timesheets
    const { data: monthlyTimesheets } = await supabase
      .from("timesheets")
      .select("hours_worked, hourly_pay")
      .eq("user_id", user.id)
      .gte("work_date", startOfMonth.split("T")[0])
      .lte("work_date", endOfMonth.split("T")[0]);

    const totalMonthlyEarnings = monthlyTimesheets?.reduce(
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
      monthlyEarnings: totalMonthlyEarnings,
      monthlyExpenses: totalMonthlyExpenses,
      netSavings: totalMonthlyEarnings - totalMonthlyExpenses,
    });
    setIsLoading(false);
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
        {/* Quick Stats */}
        <section>
          <QuickStats
            totalBalance={stats.totalBalance}
            monthlyEarnings={stats.monthlyEarnings}
            monthlyExpenses={stats.monthlyExpenses}
            netSavings={stats.netSavings}
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
