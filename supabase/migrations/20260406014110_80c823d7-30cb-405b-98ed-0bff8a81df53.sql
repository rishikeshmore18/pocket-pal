
-- Add missing columns to expenses table
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS card_id UUID REFERENCES public.credit_cards(id);
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT false;

-- Index for card_id
CREATE INDEX IF NOT EXISTS idx_expenses_card_id ON public.expenses(card_id);

-- Create credit_cycles table
CREATE TABLE IF NOT EXISTS public.credit_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_cycles_user_id ON public.credit_cycles(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_cycles_card_id ON public.credit_cycles(card_id);

ALTER TABLE public.credit_cycles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'credit_cycles' AND policyname = 'Users can view their own credit cycles') THEN
    CREATE POLICY "Users can view their own credit cycles" ON public.credit_cycles FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'credit_cycles' AND policyname = 'Users can insert their own credit cycles') THEN
    CREATE POLICY "Users can insert their own credit cycles" ON public.credit_cycles FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'credit_cycles' AND policyname = 'Users can update their own credit cycles') THEN
    CREATE POLICY "Users can update their own credit cycles" ON public.credit_cycles FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'credit_cycles' AND policyname = 'Users can delete their own credit cycles') THEN
    CREATE POLICY "Users can delete their own credit cycles" ON public.credit_cycles FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;
