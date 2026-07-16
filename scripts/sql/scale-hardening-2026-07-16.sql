-- ═══════════════════════════════════════════════════════════════════════
-- Scale Hardening Migration — 2026-07-16
-- Goal: Prepare for 1M+ clicks/day without crash
-- Safe: zero downtime, all changes are additive or lock-free
-- ═══════════════════════════════════════════════════════════════════════

-- ─── 1. Drop duplicate indexes (identical definitions) ───
-- These waste write I/O and disk for zero benefit.

DROP INDEX IF EXISTS public.idx_traffic_logs_link;         -- kept: idx_traffic_logs_link_created
DROP INDEX IF EXISTS public.idx_traffic_logs_user;         -- kept: idx_traffic_logs_user_created
DROP INDEX IF EXISTS public.idx_clicks_user_created;       -- kept: idx_clicks_link (same def)
DROP INDEX IF EXISTS public.idx_clicks_created_at;         -- kept: idx_clicks_created (DESC is better)
DROP INDEX IF EXISTS public.idx_clicks_link_created;       -- kept: idx_clicks_link (DESC variant)
DROP INDEX IF EXISTS public.idx_earnings_user;             -- kept: idx_earnings_user_day (same def)
DROP INDEX IF EXISTS public.idx_earnings_user_link_day;    -- kept: unique earnings_ledger_user_id_link_id_day_key

-- ─── 2. Enable pg_cron for auto-pruning (if not already) ───

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ─── 3. Auto-prune old data (30-day retention) ───
-- Removes any existing job with same name so this is safely re-runnable.

DO $$
BEGIN
  PERFORM cron.unschedule('adspx-prune-traffic-logs');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('adspx-prune-clicks');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('adspx-prune-fbclid');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('adspx-prune-velocity');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('adspx-prune-fingerprints');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('adspx-vacuum-hot-tables');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Delete raw click logs older than 30 days (dashboard shows 30-day window)
SELECT cron.schedule(
  'adspx-prune-traffic-logs',
  '17 3 * * *',   -- 03:17 UTC daily (off-peak)
  $$ DELETE FROM public.traffic_logs WHERE created_at < now() - interval '30 days'; $$
);

SELECT cron.schedule(
  'adspx-prune-clicks',
  '23 3 * * *',
  $$ DELETE FROM public.clicks WHERE created_at < now() - interval '30 days'; $$
);

-- fbclid re-use detection window is 2 hours; keep 24h for safety
SELECT cron.schedule(
  'adspx-prune-fbclid',
  '*/30 * * * *',  -- every 30 min
  $$ DELETE FROM public.fbclid_tracking WHERE last_seen < now() - interval '24 hours'; $$
);

-- velocity_tracking window is 1 hour; prune anything > 2 hours
SELECT cron.schedule(
  'adspx-prune-velocity',
  '*/15 * * * *',
  $$ DELETE FROM public.velocity_tracking WHERE last_seen < now() - interval '2 hours'; $$
);

-- Bot fingerprints: keep auto-blocked forever, prune unblocked older than 7 days
SELECT cron.schedule(
  'adspx-prune-fingerprints',
  '31 3 * * *',
  $$ DELETE FROM public.bot_fingerprints
     WHERE last_seen < now() - interval '7 days' AND auto_blocked = false; $$
);

-- Weekly VACUUM ANALYZE on hot tables (autovacuum sob somoy handle korte pare na high-write e)
SELECT cron.schedule(
  'adspx-vacuum-hot-tables',
  '0 4 * * 0',    -- Sunday 04:00 UTC
  $$
  VACUUM ANALYZE public.traffic_logs;
  VACUUM ANALYZE public.clicks;
  VACUUM ANALYZE public.bot_fingerprints;
  VACUUM ANALYZE public.fbclid_tracking;
  VACUUM ANALYZE public.velocity_tracking;
  VACUUM ANALYZE public.earnings_ledger;
  $$
);

-- ─── 4. Verification ───

\echo '=== Scheduled jobs ==='
SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE 'adspx-%' ORDER BY jobname;

\echo ''
\echo '=== Remaining indexes on hot tables (duplicates removed) ==='
SELECT tablename, COUNT(*) AS index_count
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('traffic_logs','clicks','earnings_ledger')
GROUP BY tablename;
