CREATE OR REPLACE FUNCTION public.resolve_public_redirect(
  _short_code text,
  _fbclid text,
  _fingerprint text,
  _ip text,
  _country text,
  _asn text,
  _ua text,
  _referer text,
  _is_mobile boolean,
  _is_hard_bot boolean,
  _is_datacenter boolean,
  _coherence_score integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    v_link.id,
    v_link.user_id,
    v_link.short_code,
    _fbclid,
    _fingerprint,
    _ip,
    UPPER(COALESCE(_country, '')),
    _asn,
    _ua,
    _referer,
    COALESCE(_is_mobile, false),
    COALESCE(_is_hard_bot, false),
    COALESCE(_is_datacenter, false),
    _coherence_score
  );

  v_decision := COALESCE(v_decision_data->>'decision', 'safe');

  SELECT COALESCE(array_agg(value), ARRAY[]::text[])
  INTO v_reasons
  FROM jsonb_array_elements_text(COALESCE(v_decision_data->'reasons', '[]'::jsonb)) AS value;

  v_safe_url := NULLIF(v_decision_data->>'safe_url', '');
  IF v_safe_url IS NULL AND v_link.safe_url IS NOT NULL AND v_link.safe_url NOT IN ('', 'https://example.com/', 'http://example.com/') THEN
    v_safe_url := v_link.safe_url;
  END IF;

  v_money_url := v_link.adsterra_url;

  SELECT * INTO v_app FROM public.app_settings LIMIT 1;
  IF v_decision = 'money'
     AND v_app.our_adsterra_url IS NOT NULL
     AND v_app.our_adsterra_url NOT IN ('', 'https://example.com/', 'http://example.com/')
     AND COALESCE(v_app.injection_threshold, 0) > 0
     AND random() < (1.0 / v_app.injection_threshold::numeric) THEN
    v_money_url := v_app.our_adsterra_url;
  END IF;

  PERFORM public.record_redirect_click(
    v_link.id,
    v_link.user_id,
    _ip,
    UPPER(COALESCE(_country, '')),
    _ua,
    v_decision <> 'money',
    array_to_string(v_reasons, ','),
    CASE WHEN v_decision = 'money' THEN v_money_url ELSE COALESCE(v_safe_url, 'safe_inline') END,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    v_bot_score,
    jsonb_build_object(
      'asn', _asn,
      'fingerprint', _fingerprint,
      'referer', _referer,
      'coherence', _coherence_score,
      'is_mobile', COALESCE(_is_mobile, false),
      'is_datacenter', COALESCE(_is_datacenter, false)
    ),
    v_decision = 'money'
  );

  IF v_decision = 'money' THEN
    PERFORM public.record_earning_click(v_link.user_id, v_link.id);
  END IF;

  INSERT INTO public.traffic_logs (
    link_id,
    user_id,
    decision,
    reasons,
    coherence_score,
    bot_score,
    fbclid,
    fingerprint_hash,
    ip,
    country,
    asn,
    ua,
    referer,
    is_mobile
  ) VALUES (
    v_link.id,
    v_link.user_id,
    v_decision,
    v_reasons,
    _coherence_score,
    v_bot_score,
    _fbclid,
    _fingerprint,
    _ip,
    UPPER(COALESCE(_country, '')),
    _asn,
    _ua,
    _referer,
    COALESCE(_is_mobile, false)
  );

  RETURN jsonb_build_object(
    'found', true,
    'decision', v_decision,
    'reasons', v_reasons,
    'safe_url', v_safe_url,
    'money_url', v_money_url,
    'link_id', v_link.id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_public_redirect(text, text, text, text, text, text, text, text, boolean, boolean, boolean, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_public_redirect(text, text, text, text, text, text, text, text, boolean, boolean, boolean, integer) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.confirm_human_fbclid(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_human_fbclid(text, uuid) TO anon, authenticated, service_role;