import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, CreditCard, Trash2, Minus, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DEBT_TYPES } from "@/lib/constants";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Debt {
  id: string;
  debt_type: string;
  debt_name: string;
  current_amount: number;
}

export default function Debts() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState<string>("");
  const [isUpdatingAmount, setIsUpdatingAmount] = useState(false);

  // Form state
  const [debtName, setDebtName] = useState("");
  const [debtType, setDebtType] = useState<string>("credit_card");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const fetchDebts = async () => {
    if (!user) return;

    setIsLoading(true);

    const { data, error } = await supabase
      .from("debts")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to load debts");
    } else {
      setDebts(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchDebts();
    }
  }, [user]);

  const handleAddDebt = async () => {
    if (!user) return;

    if (!debtName.trim() || !amount) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from("debts").insert({
      user_id: user.id,
      debt_name: debtName.trim(),
      debt_type: debtType as any,
      current_amount: parseFloat(amount),
    });

    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to add debt");
    } else {
      toast.success("Debt added");
      setDebtName("");
      setAmount("");
      setShowAdd(false);
      fetchDebts();
    }
  };

  const updateDebtAmount = async (id: string, change: number) => {
    const debt = debts.find((d) => d.id === id);
    if (!debt) return;

    const newAmount = Math.max(0, Number(debt.current_amount) + change);

    const { error } = await supabase
      .from("debts")
      .update({ current_amount: newAmount })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update");
    } else {
      fetchDebts();
    }
  };

  const deleteDebt = async (id: string) => {
    const { error } = await supabase.from("debts").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Debt deleted");
      fetchDebts();
    }
  };

  const handleEditAmount = (debt: Debt) => {
    setEditingDebtId(debt.id);
    setEditingAmount(debt.current_amount.toString());
  };

  const handleCancelEdit = () => {
    setEditingDebtId(null);
    setEditingAmount("");
  };

  const handleUpdateAmount = async (debtId: string) => {
    if (!editingAmount || isNaN(parseFloat(editingAmount)) || parseFloat(editingAmount) < 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsUpdatingAmount(true);

    const { error } = await supabase
      .from("debts")
      .update({ current_amount: parseFloat(editingAmount) })
      .eq("id", debtId);

    setIsUpdatingAmount(false);

    if (error) {
      toast.error("Failed to update amount");
      console.error(error);
    } else {
      toast.success("Amount updated");
      setEditingDebtId(null);
      setEditingAmount("");
      fetchDebts();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const totalDebt = debts.reduce((sum, d) => sum + Number(d.current_amount), 0);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="glass-header px-4 py-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/more")} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">Debts</h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-6">
        {/* Total Debt */}
        <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6 text-center">
          <p className="text-sm text-destructive mb-1">Total Debt</p>
          <p className="text-3xl font-bold text-destructive">{formatCurrency(totalDebt)}</p>
        </div>

        {/* Debts List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : debts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-secondary mx-auto mb-4 flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No debts tracked</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Tap + to add a debt
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {debts.map((debt) => (
              <div key={debt.id} className="bg-card rounded-2xl border border-border p-4 group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <p className="font-medium">{debt.debt_name}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {debt.debt_type.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {editingDebtId === debt.id ? (
                      <>
                        <button
                          onClick={() => handleUpdateAmount(debt.id)}
                          disabled={isUpdatingAmount}
                          className="p-2 text-success touch-feedback"
                          title="Save"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={isUpdatingAmount}
                          className="p-2 text-muted-foreground touch-feedback"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEditAmount(debt)}
                          className="p-2 text-primary touch-feedback hover:bg-primary/10 rounded-lg transition-colors"
                          title="Edit amount"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteDebt(debt.id)}
                          className="p-2 text-destructive touch-feedback hover:bg-destructive/10 rounded-lg transition-colors"
                          title="Delete debt"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {editingDebtId === debt.id ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 justify-center">
                      <span className="text-2xl text-muted-foreground">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={editingAmount}
                        onChange={(e) => setEditingAmount(e.target.value)}
                        className="text-2xl font-bold text-center border-2 border-primary focus-visible:ring-primary"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleUpdateAmount(debt.id);
                          } else if (e.key === "Escape") {
                            handleCancelEdit();
                          }
                        }}
                      />
                    </div>
                    <Button
                      onClick={() => handleUpdateAmount(debt.id)}
                      disabled={isUpdatingAmount}
                      className="w-full h-10"
                      size="sm"
                    >
                      {isUpdatingAmount ? "Updating..." : "Save Amount"}
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-center text-destructive mb-4">
                      {formatCurrency(Number(debt.current_amount))}
                    </p>
                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={() => updateDebtAmount(debt.id, -100)}
                        className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center touch-feedback"
                      >
                        <Minus className="w-5 h-5 text-success" />
                      </button>
                      <span className="text-sm text-muted-foreground">±$100</span>
                      <button
                        onClick={() => updateDebtAmount(debt.id, 100)}
                        className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center touch-feedback"
                      >
                        <Plus className="w-5 h-5 text-destructive" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add Form */}
        {showAdd && (
          <div className="bg-card rounded-2xl border border-border p-4 space-y-4 animate-scale-in">
            <Input
              placeholder="Debt name (e.g., Chase Visa)"
              value={debtName}
              onChange={(e) => setDebtName(e.target.value)}
              className="touch-input"
            />
            <div className="grid grid-cols-2 gap-2">
              {DEBT_TYPES.slice(0, 4).map((type) => (
                <button
                  key={type.value}
                  onClick={() => setDebtType(type.value)}
                  className={cn(
                    "h-10 rounded-lg border-2 text-sm font-medium transition-all",
                    debtType === type.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary"
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
            <Input
              type="number"
              placeholder="Current amount owed"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="touch-input"
            />
            <Button
              onClick={handleAddDebt}
              disabled={isSubmitting}
              className="w-full h-12"
            >
              {isSubmitting ? "Adding..." : "Add Debt"}
            </Button>
          </div>
        )}

        <Button
          variant="outline"
          onClick={() => setShowAdd(!showAdd)}
          className="w-full h-12"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Debt
        </Button>
      </div>
    </div>
  );
}
