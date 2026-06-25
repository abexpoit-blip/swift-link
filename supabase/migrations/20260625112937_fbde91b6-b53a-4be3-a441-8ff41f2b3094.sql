
-- Earnings ledger: per-link daily aggregate of clicks, Adsterra portion, user earnings
CREATE TABLE public.earnings_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  link_id UUID REFERENCES public.links(id) ON DELETE SET NULL,
  day DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  adsterra_clicks INTEGER NOT NULL DEFAULT 0,
  user_clicks INTEGER NOT NULL DEFAULT 0,
  earnings_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, link_id, day)
);

GRANT SELECT, INSERT, UPDATE ON public.earnings_ledger TO authenticated;
GRANT ALL ON public.earnings_ledger TO service_role;
ALTER TABLE public.earnings_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own earnings" ON public.earnings_ledger
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all earnings" ON public.earnings_ledger
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER earnings_ledger_touch BEFORE UPDATE ON public.earnings_ledger
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_earnings_user_day ON public.earnings_ledger(user_id, day DESC);

-- Withdrawals: user crypto cashout requests (USDT TRC20/BEP20), min $25
CREATE TABLE public.withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_usd NUMERIC(12,2) NOT NULL CHECK (amount_usd >= 25),
  network TEXT NOT NULL CHECK (network IN ('USDT_TRC20','USDT_BEP20')),
  wallet_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','rejected')),
  tx_hash TEXT,
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

GRANT SELECT, INSERT ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own withdrawals" ON public.withdrawals
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own withdrawals" ON public.withdrawals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all withdrawals" ON public.withdrawals
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update withdrawals" ON public.withdrawals
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER withdrawals_touch BEFORE UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_withdrawals_user ON public.withdrawals(user_id, created_at DESC);
CREATE INDEX idx_withdrawals_status ON public.withdrawals(status);

-- Wallet book: saved USDT wallets per user (reuse in withdrawal form)
CREATE TABLE public.user_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  network TEXT NOT NULL CHECK (network IN ('USDT_TRC20','USDT_BEP20')),
  address TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, network, address)
);

GRANT SELECT, INSERT, DELETE ON public.user_wallets TO authenticated;
GRANT ALL ON public.user_wallets TO service_role;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own wallets" ON public.user_wallets
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Profile balance fields for available/withdrawn totals
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS balance_available NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_withdrawn NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Function: record a human click into earnings ledger
-- Rule: $1 per 100,000 clicks, 200 of every 5000 clicks attributed to Adsterra
CREATE OR REPLACE FUNCTION public.record_earning_click(_user_id UUID, _link_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'utc')::date;
  v_total INTEGER;
  v_adsterra INTEGER;
  v_user_clicks INTEGER;
  v_earnings NUMERIC(12,6);
BEGIN
  INSERT INTO public.earnings_ledger (user_id, link_id, day, total_clicks, adsterra_clicks, user_clicks, earnings_usd)
  VALUES (_user_id, _link_id, v_today, 1, 0, 1, 0.00001)
  ON CONFLICT (user_id, link_id, day) DO UPDATE
    SET total_clicks = earnings_ledger.total_clicks + 1
  RETURNING total_clicks INTO v_total;

  -- Adsterra portion: floor(total/25) gives 200 per 5000 (4%)
  v_adsterra := FLOOR(v_total::numeric / 25);
  v_user_clicks := v_total - v_adsterra;
  v_earnings := v_user_clicks::numeric / 100000;

  UPDATE public.earnings_ledger
    SET adsterra_clicks = v_adsterra,
        user_clicks = v_user_clicks,
        earnings_usd = v_earnings
    WHERE user_id = _user_id AND link_id = _link_id AND day = v_today;

  -- Increment running available balance only when this click crosses into user-share
  IF (v_total % 25) <> 0 THEN
    UPDATE public.profiles
      SET balance_available = balance_available + 0.00001
      WHERE id = _user_id;
  END IF;
END;
$$;
