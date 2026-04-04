
-- Create income_settings table
CREATE TABLE public.income_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  monthly_income numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.income_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own income settings" ON public.income_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own income settings" ON public.income_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own income settings" ON public.income_settings FOR UPDATE USING (auth.uid() = user_id);

-- Create budget_limits table
CREATE TABLE public.budget_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  category text NOT NULL,
  default_limit numeric DEFAULT 0,
  month_override numeric,
  override_month text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, category)
);

ALTER TABLE public.budget_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own budget limits" ON public.budget_limits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own budget limits" ON public.budget_limits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own budget limits" ON public.budget_limits FOR UPDATE USING (auth.uid() = user_id);

-- Create fixed_expenses table
CREATE TABLE public.fixed_expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  expense_name text NOT NULL,
  amount numeric NOT NULL,
  category text NOT NULL DEFAULT 'other',
  due_day integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.fixed_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own fixed expenses" ON public.fixed_expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own fixed expenses" ON public.fixed_expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own fixed expenses" ON public.fixed_expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own fixed expenses" ON public.fixed_expenses FOR DELETE USING (auth.uid() = user_id);

-- Create credit_cards table
CREATE TABLE public.credit_cards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  card_name text NOT NULL,
  credit_limit numeric NOT NULL DEFAULT 0,
  billing_day integer NOT NULL,
  due_day integer,
  interest_rate numeric,
  is_zero_apr boolean NOT NULL DEFAULT false,
  zero_apr_end_date date,
  target_utilization integer NOT NULL DEFAULT 30,
  current_outstanding numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credit cards" ON public.credit_cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own credit cards" ON public.credit_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own credit cards" ON public.credit_cards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own credit cards" ON public.credit_cards FOR DELETE USING (auth.uid() = user_id);
