import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Filter, Plus, Trash2, Pencil } from "lucide-react";
import { formatDistanceToNow, format, addMonths, subMonths, parseISO, startOfMonth, endOfMonth, isToday, isYesterday } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { FAB } from "@/components/expense/FAB";
import { AddExpenseSheet } from "@/components/expense/AddExpenseSheet";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
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
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [filterMonth, setFilterMonth] = useState(format(new Date(), "yyyy-MM"));
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPaymentMethod, setFilterPaymentMethod] = useState("all");
  const [filterCardId, setFilterCardId] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [creditCards, setCreditCards] = useState<any[]>([]);
  const [monthComparison, setMonthComparison] = useState<Array<{
    month: string, label: string, total: number, byCategory: Record<string, number>
  }>>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const fetchExpenses = async () => {
    if (!user) return;

    setIsLoading(true);

    const monthStart = startOfMonth(parseISO(filterMonth + "-01")).toISOString();
    const monthEnd = endOfMonth(parseISO(filterMonth + "-01")).toISOString();

    let query = supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .gte("date_time", monthStart)
      .lte("date_time", monthEnd)
      .order("date_time", { ascending: false });

    if (filterCategory !== "all") query = query.eq("category", filterCategory as any);
    if (filterPaymentMethod !== "all") query = query.eq("payment_method", filterPaymentMethod as any);

    const { data, error } = await query;

    const { data: cards } = await (supabase as any)
      .from("credit_cards")
      .select("id, card_name")
      .eq("user_id", user.id);
    setCreditCards(cards || []);

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
      fetchMonthComparison();
    }
  }, [user, filterMonth, filterCategory, filterPaymentMethod, filterCardId, filterType]);

  const fetchMonthComparison = async () => {
    if (!user) return;
    const months = [0, 1, 2].map((offset) => {
      const d = subMonths(new Date(), offset);
      return {
        month: format(d, "yyyy-MM"),
        label: format(d, "MMM"),
        start: startOfMonth(d).toISOString(),
        end: endOfMonth(d).toISOString()
      };
    });

    const results = await Promise.all(months.map(async (m) => {
      const { data } = await supabase
        .from("expenses")
        .select("amount, category")
        .eq("user_id", user.id)
        .gte("date_time", m.start).lte("date_time", m.end);

      const byCategory: Record<string, number> = {};
      let total = 0;
      data?.forEach((e) => {
        byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount);
        total += Number(e.amount);
      });
      return { month: m.month, label: m.label, total, byCategory };
    }));

    setMonthComparison(results);
  };

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

  const activeFilterCount = [
    filterCategory !== "all",
    filterPaymentMethod !== "all",
    filterCardId !== "all",
    filterType !== "all"
  ].filter(Boolean).length;

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
          <div>
            <h1 className="text-xl font-bold">Expenses</h1>
            <p className="text-sm text-muted-foreground">{format(parseISO(filterMonth + "-01"), "MMMM yyyy")}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters((f) => !f)}
              className="relative p-2 touch-feedback w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
            >
              <Filter className="w-5 h-5" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-[10px] font-bold text-white flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
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

      {showFilters && (
        <div className="px-4 pb-2 space-y-3 animate-fade-in">
          <div className="bg-card rounded-2xl border border-border p-4 space-y-4">

            {/* Month navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setFilterMonth(format(subMonths(parseISO(filterMonth + "-01"), 1), "yyyy-MM"))}
                className="p-2 rounded-lg bg-secondary touch-feedback"
              >
                ←
              </button>
              <p className="font-semibold">{format(parseISO(filterMonth + "-01"), "MMMM yyyy")}</p>
              <button
                onClick={() => setFilterMonth(format(addMonths(parseISO(filterMonth + "-01"), 1), "yyyy-MM"))}
                className="p-2 rounded-lg bg-secondary touch-feedback"
                disabled={filterMonth >= format(new Date(), "yyyy-MM")}
              >
                →
              </button>
            </div>

            {/* Category filter */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Category</p>
              <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
                {[{ value: "all", label: "All" }, ...EXPENSE_CATEGORIES].map((cat) => (
                  <button key={cat.value}
                    onClick={() => setFilterCategory(cat.value)}
                    className={cn("category-chip touch-feedback whitespace-nowrap",
                      filterCategory === cat.value && "active")}>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment method filter */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Payment Method</p>
              <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
                {[{ value: "all", label: "All" }, { value: "credit", label: "Credit" },
                  { value: "debit", label: "Debit" }, { value: "cash", label: "Cash" },
                  { value: "bank_transfer", label: "Bank Transfer" }, { value: "other", label: "Other" }
                ].map((m) => (
                  <button key={m.value}
                    onClick={() => { setFilterPaymentMethod(m.value); if (m.value !== "credit") setFilterCardId("all"); }}
                    className={cn("category-chip touch-feedback whitespace-nowrap",
                      filterPaymentMethod === m.value && "active")}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Card filter — only when credit is selected */}
            {filterPaymentMethod === "credit" && creditCards.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Card</p>
                <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
                  {[{ id: "all", card_name: "All Cards" }, ...creditCards].map((card) => (
                    <button key={card.id}
                      onClick={() => setFilterCardId(card.id)}
                      className={cn("category-chip touch-feedback whitespace-nowrap",
                        filterCardId === card.id && "active")}>
                      {card.card_name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Type filter */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Type</p>
              <div className="flex gap-2">
                {[{ value: "all", label: "All" }, { value: "fixed", label: "Fixed" }, { value: "variable", label: "Variable" }]
                  .map((t) => (
                    <button key={t.value}
                      onClick={() => setFilterType(t.value)}
                      className={cn("category-chip touch-feedback",
                        filterType === t.value && "active")}>
                      {t.label}
                    </button>
                  ))}
              </div>
            </div>

            {/* Clear filters */}
            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  setFilterCategory("all"); setFilterPaymentMethod("all");
                  setFilterCardId("all"); setFilterType("all");
                }}
                className="text-xs text-destructive">
                Clear all filters
              </button>
            )}
          </div>
        </div>
      )}

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
                            onClick={() => {
                              setEditingExpense(expense);
                              setShowAddExpense(true);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-2 text-primary touch-feedback"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
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

      {monthComparison.length > 0 && (
        <div className="px-4 pb-4">
          <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
            <p className="font-semibold">Month Comparison</p>

            {/* Bar chart */}
            <div className="flex items-end justify-around gap-4 h-32">
              {[...monthComparison].reverse().map((m) => {
                const maxTotal = Math.max(...monthComparison.map((x) => x.total), 1);
                const barHeight = Math.max((m.total / maxTotal) * 112, 4);
                const isCurrentMonth = m.month === format(new Date(), "yyyy-MM");
                return (
                  <div key={m.month} className="flex flex-col items-center gap-1 flex-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      {formatCurrency(m.total)}
                    </p>
                    <div
                      className={cn("w-full rounded-t-lg transition-all",
                        isCurrentMonth ? "bg-primary" : "bg-primary/40")}
                      style={{ height: `${barHeight}px` }}
                    />
                    <p className={cn("text-xs font-medium", isCurrentMonth && "text-primary")}>
                      {m.label}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Category deltas (current vs last month) */}
            {monthComparison.length >= 2 && (() => {
              const current = monthComparison[0].byCategory;
              const last = monthComparison[1].byCategory;
              const allCats = new Set([...Object.keys(current), ...Object.keys(last)]);
              const deltas = Array.from(allCats)
                .map((cat) => ({
                  cat,
                  label: EXPENSE_CATEGORIES.find((c) => c.value === cat)?.label || cat,
                  delta: (current[cat] || 0) - (last[cat] || 0)
                }))
                .filter((d) => d.delta !== 0)
                .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
                .slice(0, 5);

              if (deltas.length === 0) return (
                <p className="text-xs text-muted-foreground">Same spending as last month</p>
              );

              return (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground font-medium">vs last month</p>
                  {deltas.map((d) => (
                    <div key={d.cat} className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{d.label}</span>
                      <span className={cn("font-medium", d.delta > 0 ? "text-red-400" : "text-green-400")}>
                        {d.delta > 0 ? "▲" : "▼"} {formatCurrency(Math.abs(d.delta))}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

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

      {/* Add/Edit Expense Sheet */}
      <AddExpenseSheet
        isOpen={showAddExpense}
        onClose={() => {
          setShowAddExpense(false);
          setEditingExpense(null);
        }}
        onSuccess={fetchExpenses}
        editingExpense={editingExpense}
      />
    </AppLayout>
  );
}
