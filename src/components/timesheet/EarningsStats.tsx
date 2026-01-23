import { Clock, DollarSign, AlertCircle } from "lucide-react";

interface Timesheet {
  id: string;
  hours_worked: number;
  hourly_pay: number;
  is_paid: boolean;
}

interface EarningsStatsProps {
  timesheets: Timesheet[];
  formatCurrency: (amount: number) => string;
}

export function EarningsStats({ timesheets, formatCurrency }: EarningsStatsProps) {
  const paidTimesheets = timesheets.filter(ts => ts.is_paid);
  const unpaidTimesheets = timesheets.filter(ts => !ts.is_paid);

  const totalPaidHours = paidTimesheets.reduce(
    (sum, ts) => sum + Number(ts.hours_worked),
    0
  );
  const totalPaidEarnings = paidTimesheets.reduce(
    (sum, ts) => sum + Number(ts.hours_worked) * Number(ts.hourly_pay),
    0
  );

  const totalPendingHours = unpaidTimesheets.reduce(
    (sum, ts) => sum + Number(ts.hours_worked),
    0
  );
  const totalPendingEarnings = unpaidTimesheets.reduce(
    (sum, ts) => sum + Number(ts.hours_worked) * Number(ts.hourly_pay),
    0
  );

  const totalHours = totalPaidHours + totalPendingHours;

  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2">
      {/* Total Hours */}
      <div className="stat-card min-w-[140px] flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground">This Month</span>
        </div>
        <span className="text-xl font-bold">{totalHours.toFixed(1)}h</span>
      </div>

      {/* Paid Earnings */}
      <div className="stat-card min-w-[140px] flex-shrink-0 bg-success/5 border-success/20">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="w-4 h-4 text-success" />
          <span className="text-xs text-muted-foreground">Earnings</span>
        </div>
        <span className="text-xl font-bold text-success">
          {formatCurrency(totalPaidEarnings)}
        </span>
        <span className="text-xs text-muted-foreground block">
          {totalPaidHours.toFixed(1)}h paid
        </span>
      </div>

      {/* Pending Earnings */}
      <div className="stat-card min-w-[140px] flex-shrink-0 bg-warning/5 border-warning/20">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4 text-warning" />
          <span className="text-xs text-muted-foreground">Pending</span>
        </div>
        <span className="text-xl font-bold text-warning">
          {formatCurrency(totalPendingEarnings)}
        </span>
        <span className="text-xs text-muted-foreground block">
          {totalPendingHours.toFixed(1)}h unpaid
        </span>
      </div>
    </div>
  );
}
