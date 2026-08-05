-- Cloaking / traffic-loss audit (run on VPS self-hosted Supabase)
--   docker exec -i supabase-db psql -U supabase_admin -d postgres < scripts/sql/cloaking-audit-report.sql
\pset pager off
\pset format wrapped

\echo '=== B) DB LOGIC: evaluate_redirect + resolve_public_redirect ==='
SELECT proname, prosrc FROM pg_proc
WHERE proname IN ('evaluate_redirect','resolve_public_redirect');

\echo '=== B2) supporting functions ==='
SELECT proname, prosrc FROM pg_proc
WHERE proname IN ('record_redirect_click','record_earning_click','confirm_human_fbclid');

\echo '=== C) app_settings ==='
SELECT * FROM public.app_settings;

\echo '=== C2) per-link cloaking_settings (top 20 by traffic) ==='
SELECT cs.*, l.short_code
FROM public.cloaking_settings cs JOIN public.links l ON l.id = cs.link_id
ORDER BY l.clicks_count DESC NULLS LAST LIMIT 20;

\echo '=== D) 24h decision x reason breakdown (mobile vs desktop) ==='
SELECT decision,
       unnest(reasons) AS reason,
       count(*) FILTER (WHERE is_mobile)     AS mobile,
       count(*) FILTER (WHERE NOT is_mobile) AS desktop,
       count(*)                              AS total
FROM public.traffic_logs
WHERE created_at > now() - interval '24 hours'
GROUP BY 1,2 ORDER BY total DESC LIMIT 40;

\echo '=== E) coherence_score distribution (10-pt buckets) ==='
SELECT CASE WHEN is_mobile THEN 'mobile' ELSE 'desktop' END AS device,
       width_bucket(coalesce(coherence_score,0),0,100,10)*10 AS bucket,
       count(*),
       count(*) FILTER (WHERE decision='money') AS money
FROM public.traffic_logs
WHERE created_at > now() - interval '24 hours'
GROUP BY 1,2 ORDER BY 1,2;

\echo '=== F) route split ==='
SELECT decision,
       count(*) FILTER (WHERE is_mobile)     AS mobile,
       count(*) FILTER (WHERE NOT is_mobile) AS desktop,
       count(*)                              AS total
FROM public.traffic_logs
WHERE created_at > now() - interval '24 hours'
GROUP BY 1 ORDER BY total DESC;

\echo '=== G) 10 raw desktop hits that did NOT get money ==='
SELECT created_at, decision, reasons, coherence_score, bot_score, asn, country,
       is_mobile, left(ua,120) AS ua, left(coalesce(referer,''),80) AS referer
FROM public.traffic_logs
WHERE created_at > now() - interval '24 hours'
  AND NOT is_mobile AND decision <> 'money'
ORDER BY created_at DESC LIMIT 10;

\echo '=== G2) desktop non-money EXCLUDING known crawler UAs (true suspects) ==='
SELECT created_at, decision, reasons, coherence_score, asn, country, left(ua,140) AS ua
FROM public.traffic_logs
WHERE created_at > now() - interval '24 hours'
  AND NOT is_mobile AND decision <> 'money'
  AND ua !~* 'facebookexternalhit|meta-external|facebot|bot|crawler|spider|curl|wget|python|headless'
ORDER BY created_at DESC LIMIT 25;

\echo '=== G3) desktop-only reason totals, crawler UAs excluded ==='
SELECT unnest(reasons) AS reason, count(*)
FROM public.traffic_logs
WHERE created_at > now() - interval '24 hours'
  AND NOT is_mobile AND decision <> 'money'
  AND ua !~* 'facebookexternalhit|meta-external|facebot|bot|crawler|spider|curl|wget|python|headless'
GROUP BY 1 ORDER BY 2 DESC;

\echo '=== H) block-layer state ==='
SELECT (SELECT count(*) FROM public.bot_fingerprints WHERE auto_blocked) AS auto_blocked_fp,
       (SELECT count(*) FROM public.velocity_tracking WHERE blocked)     AS velocity_locks,
       (SELECT count(*) FROM public.ip_blacklist)                        AS ip_blacklist,
       (SELECT count(*) FROM public.fbclid_tracking WHERE flagged_bot)   AS fbclid_flagged;

\echo '=== I) links with block_desktop = true (direct desktop killer) ==='
SELECT l.short_code, cs.block_desktop, cs.coherence_threshold, cs.allowed_countries,
       cs.campaign_launch_mode, cs.launched_at, cs.launch_window_hours, cs.fbclid_max_hits
FROM public.cloaking_settings cs JOIN public.links l ON l.id = cs.link_id
WHERE cs.block_desktop = true OR cs.coherence_threshold > 35
   OR array_length(cs.allowed_countries,1) IS NOT NULL;
