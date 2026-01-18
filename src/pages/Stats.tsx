import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

export default function Stats() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [categoryData, setCategoryData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const fetchStats = async () => {
    if (!user) return;

    setIsLoading(true);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    // Fetch expenses by category
    const { data: expenses } = await supabase
      .from("expenses")
      .select("category, amount")
      .eq("user_id", user.id)
      .gte("date_time", startOfMonth)
      .lte("date_time", endOfMonth);

    if (expenses) {
      const categoryTotals = expenses.reduce((acc, exp) => {
        acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount);
        return acc;
      }, {} as Record<string, number>);

      const colors = [
        "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
        "#f43f5e", "#ef4444", "#f97316", "#eab308", "#22c55e"
      ];

      const data = Object.entries(categoryTotals).map(([cat, value], i) => ({
        name: EXPENSE_CATEGORIES.find(c => c.value === cat)?.label || cat,
        value,
        color: colors[i % colors.length],
      }));

      setCategoryData(data);
      setTotalExpenses(expenses.reduce((sum, exp) => sum + Number(exp.amount), 0));
    }

    // Fetch income
    const { data: timesheets } = await supabase
      .from("timesheets")
      .select("hours_worked, hourly_pay")
      .eq("user_id", user.id)
      .gte("work_date", startOfMonth.split("T")[0])
      .lte("work_date", endOfMonth.split("T")[0]);

    if (timesheets) {
      setTotalIncome(
        timesheets.reduce((sum, ts) => sum + Number(ts.hours_worked) * Number(ts.hourly_pay), 0)
      );
    }

    setIsLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

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
        <p className="text-sm text-muted-foreground">This Month</p>
      </header>

      <div className="px-4 py-4 space-y-6">
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
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {categoryData.map((cat, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-sm text-muted-foreground truncate">
                          {cat.name}
                        </span>
                        <span className="text-sm font-medium ml-auto">
                          {formatCurrency(cat.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No expenses this month
                </p>
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
          </>
        )}
      </div>
    </AppLayout>
  );
}
