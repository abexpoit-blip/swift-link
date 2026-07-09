-- Traffic accounting audit — see where clicks are being filtered.
-- Apply on VPS:
--   docker exec -i supabase-db psql -U supabase_admin -d postgres < scripts/sql/traffic-audit.sql

\echo === Totals last 24h (traffic_logs = every hit that reached the redirect fn) ===
SELECT
  count(*)                                   AS total_hits,
  count(*) FILTER (WHERE decision='money')   AS money_redirects,
  count(*) FILTER (WHERE decision='safe')    AS safe_or_bot,
  count(*) FILTER (WHERE decision NOT IN ('money','safe')) AS other
FROM public.traffic_logs
WHERE created_at > now() - interval '24 hours';

\echo === Reason breakdown (why traffic went to safe) last 24h ===
SELECT unnest(reasons) AS reason, count(*)
FROM public.traffic_logs
WHERE created_at > now() - interval '24 hours' AND decision <> 'money'
GROUP BY 1 ORDER BY 2 DESC LIMIT 20;

\echo === Per-link last 24h (top 20 by hits) ===
SELECT l.short_code,
       count(*) AS hits,
       count(*) FILTER (WHERE t.decision='money') AS money,
       count(*) FILTER (WHERE t.decision<>'money') AS filtered,
       l.clicks_count AS human_counter,
       l.bot_clicks_count AS bot_counter
FROM public.traffic_logs t
JOIN public.links l ON l.id = t.link_id
WHERE t.created_at > now() - interval '24 hours'
GROUP BY l.short_code, l.clicks_count, l.bot_clicks_count
ORDER BY hits DESC LIMIT 20;

\echo === clicks table vs traffic_logs (should match) last 24h ===
SELECT
  (SELECT count(*) FROM public.clicks        WHERE created_at > now() - interval '24 hours') AS clicks_rows,
  (SELECT count(*) FROM public.traffic_logs  WHERE created_at > now() - interval '24 hours') AS traffic_rows;

\echo === Auto-blocked fingerprints and velocity locks ===
SELECT
  (SELECT count(*) FROM public.bot_fingerprints  WHERE auto_blocked) AS blocked_fp,
  (SELECT count(*) FROM public.velocity_tracking WHERE blocked)      AS velocity_locks;
