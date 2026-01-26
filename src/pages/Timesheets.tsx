import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Clock, DollarSign, Trash2, Pencil, Calendar as CalendarIcon, List } from "lucide-react";
import { format, parseISO, startOfMonth } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TimesheetCalendar } from "@/components/timesheet/TimesheetCalendar";
import { DayDetailSheet } from "@/components/timesheet/DayDetailSheet";
import { EarningsStats } from "@/components/timesheet/EarningsStats";
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

export default function Timesheets() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDayTimesheets, setSelectedDayTimesheets] = useState<Timesheet[]>([]);
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [jobName, setJobName] = useState("");
  const [hoursWorked, setHoursWorked] = useState("");
  const [hourlyPay, setHourlyPay] = useState("");
  const [workDate, setWorkDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [jobNameSelect, setJobNameSelect] = useState<string>("");
  const [timeFrom, setTimeFrom] = useState<string>("");
  const [timeTo, setTimeTo] = useState<string>("");
  const [useTimeInput, setUseTimeInput] = useState<boolean>(false);
  const [hourlyPaySelect, setHourlyPaySelect] = useState<string>("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const fetchTimesheets = async () => {
    if (!user) return;

    setIsLoading(true);
    const { data, error } = await supabase
      .from("timesheets")
      .select("*")
      .eq("user_id", user.id)
      .order("work_date", { ascending: false });

    if (error) {
      toast.error("Failed to load timesheets");
    } else {
      setTimesheets(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchTimesheets();
    }
  }, [user]);

  const resetForm = () => {
    setJobName("");
    setJobNameSelect("");
    setHoursWorked("");
    setHourlyPay("");
    setHourlyPaySelect("");
    setWorkDate(format(new Date(), "yyyy-MM-dd"));
    setTimeFrom("");
    setTimeTo("");
    setUseTimeInput(false);
    setEditingId(null);
  };

  // Calculate hours from time in/out
  const calculateHoursFromTime = (from: string, to: string): number | null => {
    if (!from || !to) return null;

    try {
      const [fromHours, fromMinutes] = from.split(":").map(Number);
      const [toHours, toMinutes] = to.split(":").map(Number);

      const fromTime = fromHours * 60 + fromMinutes;
      let toTime = toHours * 60 + toMinutes;

      // Handle overnight shifts (e.g., 10pm to 2am = next day)
      if (toTime < fromTime) {
        toTime += 24 * 60; // Add 24 hours
      }

      const diffMinutes = toTime - fromTime;
      const hours = diffMinutes / 60;

      return Math.round(hours * 10) / 10; // Round to 1 decimal place
    } catch (error) {
      return null;
    }
  };

  // Handle time input changes and auto-calculate hours
  useEffect(() => {
    if (useTimeInput && timeFrom && timeTo) {
      const calculatedHours = calculateHoursFromTime(timeFrom, timeTo);
      if (calculatedHours !== null && calculatedHours >= 0) {
        setHoursWorked(calculatedHours.toString());
      }
    }
  }, [timeFrom, timeTo, useTimeInput]);

  const handleSubmit = async () => {
    if (!user) return;

    const finalJobName = jobNameSelect === "custom" ? jobName.trim() : jobNameSelect.trim();
    const finalHourlyPay = hourlyPaySelect === "custom" ? hourlyPay : hourlyPaySelect;
    
    if (!finalJobName || !hoursWorked || !finalHourlyPay) {
      toast.error("Please fill in all required fields");
      return;
    }

    // If using time input, validate times
    if (useTimeInput) {
      if (!timeFrom || !timeTo) {
        toast.error("Please enter both time in and time out");
        return;
      }
      const calculatedHours = calculateHoursFromTime(timeFrom, timeTo);
      if (calculatedHours === null || calculatedHours < 0) {
        toast.error("Invalid time range");
        return;
      }
    }

    setIsSubmitting(true);

    const date = parseISO(workDate);
    const dayOfWeek = format(date, "EEEE");

    const updateData: any = {
      job_name: finalJobName,
      hours_worked: parseFloat(hoursWorked),
      hourly_pay: parseFloat(finalHourlyPay),
      work_date: workDate,
      day_of_week: dayOfWeek,
    };

    // Add time_from and time_to if using time input
    if (useTimeInput && timeFrom && timeTo) {
      updateData.time_from = timeFrom;
      updateData.time_to = timeTo;
    } else {
      // Clear time fields if not using time input
      updateData.time_from = null;
      updateData.time_to = null;
    }

    if (editingId) {
      // Update existing timesheet
      const { error } = await supabase
        .from("timesheets")
        .update(updateData)
        .eq("id", editingId);

      setIsSubmitting(false);

      if (error) {
        toast.error("Failed to update timesheet");
        console.error(error);
      } else {
        toast.success("Timesheet updated");
        resetForm();
        setShowAdd(false);
        fetchTimesheets();
      }
    } else {
      // Insert new timesheet
      const { error } = await supabase.from("timesheets").insert({
        user_id: user.id,
        ...updateData,
      });

      setIsSubmitting(false);

      if (error) {
        toast.error("Failed to add timesheet");
        console.error(error);
      } else {
        toast.success("Timesheet added");
        resetForm();
        setShowAdd(false);
        fetchTimesheets();
      }
    }
  };

  const handleEdit = (timesheet: Timesheet) => {
    setEditingId(timesheet.id);
    const isJobInList = uniqueJobNames.includes(timesheet.job_name);
    setJobName(timesheet.job_name);
    setJobNameSelect(isJobInList ? timesheet.job_name : "custom");
    setHoursWorked(timesheet.hours_worked.toString());
    
    const hourlyPayStr = timesheet.hourly_pay.toString();
    const isHourlyPayInList = uniqueHourlyRates.includes(hourlyPayStr);
    setHourlyPay(hourlyPayStr);
    setHourlyPaySelect(isHourlyPayInList ? hourlyPayStr : "custom");
    
    setWorkDate(timesheet.work_date);
    
    // Set time inputs if available
    if (timesheet.time_from && timesheet.time_to) {
      setTimeFrom(timesheet.time_from);
      setTimeTo(timesheet.time_to);
      setUseTimeInput(true);
    } else {
      setTimeFrom("");
      setTimeTo("");
      setUseTimeInput(false);
    }
    
    setShowAdd(true);
  };

  const deleteTimesheet = async (id: string) => {
    const { error } = await supabase.from("timesheets").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Deleted");
      fetchTimesheets();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleTogglePaid = async (id: string, isPaid: boolean) => {
    const { error } = await supabase
      .from("timesheets")
      .update({ 
        is_paid: isPaid,
        paid_date: isPaid ? format(new Date(), "yyyy-MM-dd") : null
      })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update payment status");
    } else {
      toast.success(isPaid ? "Marked as paid" : "Marked as unpaid");
      fetchTimesheets();
      // Update selected day timesheets if sheet is open
      if (showDayDetail && selectedDayTimesheets.length > 0) {
        setSelectedDayTimesheets(prev => 
          prev.map(ts => ts.id === id ? { ...ts, is_paid: isPaid } : ts)
        );
      }
    }
  };

  const handleMarkAllPaid = async (ids: string[]) => {
    const { error } = await supabase
      .from("timesheets")
      .update({ 
        is_paid: true,
        paid_date: format(new Date(), "yyyy-MM-dd")
      })
      .in("id", ids);

    if (error) {
      toast.error("Failed to update payment status");
    } else {
      toast.success(`Marked ${ids.length} entries as paid`);
      fetchTimesheets();
      setShowDayDetail(false);
    }
  };

  const handleMarkDayPaid = async (ids: string[], isPaid: boolean) => {
    const { error } = await supabase
      .from("timesheets")
      .update({ 
        is_paid: isPaid,
        paid_date: isPaid ? format(new Date(), "yyyy-MM-dd") : null
      })
      .in("id", ids);

    if (error) {
      toast.error("Failed to update payment status");
    } else {
      toast.success(isPaid ? `Marked ${ids.length} entries as paid` : `Marked ${ids.length} entries as unpaid`);
      fetchTimesheets();
    }
  };

  const handleSelectDay = (date: Date, dayTimesheets: Timesheet[]) => {
    setSelectedDate(date);
    setSelectedDayTimesheets(dayTimesheets);
    setShowDayDetail(true);
  };

  // Get unique job names from existing timesheets
  const uniqueJobNames = Array.from(new Set(timesheets.map((ts) => ts.job_name))).sort();

  // Get unique hourly pay rates from existing timesheets
  const uniqueHourlyRates = Array.from(
    new Set(timesheets.map((ts) => ts.hourly_pay.toString()))
  )
    .map(Number)
    .sort((a, b) => a - b)
    .map(String);

  // Calculate totals
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyTimesheets = timesheets.filter(
    (ts) => parseISO(ts.work_date) >= startOfMonth
  );
  const totalMonthlyHours = monthlyTimesheets.reduce(
    (sum, ts) => sum + Number(ts.hours_worked),
    0
  );
  const totalMonthlyEarnings = monthlyTimesheets.reduce(
    (sum, ts) => sum + Number(ts.hours_worked) * Number(ts.hourly_pay),
    0
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <header className="glass-header px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Timesheets</h1>
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex bg-muted rounded-lg p-1">
              <button
                onClick={() => setViewMode("calendar")}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "calendar" ? "bg-background shadow-sm" : ""
                }`}
              >
                <CalendarIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "list" ? "bg-background shadow-sm" : ""
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="w-10 h-10 rounded-full bg-primary flex items-center justify-center touch-feedback"
            >
              <Plus className="w-5 h-5 text-primary-foreground" />
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-6">
        {/* Earnings Stats */}
        <EarningsStats timesheets={monthlyTimesheets} formatCurrency={formatCurrency} />

        {/* Add/Edit Form */}
        {showAdd && (
          <div className="bg-card rounded-2xl border border-border p-4 space-y-4 animate-scale-in">
            <div>
              <Select
                value={jobNameSelect || (editingId && jobName ? "custom" : "")}
                onValueChange={(value) => {
                  setJobNameSelect(value);
                  if (value !== "custom") {
                    setJobName(value);
                  } else {
                    setJobName(editingId ? jobName : "");
                  }
                }}
              >
                <SelectTrigger className="touch-input h-14">
                  <SelectValue placeholder="Select job name or enter custom" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueJobNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom (enter new)</SelectItem>
                </SelectContent>
              </Select>
              {jobNameSelect === "custom" && (
                <Input
                  placeholder="Enter custom job name"
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  className="touch-input mt-3"
                />
              )}
            </div>
            <Input
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              className="touch-input"
            />
            
            {/* Hours Input Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const newMode = !useTimeInput;
                    setUseTimeInput(newMode);
                    if (!newMode) {
                      // Switching to direct hours mode - clear time inputs
                      setTimeFrom("");
                      setTimeTo("");
                    } else {
                      // Switching to time input mode - clear hours if it was auto-calculated
                      // Keep hours if user manually entered them
                    }
                  }}
                  className={cn(
                    "flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                    useTimeInput
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary"
                  )}
                >
                  {useTimeInput ? "Using Time In/Out" : "Enter Hours Directly"}
                </button>
              </div>

              {useTimeInput ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Time In</label>
                    <Input
                      type="time"
                      value={timeFrom}
                      onChange={(e) => setTimeFrom(e.target.value)}
                      className="touch-input"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Time Out</label>
                    <Input
                      type="time"
                      value={timeTo}
                      onChange={(e) => setTimeTo(e.target.value)}
                      className="touch-input"
                    />
                  </div>
                </div>
              ) : null}

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  Hours {useTimeInput && timeFrom && timeTo ? "(Auto-calculated)" : ""}
                </label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Hours (e.g., 6.5)"
                  value={hoursWorked}
                  onChange={(e) => setHoursWorked(e.target.value)}
                  className="touch-input"
                  readOnly={useTimeInput && !!timeFrom && !!timeTo}
                />
              </div>
            </div>

            {/* Hourly Rate Section */}
            <div>
              <Select
                value={hourlyPaySelect || (editingId && hourlyPay ? "custom" : "")}
                onValueChange={(value) => {
                  setHourlyPaySelect(value);
                  if (value !== "custom") {
                    setHourlyPay(value);
                  } else {
                    setHourlyPay(editingId ? hourlyPay : "");
                  }
                }}
              >
                <SelectTrigger className="touch-input h-14">
                  <SelectValue placeholder="Select hourly rate or enter custom" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueHourlyRates.map((rate) => (
                    <SelectItem key={rate} value={rate}>
                      ${rate}/hour
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom (enter new)</SelectItem>
                </SelectContent>
              </Select>
              {hourlyPaySelect === "custom" && (
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Enter hourly rate ($/hour)"
                  value={hourlyPay}
                  onChange={(e) => setHourlyPay(e.target.value)}
                  className="touch-input mt-3"
                />
              )}
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  resetForm();
                  setShowAdd(false);
                }}
                variant="outline"
                className="flex-1 h-12"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 h-12"
              >
                {isSubmitting
                  ? editingId
                    ? "Updating..."
                    : "Adding..."
                  : editingId
                    ? "Update Entry"
                    : "Add Entry"}
              </Button>
            </div>
          </div>
        )}

        {/* View Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="expense-item animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : timesheets.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-secondary mx-auto mb-4 flex items-center justify-center">
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No timesheets yet</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Tap + to log your hours
            </p>
          </div>
        ) : viewMode === "calendar" ? (
          <TimesheetCalendar
            timesheets={timesheets}
            onTogglePaid={handleTogglePaid}
            onMarkDayPaid={handleMarkDayPaid}
            onSelectDay={handleSelectDay}
            formatCurrency={formatCurrency}
          />
        ) : (
          <div className="space-y-3">
            {timesheets.map((ts) => (
              <div key={ts.id} className="expense-item group">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  ts.is_paid ? "bg-success/20" : "bg-warning/20"
                }`}>
                  <Clock className={`w-5 h-5 ${ts.is_paid ? "text-success" : "text-warning"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{ts.job_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(ts.work_date), "MMM d")} • {ts.day_of_week} • {ts.hours_worked}h
                    {ts.is_paid && <span className="text-success ml-1">• Paid</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${ts.is_paid ? "text-success" : "text-warning"}`}>
                    +{formatCurrency(Number(ts.hours_worked) * Number(ts.hourly_pay))}
                  </span>
                  <button
                    onClick={() => handleTogglePaid(ts.id, !ts.is_paid)}
                    className="p-2 text-muted-foreground hover:text-success touch-feedback"
                    title={ts.is_paid ? "Mark as unpaid" : "Mark as paid"}
                  >
                    {ts.is_paid ? (
                      <DollarSign className="w-4 h-4 text-success" />
                    ) : (
                      <DollarSign className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(ts)}
                    className="p-2 text-primary touch-feedback hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteTimesheet(ts.id)}
                    className="p-2 text-destructive touch-feedback hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Day Detail Sheet */}
      <DayDetailSheet
        open={showDayDetail}
        onOpenChange={setShowDayDetail}
        selectedDate={selectedDate}
        timesheets={selectedDayTimesheets}
        onTogglePaid={handleTogglePaid}
        onMarkAllPaid={handleMarkAllPaid}
        onEdit={handleEdit}
        onDelete={deleteTimesheet}
        formatCurrency={formatCurrency}
      />
    </AppLayout>
  );
}
