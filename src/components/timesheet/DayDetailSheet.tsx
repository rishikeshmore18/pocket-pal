import { format, parseISO } from "date-fns";
import { Check, Clock, DollarSign, Pencil, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Timesheet {
  id: string;
  job_name: string;
  hours_worked: number;
  hourly_pay: number;
  work_date: string;
  day_of_week: string;
  time_from: string | null;
  time_to: string | null;
  is_paid: boolean;
  paid_date: string | null;
}

interface DayDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  timesheets: Timesheet[];
  onTogglePaid: (id: string, isPaid: boolean) => void;
  onMarkAllPaid: (ids: string[]) => void;
  onEdit: (timesheet: Timesheet) => void;
  onDelete: (id: string) => void;
  formatCurrency: (amount: number) => string;
}

export function DayDetailSheet({
  open,
  onOpenChange,
  selectedDate,
  timesheets,
  onTogglePaid,
  onMarkAllPaid,
  onEdit,
  onDelete,
  formatCurrency,
}: DayDetailSheetProps) {
  if (!selectedDate) return null;

  const totalEarnings = timesheets.reduce(
    (sum, ts) => sum + ts.hours_worked * ts.hourly_pay,
    0
  );
  const totalHours = timesheets.reduce((sum, ts) => sum + ts.hours_worked, 0);
  const paidEntries = timesheets.filter(ts => ts.is_paid);
  const unpaidEntries = timesheets.filter(ts => !ts.is_paid);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-left">
            {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 overflow-y-auto max-h-[calc(70vh-120px)]">
          {/* Summary */}
          <div className="flex gap-3">
            <div className="flex-1 bg-muted/50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Hours</span>
              </div>
              <span className="text-lg font-bold">{totalHours}h</span>
            </div>
            <div className="flex-1 bg-muted/50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-success" />
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
              <span className="text-lg font-bold text-success">
                {formatCurrency(totalEarnings)}
              </span>
            </div>
          </div>

          {/* Mark All Paid Button */}
          {unpaidEntries.length > 0 && (
            <Button
              onClick={() => onMarkAllPaid(unpaidEntries.map(ts => ts.id))}
              className="w-full"
              variant="outline"
            >
              <Check className="w-4 h-4 mr-2" />
              Mark All as Paid ({unpaidEntries.length} entries)
            </Button>
          )}

          {/* Entries List */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Entries</h3>
            {timesheets.map(ts => (
              <div
                key={ts.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-all",
                  ts.is_paid
                    ? "bg-success/5 border-success/20"
                    : "bg-card border-border"
                )}
              >
                <button
                  onClick={() => onTogglePaid(ts.id, !ts.is_paid)}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                    ts.is_paid
                      ? "bg-success border-success"
                      : "border-muted-foreground hover:border-success"
                  )}
                >
                  {ts.is_paid && <Check className="w-4 h-4 text-success-foreground" />}
                </button>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{ts.job_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {ts.hours_worked}h × {formatCurrency(ts.hourly_pay)}/hr
                  </p>
                </div>
                
                <div className="flex items-center gap-1">
                  <span className={cn(
                    "font-semibold mr-2",
                    ts.is_paid ? "text-success" : "text-foreground"
                  )}>
                    {formatCurrency(ts.hours_worked * ts.hourly_pay)}
                  </span>
                  <button
                    onClick={() => {
                      onEdit(ts);
                      onOpenChange(false);
                    }}
                    className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    title="Edit entry"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(ts.id)}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    title="Delete entry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
