-- ============================================================
-- DEEP TRAFFIC AUDIT — desktop vs mobile vs Facebook in-app
-- Goal: prove whether ANY real human traffic is being blocked
-- Window: last 24 hours (change INTERVAL below to widen)
-- Run on VPS self-hosted Supabase:
--   docker exec -i supabase-db psql -U supabase_admin -d postgres \
--     < scripts/sql/deep-traffic-audit-2026-07-29.sql
-- ============================================================

\timing on
\pset pager off

-- Common classification CTE is repeated per query (psql has no global CTE).
-- device_class:
--   fb_inapp  = Facebook / Instagram in-app browser (REAL HUMAN)
--   mobile    = real mobile browser
--   desktop   = real desktop browser
--   crawler   = known platform crawler (NOT user traffic)

\echo ''
\echo '===== §1 OVERALL 24H: delivered vs filtered by device class ====='
WITH t AS (
  SELECT *,
    CASE
      WHEN ua ~* '(facebookexternalhit|meta-external|facebookcatalog|facebot|whatsapp|telegrambot|twitterbot|slackbot|discordbot|bingbot|googlebot|applebot|linkedinbot|pinterest|semrush|ahrefs|petalbot|yandex|bytespider|headlesschrome|phantomjs|python-requests|curl/|wget|go-http|okhttp|axios|node-fetch|java/|libwww)' THEN 'crawler'
      WHEN ua ~* '(FBAV|FBAN|FB_IAB|FBIOS|Instagram)' THEN 'fb_inapp'
      WHEN is_mobile THEN 'mobile'
      ELSE 'desktop'
    END AS device_class
  FROM traffic_logs
  WHERE created_at > now() - interval '24 hours'
)
SELECT device_class,
       count(*) AS hits,
       count(*) FILTER (WHERE decision = 'offer')  AS delivered,
       count(*) FILTER (WHERE decision <> 'offer') AS filtered,
       round(100.0 * count(*) FILTER (WHERE decision = 'offer') / NULLIF(count(*),0), 2) AS delivery_pct
FROM t GROUP BY 1 ORDER BY hits DESC;

\echo ''
\echo '===== §2 REAL HUMANS ONLY (crawler excluded) — block reasons ====='
WITH t AS (
  SELECT *,
    CASE
      WHEN ua ~* '(facebookexternalhit|meta-external|facebookcatalog|facebot|whatsapp|telegrambot|twitterbot|slackbot|discordbot|bingbot|googlebot|applebot|linkedinbot|pinterest|semrush|ahrefs|petalbot|yandex|bytespider|headlesschrome|phantomjs|python-requests|curl/|wget|go-http|okhttp|axios|node-fetch|java/|libwww)' THEN 'crawler'
      WHEN ua ~* '(FBAV|FBAN|FB_IAB|FBIOS|Instagram)' THEN 'fb_inapp'
      WHEN is_mobile THEN 'mobile'
      ELSE 'desktop'
    END AS device_class
  FROM traffic_logs
  WHERE created_at > now() - interval '24 hours'
)
SELECT device_class, r AS reason, count(*) AS blocked_humans
FROM t, unnest(CASE WHEN reasons IS NULL OR cardinality(reasons)=0 THEN ARRAY['(none)'] ELSE reasons END) AS r
WHERE device_class <> 'crawler' AND decision <> 'offer'
GROUP BY 1,2 ORDER BY blocked_humans DESC LIMIT 40;

\echo ''
\echo '===== §3 SAMPLE of blocked REAL humans (worst offenders, 30 rows) ====='
WITH t AS (
  SELECT *,
    CASE
      WHEN ua ~* '(facebookexternalhit|meta-external|facebookcatalog|facebot|whatsapp|telegrambot|twitterbot|slackbot|discordbot|bingbot|googlebot|applebot|linkedinbot|pinterest|semrush|ahrefs|petalbot|yandex|bytespider|headlesschrome|phantomjs|python-requests|curl/|wget|go-http|okhttp|axios|node-fetch|java/|libwww)' THEN 'crawler'
      WHEN ua ~* '(FBAV|FBAN|FB_IAB|FBIOS|Instagram)' THEN 'fb_inapp'
      WHEN is_mobile THEN 'mobile'
      ELSE 'desktop'
    END AS device_class
  FROM traffic_logs
  WHERE created_at > now() - interval '24 hours'
)
SELECT created_at, device_class, decision, reasons, coherence_score, bot_score,
       country, asn, left(ua, 90) AS ua_short, left(fingerprint_hash, 12) AS fp
FROM t
WHERE device_class <> 'crawler' AND decision <> 'offer'
ORDER BY created_at DESC LIMIT 30;

\echo ''
\echo '===== §4 FACEBOOK IN-APP BROWSER (real users from FB app) ====='
SELECT count(*) AS fb_inapp_hits,
       count(*) FILTER (WHERE decision='offer') AS delivered,
       count(*) FILTER (WHERE decision<>'offer') AS blocked,
       round(100.0*count(*) FILTER (WHERE decision='offer')/NULLIF(count(*),0),2) AS delivery_pct
FROM traffic_logs
WHERE created_at > now() - interval '24 hours'
  AND ua ~* '(FBAV|FBAN|FB_IAB|FBIOS|Instagram)'
  AND ua !~* '(facebookexternalhit|meta-external|facebookcatalog|facebot)';

\echo '--- fb in-app blocked reasons (should be ~0) ---'
SELECT r AS reason, count(*) FROM traffic_logs,
  unnest(CASE WHEN reasons IS NULL OR cardinality(reasons)=0 THEN ARRAY['(none)'] ELSE reasons END) r
WHERE created_at > now() - interval '24 hours'
  AND ua ~* '(FBAV|FBAN|FB_IAB|FBIOS|Instagram)'
  AND ua !~* '(facebookexternalhit|meta-external|facebookcatalog|facebot)'
  AND decision <> 'offer'
GROUP BY 1 ORDER BY 2 DESC;

\echo ''
\echo '===== §5 DESKTOP REAL USERS — are we killing them? ====='
SELECT count(*) AS desktop_hits,
       count(*) FILTER (WHERE decision='offer') AS delivered,
       count(*) FILTER (WHERE decision<>'offer') AS blocked,
       round(100.0*count(*) FILTER (WHERE decision='offer')/NULLIF(count(*),0),2) AS delivery_pct
FROM traffic_logs
WHERE created_at > now() - interval '24 hours'
  AND NOT is_mobile
  AND ua !~* '(facebookexternalhit|meta-external|facebookcatalog|facebot|whatsapp|telegrambot|bot|crawler|spider|curl/|wget|python|okhttp|headless)';

\echo '--- desktop blocked: top UA + reason ---'
SELECT left(ua,80) AS ua_short, reasons, country, count(*) AS n
FROM traffic_logs
WHERE created_at > now() - interval '24 hours'
  AND NOT is_mobile AND decision <> 'offer'
  AND ua !~* '(facebookexternalhit|meta-external|facebookcatalog|facebot|whatsapp|telegrambot|bot|crawler|spider|curl/|wget|python|okhttp|headless)'
GROUP BY 1,2,3 ORDER BY n DESC LIMIT 25;

\echo ''
\echo '===== §6 SOFT-BLOCK ONLY (no hard crawler/datacenter reason) = TRUE LOSS ====='
SELECT count(*) AS true_potential_loss
FROM traffic_logs
WHERE created_at > now() - interval '24 hours'
  AND decision <> 'offer'
  AND NOT (reasons && ARRAY['hardcoded_crawler','datacenter','meta_ip','hard_bot']);

SELECT reasons, is_mobile, country, count(*) AS n, left(min(ua),80) AS sample_ua
FROM traffic_logs
WHERE created_at > now() - interval '24 hours'
  AND decision <> 'offer'
  AND NOT (reasons && ARRAY['hardcoded_crawler','datacenter','meta_ip','hard_bot'])
GROUP BY 1,2,3 ORDER BY n DESC LIMIT 30;

\echo ''
\echo '===== §7 FINGERPRINT COLLISION CHECK (many distinct UA on one fp = collision) ====='
SELECT left(fingerprint_hash,12) AS fp, count(*) AS hits,
       count(DISTINCT ua) AS distinct_ua, count(DISTINCT country) AS countries,
       count(*) FILTER (WHERE decision<>'offer') AS blocked,
       left(min(ua),70) AS sample_ua
FROM traffic_logs
WHERE created_at > now() - interval '24 hours' AND fingerprint_hash IS NOT NULL
GROUP BY 1
HAVING count(*) > 20 AND count(DISTINCT ua) > 3
ORDER BY hits DESC LIMIT 25;

\echo ''
\echo '===== §8 COHERENCE SCORE distribution for NON-crawler traffic ====='
SELECT width_bucket(coalesce(coherence_score,0), 0, 100, 10) * 10 AS score_bucket,
       count(*) AS hits,
       count(*) FILTER (WHERE decision='offer') AS delivered,
       count(*) FILTER (WHERE decision<>'offer') AS blocked
FROM traffic_logs
WHERE created_at > now() - interval '24 hours'
  AND ua !~* '(facebookexternalhit|meta-external|facebookcatalog|facebot|whatsapp|telegrambot|bot|crawler|spider|curl/|wget|python|okhttp|headless)'
GROUP BY 1 ORDER BY 1;

\echo ''
\echo '===== §9 HOURLY TREND (human delivery over time) ====='
SELECT date_trunc('hour', created_at) AS hr,
       count(*) FILTER (WHERE ua !~* '(facebookexternalhit|meta-external|facebookcatalog|facebot|whatsapp|telegrambot|bot|crawler|spider)') AS human_hits,
       count(*) FILTER (WHERE decision='offer' AND ua !~* '(facebookexternalhit|meta-external|facebookcatalog|facebot|whatsapp|telegrambot|bot|crawler|spider)') AS human_delivered
FROM traffic_logs
WHERE created_at > now() - interval '24 hours'
GROUP BY 1 ORDER BY 1;

\echo ''
\echo '===== §10 AUTO-BLOCKED FINGERPRINTS that also served humans (false positive risk) ====='
SELECT left(bf.fingerprint_hash,12) AS fp, bf.hit_count, bf.bot_hits, bf.auto_blocked,
       bf.sample_country, left(bf.sample_ua,70) AS sample_ua, bf.last_seen
FROM bot_fingerprints bf
WHERE bf.auto_blocked
  AND bf.last_seen > now() - interval '24 hours'
  AND bf.sample_ua !~* '(facebookexternalhit|meta-external|facebookcatalog|facebot|bot|crawler|spider|curl|python)'
ORDER BY bf.hit_count DESC LIMIT 25;

\echo ''
\echo '===== §11 IP BLACKLIST hits in last 24h (auto-added, could be real users) ====='
SELECT count(*) AS auto_blacklisted_last_24h
FROM ip_blacklist WHERE auto_added AND created_at > now() - interval '24 hours';

SELECT ip, fingerprint_hash, reason, created_at
FROM ip_blacklist WHERE auto_added AND created_at > now() - interval '24 hours'
ORDER BY created_at DESC LIMIT 20;

\echo ''
\echo '===== §12 VERDICT SUMMARY ====='
WITH t AS (
  SELECT decision, reasons, ua, is_mobile FROM traffic_logs WHERE created_at > now() - interval '24 hours'
)
SELECT
  count(*) AS total_hits,
  count(*) FILTER (WHERE ua ~* '(facebookexternalhit|meta-external|facebookcatalog|facebot|whatsapp|telegrambot|twitterbot|slackbot|discordbot|bingbot|googlebot|applebot|linkedinbot|pinterest|semrush|ahrefs|petalbot|yandex|bytespider)') AS platform_crawler_hits,
  count(*) FILTER (WHERE decision='offer') AS delivered,
  count(*) FILTER (WHERE decision<>'offer' AND NOT (reasons && ARRAY['hardcoded_crawler','datacenter','meta_ip','hard_bot'])) AS suspicious_human_blocks
FROM t;
