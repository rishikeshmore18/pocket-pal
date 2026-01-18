import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Filter, Plus, Trash2 } from "lucide-react";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { FAB } from "@/components/expense/FAB";
import { AddExpenseSheet } from "@/components/expense/AddExpenseSheet";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { toast } from "sonner";

interface Expense {
  id: string;
  expense_name: string;
  category: string;
  amount: number;
  date_time: string;
  payment_method: string;
  notes: string | null;
}

export default function Expenses() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const fetchExpenses = async () => {
    if (!user) return;

    setIsLoading(true);
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("date_time", { ascending: false });

    if (error) {
      toast.error("Failed to load expenses");
      console.error(error);
    } else {
      setExpenses(data || []);
      setTotalExpenses(data?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchExpenses();
    }
  }, [user]);

  const deleteExpense = async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete expense");
    } else {
      toast.success("Expense deleted");
      fetchExpenses();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getCategoryIcon = (category: string) => {
    const cat = EXPENSE_CATEGORIES.find((c) => c.value === category);
    return cat?.icon;
  };

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMM d, yyyy");
  };

  // Group expenses by date
  const groupedExpenses = expenses.reduce((groups, expense) => {
    const dateKey = format(new Date(expense.date_time), "yyyy-MM-dd");
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(expense);
    return groups;
  }, {} as Record<string, Expense[]>);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <header className="glass-header px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Expenses</h1>
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center touch-feedback">
              <Filter className="w-5 h-5 text-muted-foreground" />
            </button>
            <button 
              onClick={() => setShowAddExpense(true)}
              className="w-10 h-10 rounded-full bg-primary flex items-center justify-center touch-feedback"
            >
              <Plus className="w-5 h-5 text-primary-foreground" />
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 py-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-24 mb-3" />
                <div className="expense-item">
                  <div className="w-10 h-10 rounded-xl bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-secondary mx-auto mb-4 flex items-center justify-center">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No expenses yet</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Tap + to add your first expense
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedExpenses).map(([date, dayExpenses]) => (
              <div key={date}>
                <h3 className="text-sm text-muted-foreground mb-3">
                  {formatDateHeader(dayExpenses[0].date_time)}
                </h3>
                <div className="space-y-3">
                  {dayExpenses.map((expense) => {
                    const Icon = getCategoryIcon(expense.category);
                    return (
                      <div key={expense.id} className="expense-item group">
                        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                          {Icon && <Icon className="w-5 h-5 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{expense.expense_name}</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {expense.category.replace("_", " ")} • {expense.payment_method}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-destructive">
                            -{formatCurrency(Number(expense.amount))}
                          </span>
                          <button
                            onClick={() => deleteExpense(expense.id)}
                            className="opacity-0 group-hover:opacity-100 p-2 text-destructive touch-feedback"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Total Summary */}
      {expenses.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 px-4 py-3 bg-card/80 backdrop-blur-xl border-t border-border">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <span className="text-muted-foreground">Total Expenses</span>
            <span className="text-xl font-bold text-destructive">
              {formatCurrency(totalExpenses)}
            </span>
          </div>
        </div>
      )}

      {/* FAB */}
      <FAB onClick={() => setShowAddExpense(true)} />

      {/* Add Expense Sheet */}
      <AddExpenseSheet
        isOpen={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        onSuccess={fetchExpenses}
      />
    </AppLayout>
  );
}
