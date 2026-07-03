
CREATE OR REPLACE FUNCTION public.handle_redirect_click(_link_id uuid, _user_id uuid, _is_bot boolean, _ua text, _routed_to text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'utc')::date;
  v_total INTEGER;
  v_adsterra INTEGER;
  v_user_clicks INTEGER;
  v_earnings NUMERIC(12,6);
BEGIN
  INSERT INTO public.clicks (link_id, ua, is_bot, routed_to, challenge_passed, bot_score)
  VALUES (_link_id, _ua, _is_bot, _routed_to, NOT _is_bot, CASE WHEN _is_bot THEN 100 ELSE 0 END);

  IF _is_bot THEN
    UPDATE public.links SET bot_clicks_count = COALESCE(bot_clicks_count, 0) + 1 WHERE id = _link_id;
    RETURN;
  END IF;

  UPDATE public.links SET clicks_count = COALESCE(clicks_count, 0) + 1 WHERE id = _link_id;
  UPDATE public.profiles SET clicks_used = COALESCE(clicks_used, 0) + 1 WHERE id = _user_id;

  INSERT INTO public.earnings_ledger (user_id, link_id, day, total_clicks, adsterra_clicks, user_clicks, earnings_usd)
  VALUES (_user_id, _link_id, v_today, 1, 0, 1, 0.00002)
  ON CONFLICT (user_id, link_id, day) DO UPDATE
    SET total_clicks = earnings_ledger.total_clicks + 1
  RETURNING total_clicks INTO v_total;

  -- 10% ads injection (1 in 10 clicks goes to our Adsterra)
  v_adsterra := FLOOR(v_total::numeric / 10);
  v_user_clicks := v_total - v_adsterra;
  v_earnings := v_user_clicks::numeric / 50000;

  UPDATE public.earnings_ledger
    SET adsterra_clicks = v_adsterra,
        user_clicks = v_user_clicks,
        earnings_usd = v_earnings
    WHERE user_id = _user_id AND link_id = _link_id AND day = v_today;

  -- Add per-click balance only for user-clicks (skip the 1-in-10 ad clicks)
  IF (v_total % 10) <> 0 THEN
    UPDATE public.profiles
      SET balance_available = balance_available + 0.00002
      WHERE id = _user_id;
  END IF;
END $function$;

CREATE OR REPLACE FUNCTION public.record_earning_click(_user_id uuid, _link_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'utc')::date;
  v_total INTEGER;
  v_adsterra INTEGER;
  v_user_clicks INTEGER;
  v_earnings NUMERIC(12,6);
BEGIN
  INSERT INTO public.earnings_ledger (user_id, link_id, day, total_clicks, adsterra_clicks, user_clicks, earnings_usd)
  VALUES (_user_id, _link_id, v_today, 1, 0, 1, 0.00002)
  ON CONFLICT (user_id, link_id, day) DO UPDATE
    SET total_clicks = earnings_ledger.total_clicks + 1
  RETURNING total_clicks INTO v_total;

  v_adsterra := FLOOR(v_total::numeric / 10);
  v_user_clicks := v_total - v_adsterra;
  v_earnings := v_user_clicks::numeric / 50000;

  UPDATE public.earnings_ledger
    SET adsterra_clicks = v_adsterra,
        user_clicks = v_user_clicks,
        earnings_usd = v_earnings
    WHERE user_id = _user_id AND link_id = _link_id AND day = v_today;

  IF (v_total % 10) <> 0 THEN
    UPDATE public.profiles
      SET balance_available = balance_available + 0.00002
      WHERE id = _user_id;
  END IF;
END;
$function$;
