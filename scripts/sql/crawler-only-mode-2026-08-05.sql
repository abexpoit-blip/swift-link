-- ============================================================================
-- adspx :: CRAWLER-ONLY MODE
-- Date: 2026-08-05
--
-- GOAL: শুধুমাত্র Facebook/Meta + search-engine crawler (UA / ASN / IP) block হবে।
--       REAL traffic (desktop, laptop, mobile, in-app, VPN, NAT, office IP,
--       reload, double-click, repeat click) কখনোই safe page-এ যাবে না।
--
-- BLOCKS (hard, only these):
--   1. _is_hard_bot  -> crawler UA regex (facebookexternalhit, meta-externalagent,
--                       Meta-ExternalFetcher, facebookcatalog, facebot, bingbot,
--                       googlebot, ahrefs, semrush, headless, curl, python ...)
--   2. Meta ASN 32934 / 63293 / 54115  (Facebook datacenter)
--   3. ip_blacklist   -> manual admin block
--   4. link inactive / missing money_url (handled in resolve_public_redirect)
--
-- REMOVED / DISABLED (এগুলোই real traffic loss করত):
--   bot_country, learned_bot, velocity_lock, fbclid_reused, referer_mismatch,
--   low_coherence, cold_desktop, reviewer_geo, campaign_launch_window,
--   datacenter_asn (non-Meta), geo_mismatch, desktop_blocked
--   -> এগুলো এখনও LOG হয় (observability), কিন্তু কোনো decision বদলায় না।
--
-- Signature unchanged -> resolve_public_redirect / server.ts কোনো পরিবর্তন লাগে না।
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.evaluate_redirect(
  _link_id uuid, _user_id uuid, _short_code text, _fbclid text, _fingerprint text,
  _ip text, _country text, _asn text, _ua text, _referer text,
  _is_mobile boolean, _is_hard_bot boolean, _is_datacenter boolean, _coherence_score integer,
  _known_human boolean DEFAULT false,
  _country_confident boolean DEFAULT true,
  _chrome_no_hints boolean DEFAULT false,
  _asn_unknown boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  cfg public.cloaking_settings;
  v_decision text := 'money';
  v_reasons text[] := '{}';
  v_observed text[] := '{}';       -- logged only, never blocks
  v_safe_url text;
  v_pool text[];
  v_mobile boolean := COALESCE(_is_mobile, false);
  v_app public.app_settings;
  v_monitor boolean := false;
  v_asn_digits text := regexp_replace(COALESCE(_asn, ''), '\D', '', 'g');
  v_meta_asn boolean := false;
  v_ua_l text := lower(COALESCE(_ua, ''));
BEGIN
  SELECT * INTO cfg FROM public.cloaking_settings WHERE link_id = _link_id;
  IF NOT FOUND THEN
    INSERT INTO public.cloaking_settings (link_id, coherence_threshold)
      VALUES (_link_id, 0) ON CONFLICT (link_id) DO NOTHING;
    SELECT * INTO cfg FROM public.cloaking_settings WHERE link_id = _link_id;
  END IF;

  SELECT * INTO v_app FROM public.app_settings LIMIT 1;
  v_monitor := COALESCE(v_app.monitor_mode, false)
               AND (v_app.monitor_mode_until IS NULL OR v_app.monitor_mode_until > now());

  -- ---------------------------------------------------------------- whitelist
  IF _ip IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.ip_whitelist
     WHERE (ip = _ip OR fingerprint_hash = _fingerprint)
       AND (user_id = _user_id OR user_id IS NULL)
  ) THEN
    RETURN jsonb_build_object('decision','money','reasons',ARRAY['whitelist'],
                              'safe_url',null,'coherence',_coherence_score);
  END IF;

  -- ============================= HARD BLOCK 1 : crawler UA ==================
  IF COALESCE(_is_hard_bot, false) THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'hardcoded_crawler');
  END IF;

  -- ============================= HARD BLOCK 2 : Meta ASN ====================
  v_meta_asn := v_asn_digits IN ('32934', '63293', '54115');
  IF v_meta_asn THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'meta_asn');
  END IF;

  -- ============================= HARD BLOCK 3 : manual blacklist ============
  IF _ip IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.ip_blacklist
     WHERE (ip = _ip OR fingerprint_hash = _fingerprint)
       AND (user_id = _user_id OR user_id IS NULL)
  ) THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'blacklist');
  END IF;

  -- ==========================================================================
  -- OBSERVE ONLY — এগুলো আর কোনোদিন real user block করবে না।
  -- ==========================================================================
  IF COALESCE(_is_datacenter, false) AND NOT v_meta_asn THEN
    v_observed := array_append(v_observed, 'obs_datacenter');
  END IF;
  IF _coherence_score IS NOT NULL AND _coherence_score < 20 THEN
    v_observed := array_append(v_observed, 'obs_low_coherence');
  END IF;
  IF COALESCE(_chrome_no_hints, false) THEN
    v_observed := array_append(v_observed, 'obs_no_client_hints');
  END IF;
  IF NOT COALESCE(_country_confident, true) THEN
    v_observed := array_append(v_observed, 'obs_country_unknown');
  END IF;
  IF v_ua_l = '' THEN
    v_observed := array_append(v_observed, 'obs_empty_ua');
  END IF;

  -- fbclid counter: শুধু analytics-এর জন্য রাখা, block করে না
  IF _fbclid IS NOT NULL AND _fbclid <> '' THEN
    INSERT INTO public.fbclid_tracking (fbclid, link_id, hit_count)
    VALUES (_fbclid, _link_id, 1)
    ON CONFLICT (fbclid, link_id) DO UPDATE
      SET hit_count = fbclid_tracking.hit_count + 1,
          last_seen = now(),
          flagged_bot = false;
  END IF;

  -- fingerprint stats: hit count রাখি, কিন্তু auto_blocked আর কখনো true হবে না
  IF _fingerprint IS NOT NULL AND _fingerprint <> '' THEN
    INSERT INTO public.bot_fingerprints
      (fingerprint_hash, hit_count, bot_hits, sample_ip, sample_ua, sample_country, last_seen)
    VALUES (_fingerprint, 1, CASE WHEN v_decision <> 'money' THEN 1 ELSE 0 END,
            _ip, _ua, _country, now())
    ON CONFLICT (fingerprint_hash) DO UPDATE
      SET hit_count = bot_fingerprints.hit_count + 1,
          bot_hits  = bot_fingerprints.bot_hits + CASE WHEN v_decision <> 'money' THEN 1 ELSE 0 END,
          last_seen = now(),
          sample_ip = _ip, sample_ua = _ua, sample_country = _country,
          auto_blocked = false;
  END IF;

  -- safe page pool
  v_pool := cfg.safe_page_pool;
  IF array_length(v_pool, 1) IS NOT NULL THEN
    v_safe_url := v_pool[1 + floor(random() * array_length(v_pool, 1))::int];
  END IF;

  IF v_monitor AND v_decision = 'safe' AND NOT COALESCE(_is_hard_bot, false) THEN
    v_reasons := array_append(v_reasons, 'monitor_mode_bypass');
    v_decision := 'money';
  END IF;

  RETURN jsonb_build_object(
    'decision', v_decision,
    'reasons', v_reasons || v_observed,
    'safe_url', v_safe_url,
    'coherence', _coherence_score
  );
END;
$function$;

-- ---------------------------------------------------------------------------
-- Cleanup: পুরনো poisoned state মুছে ফেলা
-- ---------------------------------------------------------------------------
UPDATE public.bot_fingerprints SET auto_blocked = false WHERE auto_blocked = true;
UPDATE public.velocity_tracking SET blocked = false WHERE blocked = true;
UPDATE public.fbclid_tracking SET flagged_bot = false WHERE flagged_bot = true;

-- reviewer-geo country list খালি করা (real user ওখানেও থাকে)
UPDATE public.app_settings SET bot_countries = '{}';

-- per-link restrictive setting নিষ্ক্রিয়
UPDATE public.cloaking_settings
   SET campaign_launch_mode = false,
       block_desktop        = false,
       allowed_countries    = '{}',
       coherence_threshold  = 0,
       fbclid_max_hits      = 9999
 WHERE campaign_launch_mode OR block_desktop
    OR array_length(allowed_countries,1) IS NOT NULL
    OR coherence_threshold > 0
    OR fbclid_max_hits < 9999;

COMMIT;

-- ============================================================================
-- VERIFY (আলাদা করে চালান)
-- ============================================================================
-- SELECT decision, unnest(reasons) AS reason, count(*)
--   FROM public.traffic_logs WHERE created_at > now() - interval '1 hour'
--  GROUP BY 1,2 ORDER BY 3 DESC;
--
-- SELECT count(*) FILTER (WHERE decision='money') AS delivered,
--        count(*) FILTER (WHERE decision='safe')  AS crawler_safe,
--        round(100.0*count(*) FILTER (WHERE decision='money')/nullif(count(*),0),2) AS pct
--   FROM public.traffic_logs
--  WHERE created_at > now() - interval '1 hour'
--    AND ua NOT ILIKE '%facebookexternalhit%'
--    AND ua NOT ILIKE '%meta-external%';
