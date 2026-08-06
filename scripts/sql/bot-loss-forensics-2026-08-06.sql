-- ============================================================================
-- adspx :: BOT-FILTER FORENSICS  (2026-08-06)
-- প্রশ্ন: 1700 hit-এর মধ্যে ~1000 কেন "bot" গোনা হচ্ছে?
-- এই স্ক্রিপ্ট প্রমাণ করে দেবে ওগুলো আসলেই Meta/crawler, নাকি real user।
--
-- Run on VPS:
--   docker exec -i supabase-db psql -U postgres -d postgres \
--     < scripts/sql/bot-loss-forensics-2026-08-06.sql
-- ============================================================================

\set ON_ERROR_STOP off

\echo '=== 1) 24h SUMMARY: delivered vs filtered ==='
SELECT count(*) AS hits,
       count(*) FILTER (WHERE decision='money')  AS delivered,
       count(*) FILTER (WHERE decision<>'money') AS filtered,
       round(100.0*count(*) FILTER (WHERE decision='money')/NULLIF(count(*),0),2) AS delivery_pct
FROM public.traffic_logs
WHERE created_at > now() - interval '24 hours';

\echo '=== 2) FILTERED split: crawler-UA vs NON-crawler (NON-crawler = real loss) ==='
SELECT CASE
         WHEN ua ILIKE '%facebookexternalhit%' OR ua ILIKE '%meta-external%'
           OR ua ILIKE '%facebookcatalog%'     OR ua ILIKE '%facebot%'
           THEN 'meta_crawler'
         WHEN ua ILIKE '%bot%' OR ua ILIKE '%spider%' OR ua ILIKE '%crawler%'
           OR ua ILIKE '%curl%' OR ua ILIKE '%python%' OR ua ILIKE '%headless%'
           OR ua ILIKE '%http-client%' OR ua ILIKE '%go-http%' OR ua ILIKE '%okhttp%'
           THEN 'other_crawler'
         WHEN coalesce(ua,'') = '' THEN 'empty_ua'
         ELSE '*** REAL-BROWSER-UA (investigate) ***'
       END AS bucket,
       count(*) AS filtered_hits
FROM public.traffic_logs
WHERE created_at > now() - interval '24 hours' AND decision<>'money'
GROUP BY 1 ORDER BY 2 DESC;

\echo '=== 3) REASONS on filtered traffic ==='
SELECT unnest(reasons) AS reason, count(*)
FROM public.traffic_logs
WHERE created_at > now() - interval '24 hours' AND decision<>'money'
GROUP BY 1 ORDER BY 2 DESC;

\echo '=== 4) FILTERED but REAL-browser UA — top 30 (এখানেই আসল loss দেখা যাবে) ==='
SELECT left(coalesce(ua,'(empty)'),110) AS ua, array_to_string(reasons,',') AS reasons,
       count(*) AS hits, count(DISTINCT ip) AS ips, bool_or(is_mobile) AS mobile
FROM public.traffic_logs
WHERE created_at > now() - interval '24 hours'
  AND decision<>'money'
  AND ua NOT ILIKE '%bot%' AND ua NOT ILIKE '%spider%' AND ua NOT ILIKE '%crawler%'
  AND ua NOT ILIKE '%meta-external%' AND ua NOT ILIKE '%facebookexternalhit%'
  AND ua NOT ILIKE '%facebookcatalog%' AND ua NOT ILIKE '%curl%'
  AND ua NOT ILIKE '%python%' AND ua NOT ILIKE '%headless%' AND ua NOT ILIKE '%okhttp%'
  AND coalesce(ua,'') <> ''
GROUP BY 1,2 ORDER BY hits DESC LIMIT 30;

\echo '=== 5) LINK CONFIG problems — missing_money_url / inactive (এগুলো bot নয়, config bug) ==='
SELECT l.short_code, p.email,
       count(*) FILTER (WHERE 'missing_money_url' = ANY(t.reasons)) AS missing_money,
       count(*) FILTER (WHERE 'link_not_found_or_inactive' = ANY(t.reasons)) AS inactive,
       l.is_active, left(coalesce(l.adsterra_url,'(null)'),40) AS money_url
FROM public.traffic_logs t
JOIN public.links l ON l.id = t.link_id
LEFT JOIN public.profiles p ON p.id = l.user_id
WHERE t.created_at > now() - interval '24 hours' AND t.decision<>'money'
GROUP BY 1,2,l.is_active,l.adsterra_url
HAVING count(*) FILTER (WHERE 'missing_money_url' = ANY(t.reasons)) > 0
    OR count(*) FILTER (WHERE 'link_not_found_or_inactive' = ANY(t.reasons)) > 0
ORDER BY 3 DESC NULLS LAST LIMIT 20;

\echo '=== 6) META ASN / IP hits (এগুলো Facebook datacenter, real user নয়) ==='
SELECT regexp_replace(coalesce(asn,''),'\D','','g') AS asn, count(*) AS hits,
       count(*) FILTER (WHERE decision='money') AS delivered
FROM public.traffic_logs
WHERE created_at > now() - interval '24 hours'
GROUP BY 1 ORDER BY hits DESC LIMIT 15;

\echo '=== 7) PER LINK 24h ==='
SELECT l.short_code, count(*) AS hits,
       count(*) FILTER (WHERE t.decision='money') AS delivered,
       count(*) FILTER (WHERE t.decision<>'money') AS filtered,
       round(100.0*count(*) FILTER (WHERE t.decision='money')/NULLIF(count(*),0),2) AS pct
FROM public.traffic_logs t JOIN public.links l ON l.id=t.link_id
WHERE t.created_at > now() - interval '24 hours'
GROUP BY 1 ORDER BY hits DESC LIMIT 20;

\echo '=== 8) SANITY: crawler-only mode আসলেই active কি না ==='
SELECT (SELECT count(*) FROM public.bot_fingerprints WHERE auto_blocked)  AS auto_blocked_fp,
       (SELECT count(*) FROM public.velocity_tracking WHERE blocked)      AS velocity_locks,
       (SELECT count(*) FROM public.fbclid_tracking WHERE flagged_bot)    AS fbclid_flags,
       (SELECT coalesce(array_length(bot_countries,1),0) FROM public.app_settings LIMIT 1) AS bot_countries,
       (SELECT count(*) FROM public.cloaking_settings WHERE coherence_threshold > 0
           OR block_desktop OR campaign_launch_mode
           OR array_length(allowed_countries,1) IS NOT NULL)              AS restrictive_links;
