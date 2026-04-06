import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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

interface AddExpenseSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingExpense?: Expense | null;
}

export function AddExpenseSheet({ isOpen, onClose, onSuccess, editingExpense }: AddExpenseSheetProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("other");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [expenseName, setExpenseName] = useState("");
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creditCards, setCreditCards] = useState<any[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);

  useEffect(() => {
    const loadSheetData = async () => {
      if (!isOpen) return;

      if (editingExpense) {
        setAmount(editingExpense.amount.toString());
        setCategory(editingExpense.category);
        setPaymentMethod(editingExpense.payment_method);
        setExpenseName(editingExpense.expense_name);
        setNotes(editingExpense.notes || "");
        setShowNotes(!!editingExpense.notes);
        setSelectedCardId((editingExpense as any).card_id || null);
        setIsRecurring((editingExpense as any).is_recurring || false);
      } else {
        resetForm();
        if (user) {
          const { data: cards } = await (supabase as any)
            .from("credit_cards")
            .select("id, card_name")
            .eq("user_id", user.id);
          setCreditCards(cards || []);
        }
      }
    };

    loadSheetData();
  }, [editingExpense, isOpen, user]);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please sign in to add expenses");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!expenseName.trim()) {
      toast.error("Please enter an expense name");
      return;
    }

    setIsSubmitting(true);

    if (editingExpense) {
      // Update existing expense
      const { error } = await supabase
        .from("expenses")
        .update({
          expense_name: expenseName.trim(),
          category: category as any,
          amount: parseFloat(amount),
          payment_method: paymentMethod as any,
          is_fixed: isRecurring,
          notes: notes.trim() || null,
        })
        .eq("id", editingExpense.id);

      setIsSubmitting(false);

      if (error) {
        toast.error("Failed to update expense");
        console.error(error);
        return;
      }

      toast.success("Expense updated successfully");
    } else {
      // Insert new expense
      const { error } = await supabase.from("expenses").insert({
        user_id: user.id,
        expense_name: expenseName.trim(),
        category: category as any,
        amount: parseFloat(amount),
        payment_method: paymentMethod as any,
        is_fixed: isRecurring,
        notes: notes.trim() || null,
      });

      setIsSubmitting(false);

      if (error) {
        toast.error("Failed to add expense");
        console.error(error);
        return;
      }

      if (selectedCardId && paymentMethod === "credit") {
        const { data: cardData } = await (supabase as any)
          .from("credit_cards")
          .select("current_outstanding")
          .eq("id", selectedCardId)
          .single();
        const newOutstanding = Number(cardData?.current_outstanding || 0) + parseFloat(amount);
        await (supabase as any)
          .from("credit_cards")
          .update({ current_outstanding: newOutstanding })
          .eq("id", selectedCardId);
      }

      if (isRecurring) {
        await (supabase as any).from("fixed_expenses").insert({
          user_id: user.id,
          expense_name: expenseName.trim(),
          amount: parseFloat(amount),
          category: category,
          due_day: new Date().getDate(),
          is_active: true,
        });
      }

      toast.success("Expense added successfully");
    }

    resetForm();
    onSuccess();
    onClose();
  };

  const resetForm = () => {
    setAmount("");
    setCategory("other");
    setPaymentMethod("cash");
    setExpenseName("");
    setNotes("");
    setShowNotes(false);
    setSelectedCardId(null);
    setIsRecurring(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="bottom-sheet animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Handle bar */}
        <div className="swipe-indicator mt-3" />
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-4">
          <button onClick={onClose} className="text-muted-foreground p-2 -ml-2">
            <X className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-semibold">
            {editingExpense ? "Edit Expense" : "Add Expense"}
          </h2>
          <div className="w-10" />
        </div>

        <div className="px-4 space-y-6 pb-6">
          {/* Amount Input */}
          <div className="text-center py-4">
            <div className="flex items-center justify-center gap-1">
              <span className="text-4xl text-muted-foreground">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="amount-input max-w-[200px] text-foreground"
                autoFocus
              />
            </div>
          </div>

          {/* Category Chips */}
          <div>
            <p className="text-sm text-muted-foreground mb-3">Category</p>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
              {EXPENSE_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={cn(
                      "category-chip touch-feedback",
                      category === cat.value && "active"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <p className="text-sm text-muted-foreground mb-3">Payment Method</p>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  onClick={() => setPaymentMethod(method.value)}
                  className={cn(
                    "flex-1 min-w-[30%] h-12 rounded-xl border-2 font-medium transition-all touch-feedback",
                    paymentMethod === method.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary text-secondary-foreground"
                  )}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === "credit" && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Which card?</p>
              {creditCards.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No cards added.{" "}
                  <button
                    onClick={() => {
                      onClose();
                      navigate("/settings");
                    }}
                    className="text-primary underline"
                  >
                    Add in Settings
                  </button>
                </p>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
                  {creditCards.map((card) => (
                    <button
                      key={card.id}
                      onClick={() => setSelectedCardId(card.id)}
                      className={cn(
                        "category-chip touch-feedback whitespace-nowrap",
                        selectedCardId === card.id && "active"
                      )}
                    >
                      {card.card_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Expense Name */}
          <div>
            <Input
              placeholder="What did you buy?"
              value={expenseName}
              onChange={(e) => setExpenseName(e.target.value)}
              className="touch-input"
            />
          </div>

          <div className="flex items-center justify-between py-1">
            <p className="text-sm text-muted-foreground">Repeat every month?</p>
            <button
              onClick={() => setIsRecurring((r) => !r)}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative",
                isRecurring ? "bg-primary" : "bg-secondary border border-border"
              )}
            >
              <div
                className={cn(
                  "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                  isRecurring ? "translate-x-6" : "translate-x-0.5"
                )}
              />
            </button>
          </div>

          {/* Notes */}
          {showNotes ? (
            <Textarea
              placeholder="Add notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px] bg-input rounded-xl"
            />
          ) : (
            <button
              onClick={() => setShowNotes(true)}
              className="text-sm text-primary flex items-center gap-1"
            >
              <ChevronDown className="w-4 h-4" />
              Add notes
            </button>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full h-14 text-base font-semibold"
          >
            {isSubmitting
              ? editingExpense
                ? "Updating..."
                : "Adding..."
              : editingExpense
                ? "Update Expense"
                : "Save Expense"}
          </Button>
        </div>
      </div>
    </div>
  );
}
