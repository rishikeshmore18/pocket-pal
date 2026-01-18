import { formatDistanceToNow } from "date-fns";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Expense {
  id: string;
  expense_name: string;
  category: string;
  amount: number;
  date_time: string;
  payment_method: string;
}

interface RecentActivityProps {
  expenses: Expense[];
  isLoading?: boolean;
}

export function RecentActivity({ expenses, isLoading }: RecentActivityProps) {
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

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="expense-item animate-pulse">
            <div className="w-10 h-10 rounded-xl bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
            <div className="h-5 bg-muted rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No expenses yet</p>
        <p className="text-sm text-muted-foreground/60 mt-1">
          Tap + to add your first expense
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {expenses.map((expense) => {
        const Icon = getCategoryIcon(expense.category);
        return (
          <div key={expense.id} className="expense-item touch-feedback">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              {Icon && <Icon className="w-5 h-5 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{expense.expense_name}</p>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(expense.date_time), { addSuffix: true })}
              </p>
            </div>
            <span className="font-semibold text-destructive">
              -{formatCurrency(expense.amount)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
