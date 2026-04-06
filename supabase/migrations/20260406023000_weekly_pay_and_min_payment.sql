ALTER TABLE public.credit_cards 
  ADD COLUMN IF NOT EXISTS minimum_payment_mode BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS minimum_payment DECIMAL(12,2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.pay_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  pay_frequency TEXT NOT NULL DEFAULT 'weekly',
  pay_day_of_week INTEGER DEFAULT 4,
  pay_day_of_month INTEGER,
  last_pay_date DATE,
  pay_amount DECIMAL(12,2),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.pay_schedule ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pay_schedule' AND policyname = 'Users manage own pay schedule'
  ) THEN
    CREATE POLICY "Users manage own pay schedule" ON public.pay_schedule
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.card_payment_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  due_day INTEGER NOT NULL,
  custom_amount DECIMAL(12,2),
  override_month TEXT,
  is_paid BOOLEAN DEFAULT false,
  paid_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, card_id)
);

ALTER TABLE public.card_payment_schedule ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'card_payment_schedule' AND policyname = 'Users manage own card schedule'
  ) THEN
    CREATE POLICY "Users manage own card schedule" ON public.card_payment_schedule
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;