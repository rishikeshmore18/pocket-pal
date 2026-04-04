-- Income settings
CREATE TABLE public.income_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_income DECIMAL(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.income_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own income" ON public.income_settings 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Budget limits per category
CREATE TABLE public.budget_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  default_limit DECIMAL(12,2) NOT NULL DEFAULT 0,
  month_override DECIMAL(12,2),
  override_month TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, category)
);
ALTER TABLE public.budget_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own budgets" ON public.budget_limits 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Fixed recurring bills
CREATE TABLE public.fixed_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expense_name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.fixed_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own fixed expenses" ON public.fixed_expenses 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Credit cards
CREATE TABLE public.credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_name TEXT NOT NULL,
  credit_limit DECIMAL(12,2) NOT NULL,
  billing_day INTEGER NOT NULL CHECK (billing_day BETWEEN 1 AND 31),
  due_day INTEGER CHECK (due_day BETWEEN 1 AND 31),
  interest_rate DECIMAL(5,2),
  is_zero_apr BOOLEAN DEFAULT false,
  zero_apr_end_date DATE,
  target_utilization INTEGER DEFAULT 30,
  current_outstanding DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cards" ON public.credit_cards 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Credit billing cycles
CREATE TABLE public.credit_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  cycle_start DATE NOT NULL,
  cycle_end DATE,
  statement_amount DECIMAL(12,2) DEFAULT 0,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  carry_forward DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.credit_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cycles" ON public.credit_cycles 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Extend existing expenses table
ALTER TABLE public.expenses 
  ADD COLUMN IF NOT EXISTS card_id UUID REFERENCES public.credit_cards(id),
  ADD COLUMN IF NOT EXISTS cycle_id UUID REFERENCES public.credit_cycles(id),
  ADD COLUMN IF NOT EXISTS is_fixed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;

-- Indexes
CREATE INDEX idx_fixed_expenses_user ON public.fixed_expenses(user_id);
CREATE INDEX idx_credit_cards_user ON public.credit_cards(user_id);
CREATE INDEX idx_credit_cycles_card ON public.credit_cycles(card_id);
CREATE INDEX idx_budget_limits_user ON public.budget_limits(user_id);
