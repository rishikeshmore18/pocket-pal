-- Create expense categories enum
CREATE TYPE expense_category AS ENUM ('rent', 'utilities', 'grocery', 'fast_food', 'transport', 'credit_card', 'entertainment', 'healthcare', 'shopping', 'other');

-- Create payment method enum
CREATE TYPE payment_method_type AS ENUM ('credit', 'debit', 'cash', 'bank_transfer', 'other');

-- Create account type enum
CREATE TYPE account_type AS ENUM ('checking', 'savings', 'both');

-- Create debt type enum
CREATE TYPE debt_type AS ENUM ('credit_card', 'student_loan', 'personal_loan', 'mortgage', 'other');

-- Create payment frequency enum
CREATE TYPE payment_frequency AS ENUM ('weekly', 'bi_weekly', 'monthly');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  theme_preference TEXT DEFAULT 'dark',
  currency_symbol TEXT DEFAULT '$',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create bank_accounts table
CREATE TABLE public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  account_type account_type NOT NULL DEFAULT 'checking',
  current_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create cash_account table
CREATE TABLE public.cash_account (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  current_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expense_name TEXT NOT NULL,
  category expense_category NOT NULL DEFAULT 'other',
  amount DECIMAL(12,2) NOT NULL,
  payment_method payment_method_type NOT NULL DEFAULT 'cash',
  notes TEXT,
  date_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create timesheets table
CREATE TABLE public.timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_name TEXT NOT NULL,
  hours_worked DECIMAL(5,2) NOT NULL,
  hourly_pay DECIMAL(10,2) NOT NULL,
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  day_of_week TEXT NOT NULL,
  time_from TIME,
  time_to TIME,
  payment_frequency payment_frequency DEFAULT 'bi_weekly',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create debts table
CREATE TABLE public.debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  debt_type debt_type NOT NULL DEFAULT 'other',
  debt_name TEXT NOT NULL,
  current_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create custom_categories table for user-defined categories
CREATE TABLE public.custom_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, category_name)
);

-- Create custom_payment_methods table
CREATE TABLE public.custom_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, method_name)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for bank_accounts
CREATE POLICY "Users can view their own bank accounts" ON public.bank_accounts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own bank accounts" ON public.bank_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own bank accounts" ON public.bank_accounts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own bank accounts" ON public.bank_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for cash_account
CREATE POLICY "Users can view their own cash account" ON public.cash_account
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own cash account" ON public.cash_account
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own cash account" ON public.cash_account
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for expenses
CREATE POLICY "Users can view their own expenses" ON public.expenses
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own expenses" ON public.expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own expenses" ON public.expenses
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own expenses" ON public.expenses
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for timesheets
CREATE POLICY "Users can view their own timesheets" ON public.timesheets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own timesheets" ON public.timesheets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own timesheets" ON public.timesheets
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own timesheets" ON public.timesheets
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for debts
CREATE POLICY "Users can view their own debts" ON public.debts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own debts" ON public.debts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own debts" ON public.debts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own debts" ON public.debts
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for custom_categories
CREATE POLICY "Users can view their own categories" ON public.custom_categories
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own categories" ON public.custom_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own categories" ON public.custom_categories
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for custom_payment_methods
CREATE POLICY "Users can view their own payment methods" ON public.custom_payment_methods
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own payment methods" ON public.custom_payment_methods
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own payment methods" ON public.custom_payment_methods
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to auto-create profile and cash account on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.cash_account (user_id, current_balance)
  VALUES (NEW.id, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_expenses_user_date ON public.expenses(user_id, date_time DESC);
CREATE INDEX idx_timesheets_user_date ON public.timesheets(user_id, work_date DESC);
CREATE INDEX idx_bank_accounts_user ON public.bank_accounts(user_id);
CREATE INDEX idx_debts_user ON public.debts(user_id);