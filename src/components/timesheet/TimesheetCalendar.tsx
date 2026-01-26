import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, parseISO, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Check, Clock, DollarSign, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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

interface TimesheetCalendarProps {
  timesheets: Timesheet[];
  onTogglePaid: (id: string, isPaid: boolean) => void;
  onMarkDayPaid: (ids: string[], isPaid: boolean) => void;
  onSelectDay: (date: Date, timesheets: Timesheet[]) => void;
  formatCurrency: (amount: number) => string;
}

export function TimesheetCalendar({ timesheets, onTogglePaid, onMarkDayPaid, onSelectDay, formatCurrency }: TimesheetCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [markMode, setMarkMode] = useState<"paid" | "unpaid" | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get the day of week for the first day (0 = Sunday)
  const startDayOfWeek = monthStart.getDay();

  // Create padding days for the calendar grid
  const paddingDays = Array(startDayOfWeek).fill(null);

  const getTimesheetsForDay = (date: Date): Timesheet[] => {
    return timesheets.filter(ts => isSameDay(parseISO(ts.work_date), date));
  };

  const getDayEarnings = (dayTimesheets: Timesheet[]): number => {
    return dayTimesheets.reduce((sum, ts) => sum + (ts.hours_worked * ts.hourly_pay), 0);
  };

  const getDayHours = (dayTimesheets: Timesheet[]): number => {
    return dayTimesheets.reduce((sum, ts) => sum + ts.hours_worked, 0);
  };

  const isAllPaid = (dayTimesheets: Timesheet[]): boolean => {
    return dayTimesheets.length > 0 && dayTimesheets.every(ts => ts.is_paid);
  };

  const hasAnyPaid = (dayTimesheets: Timesheet[]): boolean => {
    return dayTimesheets.some(ts => ts.is_paid);
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const handleDayClick = (day: Date, dayTimesheets: Timesheet[]) => {
    if (!dayTimesheets.length) return;
    
    if (markMode) {
      const ids = dayTimesheets.map(ts => ts.id);
      onMarkDayPaid(ids, markMode === "paid");
    } else {
      onSelectDay(day, dayTimesheets);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-4">
      {/* Mark Mode Buttons */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={markMode === "paid" ? "default" : "outline"}
          size="sm"
          onClick={() => setMarkMode(markMode === "paid" ? null : "paid")}
          className={cn(
            "flex-1",
            markMode === "paid" && "bg-success hover:bg-success/90"
          )}
        >
          <DollarSign className="w-4 h-4 mr-1" />
          {markMode === "paid" ? "Tap days to mark paid" : "Mark as Paid"}
        </Button>
        <Button
          variant={markMode === "unpaid" ? "default" : "outline"}
          size="sm"
          onClick={() => setMarkMode(markMode === "unpaid" ? null : "unpaid")}
          className={cn(
            "flex-1",
            markMode === "unpaid" && "bg-warning hover:bg-warning/90 text-warning-foreground"
          )}
        >
          <X className="w-4 h-4 mr-1" />
          {markMode === "unpaid" ? "Tap days to unmark" : "Mark as Unpaid"}
        </Button>
      </div>

      {markMode && (
        <div className={cn(
          "text-center text-sm py-2 px-3 rounded-lg mb-4",
          markMode === "paid" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
        )}>
          {markMode === "paid" 
            ? "Tap on any day with entries to mark all as paid" 
            : "Tap on any day with entries to mark all as unpaid"}
        </div>
      )}

      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Padding days */}
        {paddingDays.map((_, index) => (
          <div key={`padding-${index}`} className="aspect-square" />
        ))}

        {/* Actual days */}
        {daysInMonth.map(day => {
          const dayTimesheets = getTimesheetsForDay(day);
          const hasEntries = dayTimesheets.length > 0;
          const earnings = getDayEarnings(dayTimesheets);
          const hours = getDayHours(dayTimesheets);
          const allPaid = isAllPaid(dayTimesheets);
          const somePaid = hasAnyPaid(dayTimesheets);
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDayClick(day, dayTimesheets)}
              className={cn(
                "aspect-square rounded-lg p-1 flex flex-col items-center justify-start transition-all relative",
                "hover:bg-muted/50",
                isToday && "ring-2 ring-primary",
                hasEntries && !allPaid && "bg-warning/10",
                hasEntries && allPaid && "bg-success/10",
                !hasEntries && "opacity-50",
                markMode && hasEntries && "cursor-pointer hover:scale-105",
                markMode === "paid" && hasEntries && !allPaid && "ring-2 ring-success/50",
                markMode === "unpaid" && hasEntries && allPaid && "ring-2 ring-warning/50"
              )}
            >
              <span className={cn(
                "text-sm font-medium",
                isToday && "text-primary"
              )}>
                {format(day, "d")}
              </span>
              
              {hasEntries && (
                <>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    <Clock className="w-2.5 h-2.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">{hours}h</span>
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium",
                    allPaid ? "text-success" : "text-warning"
                  )}>
                    {formatCurrency(earnings)}
                  </span>
                  
                  {/* Paid indicator */}
                  {allPaid && (
                    <div className="absolute top-0.5 right-0.5">
                      <Check className="w-3 h-3 text-success" />
                    </div>
                  )}
                  {somePaid && !allPaid && (
                    <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-warning" />
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-success/20 flex items-center justify-center">
            <Check className="w-2 h-2 text-success" />
          </div>
          <span className="text-xs text-muted-foreground">Paid</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-warning/20" />
          <span className="text-xs text-muted-foreground">Pending</span>
        </div>
      </div>
    </div>
  );
}
