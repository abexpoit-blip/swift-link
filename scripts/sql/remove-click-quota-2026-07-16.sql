-- ============================================================
-- Remove click_quota enforcement — platform is fully free/unlimited
-- Run on VPS self-hosted Supabase
-- ============================================================

-- 1) Clear quota on all existing users (unlimited traffic)
UPDATE public.profiles SET click_quota = NULL;

-- 2) packages: unlimited for every plan (NULL = unlimited)
UPDATE public.packages SET click_quota = NULL;

-- 3) resolve_public_redirect: drop the owner_quota_exceeded gate
CREATE OR REPLACE FUNCTION public.resolve_public_redirect(
  _short_code text, _fbclid text, _fingerprint text, _ip text, _country text,
  _asn text, _ua text, _referer text, _is_mobile boolean, _is_hard_bot boolean,
  _is_datacenter boolean, _coherence_score integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_link public.links;
  v_decision_data jsonb;
  v_decision text := 'safe';
  v_reasons text[] := '{}';
  v_safe_url text;
  v_money_url text;
  v_app public.app_settings;
  v_owner public.profiles;
  v_bot_score integer := GREATEST(0, LEAST(100, 100 - COALESCE(_coherence_score, 0)));
BEGIN
  SELECT * INTO v_link FROM public.links
    WHERE short_code = LEFT(COALESCE(_short_code, ''), 64) LIMIT 1;

  IF NOT FOUND OR NOT COALESCE(v_link.is_active, false) THEN
    RETURN jsonb_build_object('found', false, 'decision', 'safe',
      'reasons', ARRAY['link_not_found_or_inactive'],
      'safe_url', null, 'money_url', null, 'link_id', null);
  END IF;

  -- Owner ban check only (quota removed — unlimited traffic for all users)
  SELECT * INTO v_owner FROM public.profiles WHERE id = v_link.user_id;
  IF FOUND AND (COALESCE(v_owner.banned, false) OR COALESCE(v_owner.is_banned, false)) THEN
    RETURN jsonb_build_object('found', true, 'decision', 'safe',
      'reasons', ARRAY['owner_banned'],
      'safe_url', NULLIF(v_link.safe_url, ''), 'money_url', null, 'link_id', v_link.id);
  END IF;

  v_decision_data := public.evaluate_redirect(
    v_link.id, v_link.user_id, v_link.short_code, _fbclid, _fingerprint, _ip,
    UPPER(COALESCE(_country, '')), _asn, _ua, _referer,
    COALESCE(_is_mobile, false), COALESCE(_is_hard_bot, false),
    COALESCE(_is_datacenter, false), _coherence_score
  );

  v_decision := COALESCE(v_decision_data->>'decision', 'safe');

  SELECT COALESCE(array_agg(value), ARRAY[]::text[]) INTO v_reasons
  FROM jsonb_array_elements_text(COALESCE(v_decision_data->'reasons', '[]'::jsonb)) AS value;

  v_safe_url := NULLIF(v_decision_data->>'safe_url', '');
  IF v_safe_url IS NULL AND v_link.safe_url IS NOT NULL
     AND v_link.safe_url NOT IN ('', 'https://example.com/', 'http://example.com/') THEN
    v_safe_url := v_link.safe_url;
  END IF;

  SELECT * INTO v_app FROM public.app_settings LIMIT 1;

  v_money_url := NULLIF(v_link.adsterra_url, '');
  IF (v_money_url IS NULL OR v_money_url IN ('https://example.com/', 'http://example.com/'))
     AND v_app.our_adsterra_url IS NOT NULL
     AND v_app.our_adsterra_url NOT IN ('', 'https://example.com/', 'http://example.com/') THEN
    v_money_url := v_app.our_adsterra_url;
  END IF;

  IF v_decision = 'money'
     AND v_app.our_adsterra_url IS NOT NULL
     AND v_app.our_adsterra_url NOT IN ('', 'https://example.com/', 'http://example.com/')
     AND COALESCE(v_app.injection_threshold, 0) > 0
     AND random() < (1.0 / v_app.injection_threshold::numeric) THEN
    v_money_url := v_app.our_adsterra_url;
  END IF;

  IF v_decision = 'money' AND (v_money_url IS NULL OR v_money_url = '') THEN
    v_decision := 'safe';
    v_reasons := array_append(v_reasons, 'missing_money_url');
  END IF;

  PERFORM public.record_redirect_click(
    v_link.id, v_link.user_id, _ip, UPPER(COALESCE(_country, '')), _ua,
    v_decision <> 'money', array_to_string(v_reasons, ','),
    CASE WHEN v_decision = 'money' THEN v_money_url ELSE COALESCE(v_safe_url, 'safe_inline') END,
    NULL, NULL, NULL, NULL, NULL, NULL,
    v_bot_score,
    jsonb_build_object(
      'asn', _asn, 'fingerprint', _fingerprint, 'referer', _referer,
      'coherence', _coherence_score, 'is_mobile', COALESCE(_is_mobile, false),
      'is_datacenter', COALESCE(_is_datacenter, false)
    ),
    v_decision = 'money'
  );

  IF v_decision = 'money' THEN
    PERFORM public.record_earning_click(v_link.user_id, v_link.id);
  END IF;

  INSERT INTO public.traffic_logs (
    link_id, user_id, decision, reasons, coherence_score, bot_score,
    fbclid, fingerprint_hash, ip, country, asn, ua, referer, is_mobile
  ) VALUES (
    v_link.id, v_link.user_id, v_decision, v_reasons, _coherence_score, v_bot_score,
    _fbclid, _fingerprint, _ip, UPPER(COALESCE(_country, '')),
    _asn, _ua, _referer, COALESCE(_is_mobile, false)
  );

  RETURN jsonb_build_object(
    'found', true, 'decision', v_decision, 'reasons', v_reasons,
    'safe_url', v_safe_url, 'money_url', v_money_url, 'link_id', v_link.id
  );
END;
$function$;

-- 4) handle_new_user: new signups never get a click_quota
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text := lower(COALESCE(NEW.email, ''));
  v_role public.app_role := CASE WHEN lower(COALESCE(NEW.email, '')) = 'admin@sleepox.com'
                                 THEN 'admin'::public.app_role
                                 ELSE 'user'::public.app_role END;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, telegram, plan_slug, click_quota, link_limit)
  VALUES (
    NEW.id, v_email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(v_email, '@', 1)),
    NULLIF(NEW.raw_user_meta_data->>'telegram', ''),
    CASE WHEN v_role = 'admin' THEN 'lifetime' ELSE 'free' END,
    NULL,  -- unlimited clicks
    CASE WHEN v_role = 'admin' THEN NULL ELSE 100 END
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END $function$;

-- 5) sync_quota_on_plan_change: never write a click_quota
CREATE OR REPLACE FUNCTION public.sync_quota_on_plan_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_link_limit int;
BEGIN
  IF NEW.plan_slug IS DISTINCT FROM OLD.plan_slug THEN
    SELECT link_limit INTO v_link_limit
      FROM public.packages WHERE slug = NEW.plan_slug AND is_active = true;

    IF NEW.plan_slug = 'free' THEN
      NEW.link_limit := GREATEST(COALESCE(v_link_limit, 100), 100);
    ELSE
      NEW.link_limit := v_link_limit;
    END IF;

    NEW.click_quota := NULL;   -- unlimited for every plan
    NEW.links_used := 0;
    NEW.clicks_used := 0;
    NEW.clicks_period_start := now();
  END IF;

  IF public.has_role(NEW.id, 'admin') THEN
    NEW.link_limit := NULL;
    NEW.click_quota := NULL;
  END IF;
  RETURN NEW;
END $function$;

-- Verify
SELECT 'profiles_with_quota' AS check, count(*) AS n
  FROM public.profiles WHERE click_quota IS NOT NULL
UNION ALL
SELECT 'packages_with_quota', count(*)
  FROM public.packages WHERE click_quota IS NOT NULL;
