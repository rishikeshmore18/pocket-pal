ALTER TABLE public.fixed_expenses ADD COLUMN due_date date;
UPDATE public.fixed_expenses SET due_date = make_date(EXTRACT(YEAR FROM now())::int, EXTRACT(MONTH FROM now())::int, LEAST(due_day, 28));
ALTER TABLE public.fixed_expenses ALTER COLUMN due_date SET NOT NULL;
ALTER TABLE public.fixed_expenses ALTER COLUMN due_day DROP NOT NULL;