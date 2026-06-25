
-- ============== INDEXES for hot paths ==============
CREATE INDEX IF NOT EXISTS idx_links_short_code ON public.links(short_code);
CREATE INDEX IF NOT EXISTS idx_links_user ON public.links(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clicks_link ON public.clicks(link_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_earnings_user ON public.earnings_ledger(user_id, day DESC);
CREATE INDEX IF NOT EXISTS idx_earnings_user_link_day ON public.earnings_ledger(user_id, link_id, day);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawals(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON public.withdrawals(user_id, created_at DESC);

-- ============== Single-roundtrip redirect RPC ==============
CREATE OR REPLACE FUNCTION public.handle_redirect_click(
  _link_id UUID,
  _user_id UUID,
  _is_bot BOOLEAN,
  _ua TEXT,
  _routed_to TEXT
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'utc')::date;
  v_total INTEGER;
  v_adsterra INTEGER;
  v_user_clicks INTEGER;
  v_earnings NUMERIC(12,6);
BEGIN
  -- Record click
  INSERT INTO public.clicks (link_id, ua, is_bot, routed_to, challenge_passed, bot_score)
  VALUES (_link_id, _ua, _is_bot, _routed_to, NOT _is_bot, CASE WHEN _is_bot THEN 100 ELSE 0 END);

  IF _is_bot THEN
    UPDATE public.links SET bot_clicks_count = COALESCE(bot_clicks_count, 0) + 1 WHERE id = _link_id;
    RETURN;
  END IF;

  -- Real human click: update link + profile counters
  UPDATE public.links SET clicks_count = COALESCE(clicks_count, 0) + 1 WHERE id = _link_id;
  UPDATE public.profiles SET clicks_used = COALESCE(clicks_used, 0) + 1 WHERE id = _user_id;

  -- Upsert earnings row for today
  INSERT INTO public.earnings_ledger (user_id, link_id, day, total_clicks, adsterra_clicks, user_clicks, earnings_usd)
  VALUES (_user_id, _link_id, v_today, 1, 0, 1, 0.00001)
  ON CONFLICT (user_id, link_id, day) DO UPDATE
    SET total_clicks = earnings_ledger.total_clicks + 1
  RETURNING total_clicks INTO v_total;

  v_adsterra := FLOOR(v_total::numeric / 25);
  v_user_clicks := v_total - v_adsterra;
  v_earnings := v_user_clicks::numeric / 100000;

  UPDATE public.earnings_ledger
    SET adsterra_clicks = v_adsterra,
        user_clicks = v_user_clicks,
        earnings_usd = v_earnings
    WHERE user_id = _user_id AND link_id = _link_id AND day = v_today;

  -- Crossing into a user-share click (not the 25th)
  IF (v_total % 25) <> 0 THEN
    UPDATE public.profiles
      SET balance_available = balance_available + 0.00001
      WHERE id = _user_id;
  END IF;
END $$;

-- ============== Withdrawal audit + admin comment ==============
ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admin_comment TEXT,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.withdrawal_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_id UUID NOT NULL REFERENCES public.withdrawals(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email TEXT,
  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_audit_w ON public.withdrawal_audit(withdrawal_id, created_at DESC);

GRANT SELECT, INSERT ON public.withdrawal_audit TO authenticated;
GRANT ALL ON public.withdrawal_audit TO service_role;

ALTER TABLE public.withdrawal_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit" ON public.withdrawal_audit
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert audit" ON public.withdrawal_audit
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND admin_id = auth.uid());

-- Bulk mark messages as read in one roundtrip
CREATE OR REPLACE FUNCTION public.mark_messages_read(_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_count INTEGER;
BEGIN
  INSERT INTO public.message_reads (message_id, user_id)
  SELECT unnest(_ids), auth.uid()
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;
