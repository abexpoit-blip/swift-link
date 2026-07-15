CREATE OR REPLACE FUNCTION public.evaluate_redirect(
  _link_id uuid, _user_id uuid, _short_code text, _fbclid text,
  _fingerprint text, _ip text, _country text, _asn text, _ua text,
  _referer text, _is_mobile boolean, _is_hard_bot boolean,
  _is_datacenter boolean, _coherence_score integer
) RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  cfg public.cloaking_settings;
  v_decision text := 'money';
  v_reasons text[] := '{}';
  v_safe_url text;
  v_fbclid_row public.fbclid_tracking;
  v_velocity public.velocity_tracking;
  v_pool text[];
  v_bot_countries text[];
  v_is_bot boolean := false;
  v_mobile boolean := COALESCE(_is_mobile, false);
  v_threshold integer;
  v_app public.app_settings;
  v_monitor boolean := false;
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

  IF _ip IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.ip_whitelist
     WHERE (ip = _ip OR fingerprint_hash = _fingerprint)
       AND (user_id = _user_id OR user_id IS NULL)
  ) THEN
    RETURN jsonb_build_object('decision','money','reasons',ARRAY['whitelist'],'safe_url',null,'coherence',_coherence_score);
  END IF;

  IF NOT v_mobile AND v_bot_countries IS NOT NULL AND COALESCE(_country,'') <> ''
     AND _country = ANY(v_bot_countries) THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'bot_country');
  END IF;

  IF _fingerprint IS NOT NULL AND _fingerprint <> ''
     AND EXISTS (
       SELECT 1 FROM public.bot_fingerprints
        WHERE fingerprint_hash = _fingerprint
          AND auto_blocked = true
          AND bot_hits >= 10
          AND bot_hits::float / GREATEST(hit_count, 1) >= 0.7
     ) THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'learned_bot');
  END IF;

  IF _ip IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.ip_blacklist
     WHERE (ip = _ip OR fingerprint_hash = _fingerprint)
       AND (user_id = _user_id OR user_id IS NULL)
  ) THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'blacklist');
  END IF;

  IF COALESCE(_is_hard_bot, false) THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'hardcoded_crawler');
  END IF;

  IF COALESCE(_is_datacenter, false) AND NOT v_mobile THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'datacenter_asn');
  END IF;

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
                         WHEN array_length(array_append(velocity_tracking.short_codes, _short_code), 1) >= 3 THEN true
                         ELSE velocity_tracking.blocked END
    RETURNING * INTO v_velocity;
    IF v_velocity.blocked THEN
      v_decision := 'safe'; v_reasons := array_append(v_reasons, 'velocity_lock');
    END IF;
  END IF;

  IF NOT v_mobile AND _fbclid IS NOT NULL AND _fbclid <> ''
     AND _referer IS NOT NULL AND _referer <> ''
     AND _referer NOT ILIKE '%fban%' AND _referer NOT ILIKE '%fbav%'
     AND _referer NOT ILIKE '%facebook.%' AND _referer NOT ILIKE '%instagram.%' THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'referer_mismatch');
  END IF;

  IF cfg.block_desktop AND NOT v_mobile THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'desktop_blocked');
  END IF;

  IF array_length(cfg.allowed_countries, 1) IS NOT NULL AND COALESCE(_country, '') <> ''
     AND NOT (_country = ANY(cfg.allowed_countries)) THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'geo_mismatch');
  END IF;

  IF _fbclid IS NOT NULL AND _fbclid <> '' THEN
    INSERT INTO public.fbclid_tracking (fbclid, link_id, hit_count)
    VALUES (_fbclid, _link_id, 1)
    ON CONFLICT (fbclid, link_id) DO UPDATE
      SET hit_count = fbclid_tracking.hit_count + 1,
          last_seen = now(),
          flagged_bot = CASE WHEN fbclid_tracking.hit_count + 1 > cfg.fbclid_max_hits
                              AND fbclid_tracking.last_seen > now() - interval '2 hours'
                             THEN true ELSE fbclid_tracking.flagged_bot END
    RETURNING * INTO v_fbclid_row;
    IF v_fbclid_row.flagged_bot AND NOT v_mobile THEN
      v_decision := 'safe'; v_reasons := array_append(v_reasons, 'fbclid_reused');
    END IF;
  END IF;

  IF cfg.campaign_launch_mode AND cfg.launched_at IS NOT NULL
     AND cfg.launched_at + (cfg.launch_window_hours || ' hours')::interval > now() THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'campaign_launch_window');
  END IF;

  v_threshold := CASE WHEN v_mobile THEN 10 ELSE COALESCE(cfg.coherence_threshold, 35) END;
  IF _coherence_score IS NOT NULL AND _coherence_score < v_threshold THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'low_coherence');
  END IF;

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

CREATE OR REPLACE FUNCTION public.record_bot_fingerprint(
  _hash text, _is_bot boolean, _ip text, _ua text, _country text,
  _block_threshold integer DEFAULT 10
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_blocked BOOLEAN;
BEGIN
  INSERT INTO public.bot_fingerprints (fingerprint_hash, hit_count, bot_hits, sample_ip, sample_ua, sample_country, last_seen)
  VALUES (_hash, 1, CASE WHEN _is_bot THEN 1 ELSE 0 END, _ip, _ua, _country, now())
  ON CONFLICT (fingerprint_hash) DO UPDATE
    SET hit_count = bot_fingerprints.hit_count + 1,
        bot_hits  = bot_fingerprints.bot_hits + CASE WHEN _is_bot THEN 1 ELSE 0 END,
        last_seen = now(),
        auto_blocked = CASE
          WHEN bot_fingerprints.auto_blocked THEN true
          WHEN bot_fingerprints.bot_hits + CASE WHEN _is_bot THEN 1 ELSE 0 END >= GREATEST(_block_threshold, 10)
            AND (bot_fingerprints.bot_hits + CASE WHEN _is_bot THEN 1 ELSE 0 END)::float
                / GREATEST(bot_fingerprints.hit_count + 1, 1) >= 0.7
          THEN true
          ELSE false
        END
  RETURNING auto_blocked INTO v_blocked;
  RETURN v_blocked;
END $function$;

UPDATE public.bot_fingerprints
   SET auto_blocked = false
 WHERE auto_blocked = true
   AND (
     bot_hits < 10
     OR bot_hits::float / GREATEST(hit_count, 1) < 0.7
   );