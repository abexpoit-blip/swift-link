-- ============================================================================
-- adspx :: FINAL FILTER PARITY  (reference repo model)
-- Date: 2026-08-06
--
-- কেন দরকার:
--   24h audit-এ এখনও এই reason গুলো BLOCK করছিল —
--     learned_bot (100), obs_no_client_hints (4), bot_country (3)
--   মানে soft-filter-relax version-টাই DB-তে live ছিল, crawler-only version নয়।
--
-- এই migration চালালে ব্লক করার নিয়ম মাত্র ৪টা থাকবে (reference repo-এর মতো):
--   1. hardcoded_crawler  -> crawler UA regex (server.ts থেকে _is_hard_bot)
--   2. meta_asn           -> AS32934 / 63293 / 54115 / 149642 / 394192
--   3. datacenter_asn     -> AWS/GCP/Azure/OVH/DO/Hetzner ... (real user আসে না)
--   4. blacklist          -> admin-এর manual block
--
-- সম্পূর্ণ বাদ (আর কোনোদিন decision বদলাবে না, শুধু log হবে):
--   learned_bot, bot_country, velocity_lock, fbclid_reused, referer_mismatch,
--   low_coherence, chrome_no_hints, cold_desktop, reviewer_geo, geo_mismatch,
--   desktop_blocked, campaign_launch_window
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
  v_app public.app_settings;
  v_monitor boolean := false;
  v_asn_digits text := regexp_replace(COALESCE(_asn, ''), '\D', '', 'g');
  v_meta_asn boolean := false;
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

  -- ===================== HARD BLOCK 1 : crawler UA ==========================
  IF COALESCE(_is_hard_bot, false) THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'hardcoded_crawler');
  END IF;

  -- ===================== HARD BLOCK 2 : Meta ASN ============================
  v_meta_asn := v_asn_digits IN ('32934', '63293', '54115', '149642', '394192');
  IF v_meta_asn THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'meta_asn');
  END IF;

  -- ===================== HARD BLOCK 3 : datacenter ASN ======================
  -- AWS / GCP / Azure / OVH / DigitalOcean / Hetzner / Vultr ...
  -- মোবাইল carrier (Robi, GP, Airtel, Banglalink) এই তালিকায় নেই -> real user safe.
  IF COALESCE(_is_datacenter, false) AND NOT v_meta_asn THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'datacenter_asn');
  END IF;

  -- ===================== HARD BLOCK 4 : manual blacklist ====================
  IF _ip IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.ip_blacklist
     WHERE (ip = _ip OR fingerprint_hash = _fingerprint)
       AND (user_id = _user_id OR user_id IS NULL)
  ) THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'blacklist');
  END IF;

  -- ==========================================================================
  -- OBSERVE ONLY — কখনো real user block করবে না
  -- ==========================================================================
  IF _coherence_score IS NOT NULL AND _coherence_score < 20 THEN
    v_observed := array_append(v_observed, 'obs_low_coherence');
  END IF;
  IF COALESCE(_chrome_no_hints, false) THEN
    v_observed := array_append(v_observed, 'obs_no_client_hints');
  END IF;
  IF NOT COALESCE(_country_confident, true) THEN
    v_observed := array_append(v_observed, 'obs_country_unknown');
  END IF;
  IF COALESCE(_known_human, false) THEN
    v_observed := array_append(v_observed, 'obs_known_human');
  END IF;

  -- fbclid counter: analytics only, never blocks
  IF _fbclid IS NOT NULL AND _fbclid <> '' THEN
    INSERT INTO public.fbclid_tracking (fbclid, link_id, hit_count)
    VALUES (_fbclid, _link_id, 1)
    ON CONFLICT (fbclid, link_id) DO UPDATE
      SET hit_count = fbclid_tracking.hit_count + 1,
          last_seen = now(),
          flagged_bot = false;
  END IF;

  -- fingerprint stats: auto_blocked আর কখনো true হবে না (learned_bot মৃত)
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

  -- velocity table: শুধু stats, blocked আর সেট হবে না
  IF _fingerprint IS NOT NULL AND _fingerprint <> '' THEN
    INSERT INTO public.velocity_tracking (fingerprint_hash, short_codes, window_start, last_seen)
    VALUES (_fingerprint, ARRAY[_short_code], now(), now())
    ON CONFLICT (fingerprint_hash) DO UPDATE
      SET short_codes = CASE
            WHEN velocity_tracking.window_start < now() - interval '1 hour' THEN ARRAY[_short_code]
            WHEN _short_code = ANY(velocity_tracking.short_codes) THEN velocity_tracking.short_codes
            ELSE array_append(velocity_tracking.short_codes, _short_code) END,
          window_start = CASE WHEN velocity_tracking.window_start < now() - interval '1 hour'
                              THEN now() ELSE velocity_tracking.window_start END,
          last_seen = now(),
          blocked = false;
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
-- পুরনো poisoned state পরিষ্কার
-- ---------------------------------------------------------------------------
UPDATE public.bot_fingerprints  SET auto_blocked = false WHERE auto_blocked = true;
UPDATE public.velocity_tracking SET blocked      = false WHERE blocked      = true;
UPDATE public.fbclid_tracking   SET flagged_bot  = false WHERE flagged_bot  = true;

-- reviewer-geo country list খালি (bot_country চিরতরে বন্ধ)
UPDATE public.app_settings SET bot_countries = '{}';

-- per-link restrictive setting নিষ্ক্রিয়
UPDATE public.cloaking_settings
   SET campaign_launch_mode = false,
       block_desktop        = false,
       allowed_countries    = '{}',
       coherence_threshold  = 0,
       fbclid_max_hits      = 9999;

COMMIT;

-- PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
