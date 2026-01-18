import { Wallet, TrendingUp, TrendingDown, PiggyBank } from "lucide-react";
import { StatCard } from "./StatCard";

interface QuickStatsProps {
  totalBalance: number;
  monthlyEarnings: number;
  monthlyExpenses: number;
  netSavings: number;
}

export function QuickStats({ totalBalance, monthlyEarnings, monthlyExpenses, netSavings }: QuickStatsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="flex gap-4 overflow-x-auto scrollbar-hide snap-x-mandatory pb-2 -mx-4 px-4">
      <StatCard
        icon={Wallet}
        label="Total Balance"
        value={formatCurrency(totalBalance)}
      />
      <StatCard
        icon={TrendingUp}
        label="This Month Earnings"
        value={formatCurrency(monthlyEarnings)}
        variant="income"
      />
      <StatCard
        icon={TrendingDown}
        label="This Month Expenses"
        value={formatCurrency(monthlyExpenses)}
        variant="expense"
      />
      <StatCard
        icon={PiggyBank}
        label="Net Savings"
        value={formatCurrency(netSavings)}
        variant={netSavings >= 0 ? "income" : "expense"}
      />
    </div>
  );
}
