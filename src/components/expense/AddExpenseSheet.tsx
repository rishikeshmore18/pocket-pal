import { useState, useEffect } from "react";
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
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("other");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [expenseName, setExpenseName] = useState("");
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingExpense && isOpen) {
      setAmount(editingExpense.amount.toString());
      setCategory(editingExpense.category);
      setPaymentMethod(editingExpense.payment_method);
      setExpenseName(editingExpense.expense_name);
      setNotes(editingExpense.notes || "");
      setShowNotes(!!editingExpense.notes);
    } else if (isOpen) {
      resetForm();
    }
  }, [editingExpense, isOpen]);

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
        notes: notes.trim() || null,
      });

      setIsSubmitting(false);

      if (error) {
        toast.error("Failed to add expense");
        console.error(error);
        return;
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
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.slice(0, 3).map((method) => (
                <button
                  key={method.value}
                  onClick={() => setPaymentMethod(method.value)}
                  className={cn(
                    "h-12 rounded-xl border-2 font-medium transition-all touch-feedback",
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

          {/* Expense Name */}
          <div>
            <Input
              placeholder="What did you buy?"
              value={expenseName}
              onChange={(e) => setExpenseName(e.target.value)}
              className="touch-input"
            />
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
