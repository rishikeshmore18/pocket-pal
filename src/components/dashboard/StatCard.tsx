import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "income" | "expense";
}

export function StatCard({ icon: Icon, label, value, trend, variant = "default" }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center",
          variant === "income" && "bg-success/20 text-success",
          variant === "expense" && "bg-destructive/20 text-destructive",
          variant === "default" && "bg-primary/20 text-primary"
        )}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className={cn(
          "text-2xl font-bold",
          variant === "income" && "text-success",
          variant === "expense" && "text-destructive"
        )}>
          {value}
        </span>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-xs",
            trend.isPositive ? "text-success" : "text-destructive"
          )}>
            {trend.isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
