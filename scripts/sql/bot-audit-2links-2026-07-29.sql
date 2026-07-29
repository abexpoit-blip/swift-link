-- Bot / traffic-loss audit for two specific links (fingerprint level)
-- Links: e9k4v8tx , z64n9jz9
-- Run on VPS:
--   docker exec -i supabase-db psql -U supabase_admin -d postgres < scripts/sql/bot-audit-2links-2026-07-29.sql

\set ON_ERROR_STOP off

\echo '=== 1) TOTALS per link (all time + 24h) ==='
SELECT l.short_code,
       count(*)                                    AS hits_all,
       count(*) FILTER (WHERE t.decision='money')  AS money_all,
       count(*) FILTER (WHERE t.decision<>'money') AS filtered_all,
       round(100.0*count(*) FILTER (WHERE t.decision='money')/NULLIF(count(*),0),2) AS delivery_pct_all,
       count(*) FILTER (WHERE t.created_at > now()-interval '24 hours') AS hits_24h,
       count(*) FILTER (WHERE t.created_at > now()-interval '24 hours' AND t.decision='money') AS money_24h
FROM public.links l
JOIN public.traffic_logs t ON t.link_id = l.id
WHERE l.short_code IN ('e9k4v8tx','z64n9jz9')
GROUP BY l.short_code;

\echo '=== 2) WHY filtered — reason breakdown per link ==='
SELECT l.short_code, unnest(t.reasons) AS reason, count(*) AS hits
FROM public.traffic_logs t
JOIN public.links l ON l.id = t.link_id
WHERE l.short_code IN ('e9k4v8tx','z64n9jz9') AND t.decision <> 'money'
GROUP BY 1,2 ORDER BY 1, 3 DESC;

\echo '=== 3) SOFT-BLOCK ONLY (no hard crawler signal) = potential REAL users lost ==='
SELECT l.short_code, unnest(t.reasons) AS reason, count(*) AS hits
FROM public.traffic_logs t
JOIN public.links l ON l.id = t.link_id
WHERE l.short_code IN ('e9k4v8tx','z64n9jz9')
  AND t.decision <> 'money'
  AND NOT ('hardcoded_crawler' = ANY(t.reasons))
  AND NOT ('datacenter_asn'    = ANY(t.reasons))
GROUP BY 1,2 ORDER BY 3 DESC;

\echo '=== 4) MOBILE traffic that still got filtered (should be ~0 after the mobile-exempt patch) ==='
SELECT l.short_code,
       count(*) FILTER (WHERE t.is_mobile)                        AS mobile_hits,
       count(*) FILTER (WHERE t.is_mobile AND t.decision<>'money') AS mobile_filtered,
       count(*) FILTER (WHERE NOT t.is_mobile)                     AS desktop_hits,
       count(*) FILTER (WHERE NOT t.is_mobile AND t.decision<>'money') AS desktop_filtered
FROM public.traffic_logs t
JOIN public.links l ON l.id = t.link_id
WHERE l.short_code IN ('e9k4v8tx','z64n9jz9')
GROUP BY 1;

\echo '=== 5) FINGERPRINT concentration — top 20 fingerprints on these links ==='
SELECT l.short_code, t.fingerprint_hash,
       count(*) AS hits,
       count(DISTINCT t.ip) AS distinct_ips,
       count(*) FILTER (WHERE t.decision='money')  AS money,
       count(*) FILTER (WHERE t.decision<>'money') AS filtered,
       bool_or(t.is_mobile) AS any_mobile,
       max(t.ua) AS sample_ua
FROM public.traffic_logs t
JOIN public.links l ON l.id = t.link_id
WHERE l.short_code IN ('e9k4v8tx','z64n9jz9')
GROUP BY 1,2
ORDER BY hits DESC LIMIT 20;

\echo '=== 6) Are those fingerprints auto-blocked in bot_fingerprints? ==='
SELECT bf.fingerprint_hash, bf.hit_count, bf.bot_hits,
       round(bf.bot_hits::numeric/GREATEST(bf.hit_count,1),2) AS bot_ratio,
       bf.auto_blocked, bf.sample_country, left(bf.sample_ua,60) AS ua
FROM public.bot_fingerprints bf
WHERE bf.fingerprint_hash IN (
  SELECT DISTINCT t.fingerprint_hash FROM public.traffic_logs t
  JOIN public.links l ON l.id = t.link_id
  WHERE l.short_code IN ('e9k4v8tx','z64n9jz9')
)
ORDER BY bf.hit_count DESC LIMIT 25;

\echo '=== 7) Velocity locks currently active for these fingerprints ==='
SELECT v.fingerprint_hash, array_length(v.short_codes,1) AS codes, v.blocked, v.window_start, v.last_seen
FROM public.velocity_tracking v
WHERE v.fingerprint_hash IN (
  SELECT DISTINCT t.fingerprint_hash FROM public.traffic_logs t
  JOIN public.links l ON l.id = t.link_id
  WHERE l.short_code IN ('e9k4v8tx','z64n9jz9')
)
AND v.blocked ORDER BY v.last_seen DESC LIMIT 25;

\echo '=== 8) UA breakdown of FILTERED traffic (is it really bots?) ==='
SELECT l.short_code, left(coalesce(t.ua,'(empty)'),70) AS ua, count(*) AS filtered
FROM public.traffic_logs t
JOIN public.links l ON l.id = t.link_id
WHERE l.short_code IN ('e9k4v8tx','z64n9jz9') AND t.decision<>'money'
GROUP BY 1,2 ORDER BY 3 DESC LIMIT 25;

\echo '=== 9) COUNTRY split of filtered traffic ==='
SELECT l.short_code, coalesce(nullif(t.country,''),'??') AS country,
       count(*) FILTER (WHERE t.decision<>'money') AS filtered,
       count(*) FILTER (WHERE t.decision='money')  AS money
FROM public.traffic_logs t
JOIN public.links l ON l.id = t.link_id
WHERE l.short_code IN ('e9k4v8tx','z64n9jz9')
GROUP BY 1,2 ORDER BY 3 DESC LIMIT 20;

\echo '=== 10) COUNTER vs REALITY (UI number check) ==='
SELECT l.short_code, l.clicks_count AS ui_human, l.bot_clicks_count AS ui_bot,
       (SELECT count(*) FROM public.clicks c WHERE c.link_id=l.id AND NOT c.is_bot) AS clicks_human_rows,
       (SELECT count(*) FROM public.clicks c WHERE c.link_id=l.id AND c.is_bot)     AS clicks_bot_rows
FROM public.links l WHERE l.short_code IN ('e9k4v8tx','z64n9jz9');

\echo '=== 11) COHERENCE distribution of filtered non-crawler traffic (threshold tuning) ==='
SELECT l.short_code,
       width_bucket(coalesce(t.coherence_score,0), 0, 100, 10) * 10 AS coherence_bucket,
       count(*) AS hits,
       count(*) FILTER (WHERE t.decision<>'money') AS filtered
FROM public.traffic_logs t
JOIN public.links l ON l.id = t.link_id
WHERE l.short_code IN ('e9k4v8tx','z64n9jz9')
  AND NOT ('hardcoded_crawler' = ANY(t.reasons))
GROUP BY 1,2 ORDER BY 1,2;
