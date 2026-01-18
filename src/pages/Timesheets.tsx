import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Clock, DollarSign, Trash2, Pencil } from "lucide-react";
import { format } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Timesheet {
  id: string;
  job_name: string;
  hours_worked: number;
  hourly_pay: number;
  work_date: string;
  day_of_week: string;
  time_from: string | null;
  time_to: string | null;
}

export default function Timesheets() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [jobName, setJobName] = useState("");
  const [hoursWorked, setHoursWorked] = useState("");
  const [hourlyPay, setHourlyPay] = useState("");
  const [workDate, setWorkDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [jobNameSelect, setJobNameSelect] = useState<string>("");

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
    setWorkDate(format(new Date(), "yyyy-MM-dd"));
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!user) return;

    const finalJobName = jobNameSelect === "custom" ? jobName.trim() : jobNameSelect.trim();
    
    if (!finalJobName || !hoursWorked || !hourlyPay) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    const date = new Date(workDate);
    const dayOfWeek = format(date, "EEEE");

    if (editingId) {
      // Update existing timesheet
      const { error } = await supabase
        .from("timesheets")
        .update({
          job_name: finalJobName,
          hours_worked: parseFloat(hoursWorked),
          hourly_pay: parseFloat(hourlyPay),
          work_date: workDate,
          day_of_week: dayOfWeek,
        })
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
        job_name: finalJobName,
        hours_worked: parseFloat(hoursWorked),
        hourly_pay: parseFloat(hourlyPay),
        work_date: workDate,
        day_of_week: dayOfWeek,
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
    setHourlyPay(timesheet.hourly_pay.toString());
    setWorkDate(timesheet.work_date);
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

  // Get unique job names from existing timesheets
  const uniqueJobNames = Array.from(new Set(timesheets.map((ts) => ts.job_name))).sort();

  // Calculate totals
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyTimesheets = timesheets.filter(
    (ts) => new Date(ts.work_date) >= startOfMonth
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
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center touch-feedback"
          >
            <Plus className="w-5 h-5 text-primary-foreground" />
          </button>
        </div>
      </header>

      <div className="px-4 py-4 space-y-6">
        {/* Quick Stats */}
        <div className="flex gap-4 overflow-x-auto scrollbar-hide -mx-4 px-4">
          <div className="stat-card min-w-[160px]">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">This Month</span>
            </div>
            <span className="text-2xl font-bold">{totalMonthlyHours.toFixed(1)}h</span>
          </div>
          <div className="stat-card min-w-[160px]">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-success" />
              <span className="text-sm text-muted-foreground">Earnings</span>
            </div>
            <span className="text-2xl font-bold text-success">
              {formatCurrency(totalMonthlyEarnings)}
            </span>
          </div>
        </div>

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
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                placeholder="Hours"
                value={hoursWorked}
                onChange={(e) => setHoursWorked(e.target.value)}
                className="touch-input"
              />
              <Input
                type="number"
                placeholder="$/hour"
                value={hourlyPay}
                onChange={(e) => setHourlyPay(e.target.value)}
                className="touch-input"
              />
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

        {/* List */}
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
        ) : (
          <div className="space-y-3">
            {timesheets.map((ts) => (
              <div key={ts.id} className="expense-item group">
                <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{ts.job_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(ts.work_date), "MMM d")} • {ts.day_of_week} • {ts.hours_worked}h
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-success">
                    +{formatCurrency(Number(ts.hours_worked) * Number(ts.hourly_pay))}
                  </span>
                  <button
                    onClick={() => handleEdit(ts)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-primary touch-feedback"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteTimesheet(ts.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-destructive touch-feedback"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
