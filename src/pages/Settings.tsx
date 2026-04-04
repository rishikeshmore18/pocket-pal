import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Plus, Trash2, Pencil, CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

interface BudgetLimitState {
  default_limit: string;
  month_override: string;
}

interface FixedExpense {
  id: string;
  expense_name: string;
  amount: number;
  category: string;
  due_date: string;
  due_day: number;
  is_active: boolean;
}

interface CreditCard {
  id: string;
  card_name: string;
  credit_limit: number;
  billing_day: number;
  due_day: number | null;
  interest_rate: number | null;
  is_zero_apr: boolean;
  zero_apr_end_date: string | null;
  target_utilization: number;
  current_outstanding: number;
}

interface NewFixedExpense {
  name: string;
  amount: string;
  category: string;
  due_date: Date | undefined;
}

interface NewCard {
  card_name: string;
  credit_limit: string;
  billing_day: string;
  due_day: string;
  interest_rate: string;
  is_zero_apr: boolean;
  zero_apr_end_date: string;
  target_utilization: string;
  current_outstanding: string;
}

const createInitialBudgetLimits = (): Record<string, BudgetLimitState> => {
  return EXPENSE_CATEGORIES.reduce((acc, category) => {
    acc[category.value] = { default_limit: "", month_override: "" };
    return acc;
  }, {} as Record<string, BudgetLimitState>);
};

const getDaySuffix = (day: number) => {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
};

const formatAmount = (amount: number, currencySymbol: string) => {
  return `${currencySymbol}${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export default function Settings() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [isLoading, setIsLoading] = useState(true);

  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [currencySymbol, setCurrencySymbol] = useState("$");

  const [budgetLimits, setBudgetLimits] = useState<Record<string, BudgetLimitState>>(createInitialBudgetLimits());

  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [showAddFixed, setShowAddFixed] = useState(false);
  const [newFixed, setNewFixed] = useState<NewFixedExpense>({
    name: "",
    amount: "",
    category: "other",
    due_date: undefined,
  });

  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [newCard, setNewCard] = useState<NewCard>({
    card_name: "",
    credit_limit: "",
    billing_day: "",
    due_day: "",
    interest_rate: "",
    is_zero_apr: false,
    zero_apr_end_date: "",
    target_utilization: "30",
    current_outstanding: "0",
  });

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  const fetchSettingsData = async () => {
    if (!user) return;

    setIsLoading(true);

    const initialBudgetLimits = createInitialBudgetLimits();

    const { data: incomeData, error: incomeError } = await (supabase as any)
      .from("income_settings")
      .select("monthly_income")
      .eq("user_id", user.id)
      .maybeSingle();

    if (incomeError && incomeError.code !== "PGRST116") {
      toast.error("Failed to load income settings");
    }

    if (incomeData?.monthly_income !== undefined && incomeData?.monthly_income !== null) {
      setMonthlyIncome(String(incomeData.monthly_income));
    } else {
      setMonthlyIncome("");
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("currency_symbol")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError && profileError.code !== "PGRST116") {
      toast.error("Failed to load profile settings");
    }

    setCurrencySymbol(profileData?.currency_symbol || "$");

    const { data: budgetData, error: budgetError } = await (supabase as any)
      .from("budget_limits")
      .select("category, default_limit, month_override")
      .eq("user_id", user.id);

    if (budgetError) {
      toast.error("Failed to load budget limits");
    } else {
      (budgetData || []).forEach((row: any) => {
        initialBudgetLimits[row.category] = {
          default_limit: row.default_limit !== null && row.default_limit !== undefined ? String(row.default_limit) : "",
          month_override: row.month_override !== null && row.month_override !== undefined ? String(row.month_override) : "",
        };
      });
      setBudgetLimits(initialBudgetLimits);
    }

    const { data: fixedData, error: fixedError } = await (supabase as any)
      .from("fixed_expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("due_day", { ascending: true });

    if (fixedError) {
      toast.error("Failed to load fixed bills");
    } else {
      setFixedExpenses((fixedData || []) as unknown as FixedExpense[]);
    }

    const { data: cardsData, error: cardsError } = await (supabase as any)
      .from("credit_cards")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (cardsError) {
      toast.error("Failed to load credit cards");
    } else {
      setCreditCards((cardsData || []) as unknown as CreditCard[]);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchSettingsData();
    }
  }, [user]);

  const handleSaveIncome = async () => {
    if (!user) return;

    const incomeValue = parseFloat(monthlyIncome || "0");
    if (Number.isNaN(incomeValue) || incomeValue < 0) {
      toast.error("Please enter a valid monthly income");
      return;
    }

    const { error: incomeError } = await (supabase as any)
      .from("income_settings")
      .upsert(
        {
          user_id: user.id,
          monthly_income: incomeValue,
        },
        { onConflict: "user_id" },
      );

    if (incomeError) {
      toast.error("Failed to save income");
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ currency_symbol: currencySymbol })
      .eq("user_id", user.id);

    if (profileError) {
      toast.error("Failed to update currency symbol");
      return;
    }

    toast.success("Income saved");
  };

  const handleSaveBudgets = async () => {
    if (!user) return;

    const currentMonth = format(new Date(), "yyyy-MM");

    const operations = EXPENSE_CATEGORIES.map((category) => {
      const categoryBudget = budgetLimits[category.value] || { default_limit: "", month_override: "" };
      const hasOverride = !!categoryBudget.month_override;

      return (supabase as any).from("budget_limits").upsert(
        {
          user_id: user.id,
          category: category.value,
          default_limit: parseFloat(categoryBudget.default_limit || "0"),
          month_override: hasOverride ? parseFloat(categoryBudget.month_override) : null,
          override_month: hasOverride ? currentMonth : null,
        },
        { onConflict: "user_id,category" },
      );
    });

    const results = await Promise.all(operations);
    const failed = results.find((result: any) => result.error);

    if (failed?.error) {
      toast.error("Failed to save budgets");
      return;
    }

    toast.success("Budgets saved");
  };

  const handleAddFixed = async () => {
    if (!user) return;

    if (!newFixed.name.trim() || !newFixed.amount || !newFixed.due_date) {
      toast.error("Please fill in all required fields");
      return;
    }

    const amount = parseFloat(newFixed.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const dueDateStr = format(newFixed.due_date, "yyyy-MM-dd");
    const dueDay = newFixed.due_date.getDate();

    const { error } = await (supabase as any).from("fixed_expenses").insert({
      user_id: user.id,
      expense_name: newFixed.name.trim(),
      amount,
      category: newFixed.category,
      due_date: dueDateStr,
      due_day: dueDay,
    });

    if (error) {
      toast.error("Failed to add fixed bill");
      return;
    }

    setNewFixed({
      name: "",
      amount: "",
      category: "other",
      due_date: undefined,
    });
    setShowAddFixed(false);
    toast.success("Fixed bill added");
    fetchSettingsData();
  };

  const deleteFixedExpense = async (id: string) => {
    const { error } = await (supabase as any).from("fixed_expenses").delete().eq("id", id);

    if (error) {
      toast.error("Failed to remove fixed bill");
      return;
    }

    toast.success("Removed");
    fetchSettingsData();
  };

  const handleAddCard = async () => {
    if (!user) return;

    if (!newCard.card_name.trim() || !newCard.credit_limit || !newCard.billing_day) {
      toast.error("Please fill in card name, credit limit, and billing day");
      return;
    }

    const creditLimit = parseFloat(newCard.credit_limit);
    const billingDay = parseInt(newCard.billing_day, 10);

    if (Number.isNaN(creditLimit) || creditLimit <= 0) {
      toast.error("Please enter a valid credit limit");
      return;
    }

    if (Number.isNaN(billingDay) || billingDay < 1 || billingDay > 31) {
      toast.error("Billing day must be between 1 and 31");
      return;
    }

    if (newCard.due_day) {
      const dueDay = parseInt(newCard.due_day, 10);
      if (Number.isNaN(dueDay) || dueDay < 1 || dueDay > 31) {
        toast.error("Due day must be between 1 and 31");
        return;
      }
    }

    const { error } = await (supabase as any).from("credit_cards").insert({
      user_id: user.id,
      card_name: newCard.card_name.trim(),
      credit_limit: creditLimit,
      billing_day: billingDay,
      due_day: newCard.due_day ? parseInt(newCard.due_day, 10) : null,
      interest_rate: newCard.interest_rate ? parseFloat(newCard.interest_rate) : null,
      is_zero_apr: newCard.is_zero_apr,
      zero_apr_end_date: newCard.is_zero_apr && newCard.zero_apr_end_date ? newCard.zero_apr_end_date : null,
      target_utilization: newCard.target_utilization ? parseInt(newCard.target_utilization, 10) : 30,
      current_outstanding: newCard.current_outstanding ? parseFloat(newCard.current_outstanding) : 0,
    });

    if (error) {
      toast.error("Failed to add card");
      return;
    }

    setNewCard({
      card_name: "",
      credit_limit: "",
      billing_day: "",
      due_day: "",
      interest_rate: "",
      is_zero_apr: false,
      zero_apr_end_date: "",
      target_utilization: "30",
      current_outstanding: "0",
    });
    setShowAddCard(false);
    toast.success("Card added");
    fetchSettingsData();
  };

  const deleteCard = async (id: string) => {
    const { error } = await (supabase as any).from("credit_cards").delete().eq("id", id);

    if (error) {
      toast.error("Failed to remove card");
      return;
    }

    toast.success("Card removed");
    fetchSettingsData();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="glass-header px-4 py-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/more")} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-6 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <section>
              <h2 className="text-lg font-semibold mb-4">Monthly Income</h2>
              <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
                <Input
                  type="number"
                  placeholder="Enter monthly take-home"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  className="touch-input"
                />

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Currency Symbol</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setCurrencySymbol("$")}
                      className={cn(
                        "h-10 rounded-lg border-2 text-sm font-medium transition-all",
                        currencySymbol === "$"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-secondary",
                      )}
                    >
                      $
                    </button>
                    <button
                      onClick={() => setCurrencySymbol("\u20B9")}
                      className={cn(
                        "h-10 rounded-lg border-2 text-sm font-medium transition-all",
                        currencySymbol === "\u20B9"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-secondary",
                      )}
                    >
                      {"\u20B9"}
                    </button>
                  </div>
                </div>

                <Button onClick={handleSaveIncome} className="w-full h-12">
                  Save Income
                </Button>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-1">Monthly Budget Limits</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Default resets monthly. Override changes just this month.
              </p>

              <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
                {EXPENSE_CATEGORIES.map((category) => {
                  const Icon = category.icon;
                  const categoryBudget = budgetLimits[category.value] || { default_limit: "", month_override: "" };

                  return (
                    <div key={category.value} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <p className="text-sm font-medium">{category.label}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          placeholder="Default limit"
                          value={categoryBudget.default_limit}
                          onChange={(e) =>
                            setBudgetLimits((prev) => ({
                              ...prev,
                              [category.value]: {
                                ...(prev[category.value] || { default_limit: "", month_override: "" }),
                                default_limit: e.target.value,
                              },
                            }))
                          }
                        />
                        <Input
                          type="number"
                          placeholder="This month only (optional)"
                          value={categoryBudget.month_override}
                          onChange={(e) =>
                            setBudgetLimits((prev) => ({
                              ...prev,
                              [category.value]: {
                                ...(prev[category.value] || { default_limit: "", month_override: "" }),
                                month_override: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>

                      {categoryBudget.month_override ? (
                        <p className="text-xs text-primary">Override active</p>
                      ) : null}
                    </div>
                  );
                })}

                <Button onClick={handleSaveBudgets} className="w-full h-12">
                  Save All Budgets
                </Button>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-1">Fixed Monthly Bills</h2>
              <p className="text-sm text-muted-foreground mb-4">Bills that repeat every month</p>

              <div className="space-y-3">
                {fixedExpenses.map((expense) => (
                  <div key={expense.id} className="bg-card rounded-2xl border border-border p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: CATEGORY_COLORS[expense.category] || CATEGORY_COLORS.other }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{expense.expense_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Due: {expense.due_date ? format(parseISO(expense.due_date), "MMM d, yyyy") : `${expense.due_day}${getDaySuffix(expense.due_day)}`}
                        </p>
                      </div>
                      <p className="font-semibold text-right">{formatAmount(expense.amount, currencySymbol)}</p>
                      <button
                        onClick={() => deleteFixedExpense(expense.id)}
                        className="p-2 text-destructive touch-feedback hover:bg-destructive/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {showAddFixed ? (
                <div className="bg-secondary rounded-xl p-3 space-y-3 mt-3">
                  <Input
                    placeholder="Bill name (e.g. Rent, Netflix)"
                    value={newFixed.name}
                    onChange={(e) => setNewFixed((prev) => ({ ...prev, name: e.target.value }))}
                  />
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={newFixed.amount}
                    onChange={(e) => setNewFixed((prev) => ({ ...prev, amount: e.target.value }))}
                  />

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Category</p>
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                      {EXPENSE_CATEGORIES.map((category) => {
                        const Icon = category.icon;

                        return (
                          <button
                            key={category.value}
                            onClick={() => setNewFixed((prev) => ({ ...prev, category: category.value }))}
                            className={cn(
                              "category-chip touch-feedback",
                              newFixed.category === category.value && "active",
                            )}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{category.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Due Date</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-12",
                            !newFixed.due_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newFixed.due_date ? format(newFixed.due_date, "PPP") : "Pick a due date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={newFixed.due_date}
                          onSelect={(date) => setNewFixed((prev) => ({ ...prev, due_date: date || undefined }))}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Button onClick={handleAddFixed} className="w-full h-12">
                    Add Bill
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddFixed(false)} className="w-full h-12">
                    Cancel
                  </Button>
                </div>
              ) : null}

              <Button variant="outline" onClick={() => setShowAddFixed(!showAddFixed)} className="w-full h-12 mt-3">
                <Plus className="w-5 h-5 mr-2" />
                Add Fixed Bill
              </Button>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-4">Credit Cards</h2>

              <div className="space-y-3">
                {creditCards.map((card) => (
                  <div key={card.id} className="bg-card rounded-2xl border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{card.card_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Billing day: {card.billing_day} &bull; Limit: {formatAmount(card.credit_limit, currencySymbol)}
                        </p>
                        {card.is_zero_apr ? (
                          <span className="inline-flex mt-2 text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">
                            0% APR
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingCardId(card.id);
                            toast.info("Card edit is coming in next phase");
                          }}
                          className="p-2 text-primary touch-feedback hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteCard(card.id)}
                          className="p-2 text-destructive touch-feedback hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {showAddCard ? (
                <div className="bg-secondary rounded-xl p-3 space-y-3 mt-3">
                  <Input
                    placeholder="Card name (e.g. Chase Sapphire)"
                    value={newCard.card_name}
                    onChange={(e) => setNewCard((prev) => ({ ...prev, card_name: e.target.value }))}
                  />
                  <Input
                    type="number"
                    placeholder="Credit limit"
                    value={newCard.credit_limit}
                    onChange={(e) => setNewCard((prev) => ({ ...prev, credit_limit: e.target.value }))}
                  />
                  <Input
                    type="number"
                    placeholder="Billing date (day of month, e.g. 15)"
                    value={newCard.billing_day}
                    min={1}
                    max={31}
                    onChange={(e) => setNewCard((prev) => ({ ...prev, billing_day: e.target.value }))}
                  />
                  <Input
                    type="number"
                    placeholder="Payment due date (optional)"
                    value={newCard.due_day}
                    min={1}
                    max={31}
                    onChange={(e) => setNewCard((prev) => ({ ...prev, due_day: e.target.value }))}
                  />
                  <Input
                    type="number"
                    placeholder="Interest rate % (e.g. 42)"
                    value={newCard.interest_rate}
                    onChange={(e) => setNewCard((prev) => ({ ...prev, interest_rate: e.target.value }))}
                  />

                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">0% APR intro period?</p>
                    <button
                      onClick={() => setNewCard((prev) => ({ ...prev, is_zero_apr: !prev.is_zero_apr }))}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors",
                        newCard.is_zero_apr ? "bg-primary" : "bg-secondary border border-border",
                      )}
                    >
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full bg-background transition-transform m-0.5",
                          newCard.is_zero_apr ? "translate-x-6" : "translate-x-0",
                        )}
                      />
                    </button>
                  </div>

                  {newCard.is_zero_apr ? (
                    <>
                      <Input
                        type="date"
                        placeholder="APR end date"
                        value={newCard.zero_apr_end_date}
                        onChange={(e) => setNewCard((prev) => ({ ...prev, zero_apr_end_date: e.target.value }))}
                      />
                      <Input
                        type="number"
                        placeholder="Target utilization % (default 30)"
                        value={newCard.target_utilization}
                        onChange={(e) => setNewCard((prev) => ({ ...prev, target_utilization: e.target.value }))}
                      />
                    </>
                  ) : null}

                  <Input
                    type="number"
                    placeholder="Current outstanding balance (default 0)"
                    value={newCard.current_outstanding}
                    onChange={(e) => setNewCard((prev) => ({ ...prev, current_outstanding: e.target.value }))}
                  />

                  <Button onClick={handleAddCard} className="w-full h-12">
                    Add Card
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddCard(false)} className="w-full h-12">
                    Cancel
                  </Button>
                </div>
              ) : null}

              <Button variant="outline" onClick={() => setShowAddCard(!showAddCard)} className="w-full h-12 mt-3">
                <Plus className="w-5 h-5 mr-2" />
                Add Credit Card
              </Button>

              {editingCardId ? <p className="text-xs text-muted-foreground mt-2">Editing state set for card.</p> : null}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
