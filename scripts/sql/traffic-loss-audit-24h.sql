-- 24h traffic loss audit
-- Run on VPS:
--   docker exec -i supabase-db psql -U supabase_admin -d postgres < scripts/sql/traffic-loss-audit-24h.sql

\echo '=== 1) GLOBAL 24H: hits vs delivered vs filtered ==='
SELECT
  count(*)                                             AS total_hits,
  count(*) FILTER (WHERE decision='money')             AS delivered_money,
  count(*) FILTER (WHERE decision<>'money')            AS filtered,
  round(100.0*count(*) FILTER (WHERE decision='money')/NULLIF(count(*),0),2) AS delivery_pct
FROM public.traffic_logs
WHERE created_at > now() - interval '24 hours';

\echo '=== 2) WHY filtered (top reasons) ==='
SELECT unnest(reasons) AS reason, count(*)
FROM public.traffic_logs
WHERE created_at > now() - interval '24 hours' AND decision<>'money'
GROUP BY 1 ORDER BY 2 DESC LIMIT 25;

\echo '=== 3) INJECTION: how many money-hits went to OUR adsterra (user loses these) ==='
SELECT
  day,
  sum(total_clicks)     AS money_clicks,
  sum(adsterra_clicks)  AS our_adsterra,
  sum(user_clicks)      AS user_offer,
  round(100.0*sum(adsterra_clicks)/NULLIF(sum(total_clicks),0),2) AS our_share_pct
FROM public.earnings_ledger
WHERE day >= (now() at time zone 'utc')::date - 1
GROUP BY day ORDER BY day DESC;

SELECT injection_threshold, injection_count, daily_redirect_enabled, monitor_mode
FROM public.app_settings;

\echo '=== 4) PER USER 24H (top 15) ==='
SELECT p.email,
       count(*) AS hits,
       count(*) FILTER (WHERE t.decision='money')  AS delivered,
       count(*) FILTER (WHERE t.decision<>'money') AS filtered,
       round(100.0*count(*) FILTER (WHERE t.decision='money')/NULLIF(count(*),0),2) AS delivery_pct,
       p.banned
FROM public.traffic_logs t
JOIN public.profiles p ON p.id = t.user_id
WHERE t.created_at > now() - interval '24 hours'
GROUP BY p.email, p.banned
ORDER BY hits DESC LIMIT 15;

\echo '=== 5) HOURLY trend (spot a drop point) ==='
SELECT date_trunc('hour', created_at) AS hour,
       count(*) AS hits,
       count(*) FILTER (WHERE decision='money') AS money,
       round(100.0*count(*) FILTER (WHERE decision='money')/NULLIF(count(*),0),2) AS pct
FROM public.traffic_logs
WHERE created_at > now() - interval '24 hours'
GROUP BY 1 ORDER BY 1;

\echo '=== 6) BLOCK LAYERS state (auto-blocks can eat real users) ==='
SELECT
  (SELECT count(*) FROM public.bot_fingerprints WHERE auto_blocked)             AS auto_blocked_fp,
  (SELECT count(*) FROM public.velocity_tracking WHERE blocked)                 AS velocity_locks,
  (SELECT count(*) FROM public.fbclid_tracking WHERE flagged_bot
     AND last_seen > now() - interval '24 hours')                               AS fbclid_flagged_24h,
  (SELECT count(*) FROM public.ip_blacklist)                                    AS ip_blacklist;

\echo '=== 7) COUNTRY split of filtered traffic (geo-block check) ==='
SELECT country, count(*) AS filtered
FROM public.traffic_logs
WHERE created_at > now() - interval '24 hours' AND decision<>'money'
GROUP BY 1 ORDER BY 2 DESC LIMIT 15;
