-- Add is_paid column to track which timesheet entries have been paid
ALTER TABLE public.timesheets 
ADD COLUMN is_paid BOOLEAN NOT NULL DEFAULT false;

-- Add paid_date to track when payment was received
ALTER TABLE public.timesheets 
ADD COLUMN paid_date DATE DEFAULT NULL;