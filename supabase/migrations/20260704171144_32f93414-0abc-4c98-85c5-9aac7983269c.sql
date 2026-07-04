
-- Undo: launch shield off by default
ALTER TABLE public.cloaking_settings ALTER COLUMN campaign_launch_mode SET DEFAULT false;

-- Turn off shield on ALL existing links (including the ones we just backfilled)
UPDATE public.cloaking_settings
   SET campaign_launch_mode = false,
       launched_at = NULL;

-- Remove the auto-stamp trigger (no longer needed)
DROP TRIGGER IF EXISTS trg_stamp_launched_at ON public.cloaking_settings;
DROP FUNCTION IF EXISTS public.stamp_launched_at();

-- Upgrade evaluate_redirect: auto-learn bot fingerprints inside the pipeline.
-- Any fingerprint that gets flagged 3+ times → auto-blocked on every future hit.
CREATE OR REPLACE FUNCTION public.evaluate_redirect(
  _link_id uuid, _user_id uuid, _short_code text, _fbclid text, _fingerprint text,
  _ip text, _country text, _asn text, _ua text, _referer text,
  _is_mobile boolean, _is_hard_bot boolean, _is_datacenter boolean, _coherence_score int
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cfg public.cloaking_settings;
  v_decision text := 'money';
  v_reasons text[] := '{}';
  v_safe_url text;
  v_fbclid_row public.fbclid_tracking;
  v_velocity public.velocity_tracking;
  v_pool text[];
  v_auto_blocked boolean := false;
  v_is_bot boolean := false;
BEGIN
  SELECT * INTO cfg FROM public.cloaking_settings WHERE link_id = _link_id;
  IF NOT FOUND THEN
    INSERT INTO public.cloaking_settings (link_id) VALUES (_link_id) ON CONFLICT (link_id) DO NOTHING;
    SELECT * INTO cfg FROM public.cloaking_settings WHERE link_id = _link_id;
  END IF;

  -- Whitelist first
  IF _ip IS NOT NULL AND EXISTS (SELECT 1 FROM public.ip_whitelist WHERE (ip = _ip OR fingerprint_hash = _fingerprint) AND (user_id = _user_id OR user_id IS NULL)) THEN
    RETURN jsonb_build_object('decision','money','reasons',ARRAY['whitelist'],'safe_url',null);
  END IF;

  -- Auto-learned blocked fingerprint (from prior bot hits)
  IF _fingerprint IS NOT NULL AND _fingerprint <> '' AND EXISTS (
    SELECT 1 FROM public.bot_fingerprints WHERE fingerprint_hash = _fingerprint AND auto_blocked = true
  ) THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'learned_bot');
  END IF;

  IF _ip IS NOT NULL AND EXISTS (SELECT 1 FROM public.ip_blacklist WHERE (ip = _ip OR fingerprint_hash = _fingerprint) AND (user_id = _user_id OR user_id IS NULL)) THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'blacklist');
  END IF;

  IF _is_hard_bot THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'hardcoded_crawler');
  END IF;

  IF _is_datacenter AND NOT _is_mobile THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'datacenter_asn');
  END IF;

  IF _fingerprint IS NOT NULL AND _fingerprint <> '' THEN
    INSERT INTO public.velocity_tracking (fingerprint_hash, short_codes, window_start, last_seen)
    VALUES (_fingerprint, ARRAY[_short_code], now(), now())
    ON CONFLICT (fingerprint_hash) DO UPDATE
      SET short_codes = CASE
        WHEN velocity_tracking.window_start < now() - interval '1 hour' THEN ARRAY[_short_code]
        WHEN _short_code = ANY(velocity_tracking.short_codes) THEN velocity_tracking.short_codes
        ELSE array_append(velocity_tracking.short_codes, _short_code) END,
        window_start = CASE WHEN velocity_tracking.window_start < now() - interval '1 hour' THEN now() ELSE velocity_tracking.window_start END,
        last_seen = now(),
        blocked = CASE
          WHEN velocity_tracking.window_start < now() - interval '1 hour' THEN false
          WHEN array_length(array_append(velocity_tracking.short_codes, _short_code), 1) >= 3 THEN true
          ELSE velocity_tracking.blocked END
      RETURNING * INTO v_velocity;
    IF v_velocity.blocked THEN
      v_decision := 'safe'; v_reasons := array_append(v_reasons, 'velocity_lock');
    END IF;
  END IF;

  IF _fbclid IS NOT NULL AND _fbclid <> '' AND _referer IS NOT NULL AND _referer NOT ILIKE '%fban%' AND _referer NOT ILIKE '%fbav%' AND _referer NOT ILIKE '%facebook.%' AND _referer NOT ILIKE '%instagram.%' THEN
    v_reasons := array_append(v_reasons, 'referer_mismatch'); v_decision := 'safe';
  END IF;

  IF cfg.block_desktop AND NOT _is_mobile THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'desktop_blocked');
  END IF;

  IF array_length(cfg.allowed_countries, 1) IS NOT NULL AND COALESCE(_country, '') <> '' AND NOT (_country = ANY(cfg.allowed_countries)) THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'geo_mismatch');
  END IF;

  IF _fbclid IS NOT NULL AND _fbclid <> '' THEN
    INSERT INTO public.fbclid_tracking (fbclid, link_id, hit_count)
    VALUES (_fbclid, _link_id, 1)
    ON CONFLICT (fbclid, link_id) DO UPDATE
      SET hit_count = fbclid_tracking.hit_count + 1,
          last_seen = now(),
          flagged_bot = CASE WHEN fbclid_tracking.hit_count + 1 > cfg.fbclid_max_hits AND fbclid_tracking.last_seen > now() - interval '2 hours' THEN true ELSE fbclid_tracking.flagged_bot END
    RETURNING * INTO v_fbclid_row;
    IF v_fbclid_row.flagged_bot THEN
      v_decision := 'safe'; v_reasons := array_append(v_reasons, 'fbclid_reused');
    END IF;
  END IF;

  IF cfg.campaign_launch_mode AND cfg.launched_at IS NOT NULL AND cfg.launched_at + (cfg.launch_window_hours || ' hours')::interval > now() THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'campaign_launch_window');
  END IF;

  IF _coherence_score IS NOT NULL AND _coherence_score < cfg.coherence_threshold THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'low_coherence');
  END IF;

  -- AUTO-LEARN: if this hit is going to safe (i.e. detected as bot), record fingerprint.
  -- After 3 such hits from the same fingerprint → auto-blocked on all future hits.
  v_is_bot := (v_decision <> 'money');
  IF _fingerprint IS NOT NULL AND _fingerprint <> '' THEN
    INSERT INTO public.bot_fingerprints (fingerprint_hash, hit_count, bot_hits, sample_ip, sample_ua, sample_country, last_seen)
    VALUES (_fingerprint, 1, CASE WHEN v_is_bot THEN 1 ELSE 0 END, _ip, _ua, _country, now())
    ON CONFLICT (fingerprint_hash) DO UPDATE
      SET hit_count = bot_fingerprints.hit_count + 1,
          bot_hits  = bot_fingerprints.bot_hits + CASE WHEN v_is_bot THEN 1 ELSE 0 END,
          last_seen = now(),
          sample_ip = _ip, sample_ua = _ua, sample_country = _country,
          auto_blocked = CASE
            WHEN bot_fingerprints.auto_blocked THEN true
            WHEN bot_fingerprints.bot_hits + CASE WHEN v_is_bot THEN 1 ELSE 0 END >= 3 THEN true
            ELSE false END;
  END IF;

  v_pool := cfg.safe_page_pool;
  IF array_length(v_pool, 1) IS NOT NULL THEN
    v_safe_url := v_pool[1 + floor(random() * array_length(v_pool, 1))::int];
  END IF;

  RETURN jsonb_build_object(
    'decision', v_decision,
    'reasons', v_reasons,
    'safe_url', v_safe_url,
    'coherence', _coherence_score
  );
END $$;
