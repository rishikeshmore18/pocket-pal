import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Wallet, Building, Trash2, Pencil, Check, X } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ACCOUNT_TYPES } from "@/lib/constants";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BankAccount {
  id: string;
  bank_name: string;
  account_type: string;
  current_balance: number;
}

interface CashAccount {
  id: string;
  current_balance: number;
}

export default function Accounts() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"banks" | "cash">("banks");
  const [showAdd, setShowAdd] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [cashAccount, setCashAccount] = useState<CashAccount | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingBalance, setEditingBalance] = useState<string>("");
  const [isUpdatingBalance, setIsUpdatingBalance] = useState(false);

  // Form state
  const [bankName, setBankName] = useState("");
  const [accountType, setAccountType] = useState<string>("checking");
  const [balance, setBalance] = useState("");
  const [cashBalance, setCashBalance] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const fetchAccounts = async () => {
    if (!user) return;

    setIsLoading(true);

    const { data: banks } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("user_id", user.id);

    setBankAccounts(banks || []);

    const { data: cash } = await supabase
      .from("cash_account")
      .select("*")
      .eq("user_id", user.id)
      .single();

    setCashAccount(cash);
    if (cash) {
      setCashBalance(cash.current_balance.toString());
    }

    setIsLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchAccounts();
    }
  }, [user]);

  const handleAddBank = async () => {
    if (!user) return;

    if (!bankName.trim() || !balance) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from("bank_accounts").insert({
      user_id: user.id,
      bank_name: bankName.trim(),
      account_type: accountType as any,
      current_balance: parseFloat(balance),
    });

    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to add account");
    } else {
      toast.success("Account added");
      setBankName("");
      setBalance("");
      setShowAdd(false);
      fetchAccounts();
    }
  };

  const handleUpdateCash = async () => {
    if (!user) return;

    setIsSubmitting(true);

    const { error } = await supabase
      .from("cash_account")
      .update({ current_balance: parseFloat(cashBalance) })
      .eq("user_id", user.id);

    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to update");
    } else {
      toast.success("Cash updated");
      fetchAccounts();
    }
  };

  const deleteAccount = async (id: string) => {
    const { error } = await supabase.from("bank_accounts").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Account deleted");
      fetchAccounts();
    }
  };

  const handleEditBalance = (account: BankAccount) => {
    setEditingAccountId(account.id);
    setEditingBalance(account.current_balance.toString());
  };

  const handleCancelEdit = () => {
    setEditingAccountId(null);
    setEditingBalance("");
  };

  const handleUpdateBalance = async (accountId: string) => {
    if (!editingBalance || isNaN(parseFloat(editingBalance))) {
      toast.error("Please enter a valid balance");
      return;
    }

    setIsUpdatingBalance(true);

    const { error } = await supabase
      .from("bank_accounts")
      .update({ current_balance: parseFloat(editingBalance) })
      .eq("id", accountId);

    setIsUpdatingBalance(false);

    if (error) {
      toast.error("Failed to update balance");
      console.error(error);
    } else {
      toast.success("Balance updated");
      setEditingAccountId(null);
      setEditingBalance("");
      fetchAccounts();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const totalBalance = bankAccounts.reduce((sum, acc) => sum + Number(acc.current_balance), 0) + 
    (cashAccount?.current_balance ? Number(cashAccount.current_balance) : 0);

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
          <h1 className="text-xl font-bold">Accounts</h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-6">
        {/* Total Balance */}
        <div className="bg-card rounded-2xl border border-border p-6 text-center">
          <p className="text-sm text-muted-foreground mb-1">Total Balance</p>
          <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-secondary rounded-xl p-1">
          <button
            onClick={() => setActiveTab("banks")}
            className={cn(
              "flex-1 py-3 rounded-lg font-medium transition-colors",
              activeTab === "banks" ? "bg-background" : "text-muted-foreground"
            )}
          >
            Banks
          </button>
          <button
            onClick={() => setActiveTab("cash")}
            className={cn(
              "flex-1 py-3 rounded-lg font-medium transition-colors",
              activeTab === "cash" ? "bg-background" : "text-muted-foreground"
            )}
          >
            Cash
          </button>
        </div>

        {activeTab === "banks" ? (
          <>
            {/* Bank Accounts */}
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {bankAccounts.map((acc) => (
                  <div key={acc.id} className="bg-card rounded-2xl border border-border p-4 group">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                          <Building className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{acc.bank_name}</p>
                          <p className="text-sm text-muted-foreground capitalize">{acc.account_type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {editingAccountId === acc.id ? (
                          <>
                            <button
                              onClick={() => handleUpdateBalance(acc.id)}
                              disabled={isUpdatingBalance}
                              className="p-2 text-success touch-feedback"
                              title="Save"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={isUpdatingBalance}
                              className="p-2 text-muted-foreground touch-feedback"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEditBalance(acc)}
                              className="opacity-0 group-hover:opacity-100 p-2 text-primary touch-feedback"
                              title="Edit balance"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteAccount(acc.id)}
                              className="opacity-0 group-hover:opacity-100 p-2 text-destructive touch-feedback"
                              title="Delete account"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {editingAccountId === acc.id ? (
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center gap-2 justify-center">
                          <span className="text-2xl text-muted-foreground">$</span>
                          <Input
                            type="number"
                            value={editingBalance}
                            onChange={(e) => setEditingBalance(e.target.value)}
                            className="text-2xl font-bold text-center border-2 border-primary focus-visible:ring-primary"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleUpdateBalance(acc.id);
                              } else if (e.key === "Escape") {
                                handleCancelEdit();
                              }
                            }}
                          />
                        </div>
                        <Button
                          onClick={() => handleUpdateBalance(acc.id)}
                          disabled={isUpdatingBalance}
                          className="w-full h-10"
                          size="sm"
                        >
                          {isUpdatingBalance ? "Updating..." : "Save Balance"}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-2xl font-bold mt-4 text-center">
                        {formatCurrency(Number(acc.current_balance))}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add Account Form */}
            {showAdd && (
              <div className="bg-card rounded-2xl border border-border p-4 space-y-4 animate-scale-in">
                <Input
                  placeholder="Bank name"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="touch-input"
                />
                <div className="grid grid-cols-3 gap-2">
                  {ACCOUNT_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setAccountType(type.value)}
                      className={cn(
                        "h-10 rounded-lg border-2 text-sm font-medium transition-all",
                        accountType === type.value
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
                  placeholder="Current balance"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  className="touch-input"
                />
                <Button
                  onClick={handleAddBank}
                  disabled={isSubmitting}
                  className="w-full h-12"
                >
                  {isSubmitting ? "Adding..." : "Add Account"}
                </Button>
              </div>
            )}

            <Button
              variant="outline"
              onClick={() => setShowAdd(!showAdd)}
              className="w-full h-12"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Bank Account
            </Button>
          </>
        ) : (
          /* Cash Account */
          <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-success" />
              </div>
              <p className="font-medium">Cash on Hand</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-3xl text-muted-foreground">$</span>
              <input
                type="number"
                value={cashBalance}
                onChange={(e) => setCashBalance(e.target.value)}
                className="text-3xl font-bold bg-transparent border-none w-full focus:outline-none"
              />
            </div>
            <Button
              onClick={handleUpdateCash}
              disabled={isSubmitting}
              className="w-full h-12"
            >
              {isSubmitting ? "Updating..." : "Update Balance"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
