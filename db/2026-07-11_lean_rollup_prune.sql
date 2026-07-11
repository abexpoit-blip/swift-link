-- =====================================================================
-- AdsPx: Lean click storage + daily rollup + traffic_logs prune
-- Run on: self-hosted Supabase VPS (NOT Lovable Cloud)
--
-- Deploy:
--   scp db/2026-07-11_lean_rollup_prune.sql root@VPS:/tmp/
--   docker exec -i supabase-db psql -U supabase_admin -d postgres < /tmp/2026-07-11_lean_rollup_prune.sql
-- =====================================================================

-- 1) Extensions (needed for scheduled jobs)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2) Indexes to make rollup + prune fast (safe if already exist)
CREATE INDEX IF NOT EXISTS idx_clicks_created_at        ON public.clicks (created_at);
CREATE INDEX IF NOT EXISTS idx_clicks_link_created      ON public.clicks (link_id, created_at);
CREATE INDEX IF NOT EXISTS idx_traffic_logs_created_at  ON public.traffic_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_day      ON public.earnings_ledger (day);

-- 3) Daily rollup reconciler
--    Rebuilds/verifies earnings_ledger from clicks for the last N days.
--    Uses upsert so it never double-counts. Safe to run repeatedly.
--    Formula matches record_earning_click():
--        adsterra_clicks = floor(total_clicks / 20)     (5% ads injection)
--        user_clicks     = total_clicks - adsterra_clicks
--        earnings_usd    = user_clicks / 50000          ($0.00002 per click)
CREATE OR REPLACE FUNCTION public.reconcile_earnings_ledger(_days int DEFAULT 3)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows int;
BEGIN
  WITH agg AS (
    SELECT
      l.user_id,
      c.link_id,
      (c.created_at AT TIME ZONE 'utc')::date AS day,
      COUNT(*) FILTER (WHERE c.is_bot = false)::int AS total_clicks
    FROM public.clicks c
    JOIN public.links  l ON l.id = c.link_id
    WHERE c.created_at >= now() - (_days || ' days')::interval
      AND c.is_bot = false
    GROUP BY l.user_id, c.link_id, (c.created_at AT TIME ZONE 'utc')::date
  ), calc AS (
    SELECT
      user_id, link_id, day, total_clicks,
      FLOOR(total_clicks::numeric / 20)::int AS adsterra_clicks,
      total_clicks - FLOOR(total_clicks::numeric / 20)::int AS user_clicks,
      (total_clicks - FLOOR(total_clicks::numeric / 20)::int)::numeric / 50000 AS earnings_usd
    FROM agg
  )
  INSERT INTO public.earnings_ledger
    (user_id, link_id, day, total_clicks, adsterra_clicks, user_clicks, earnings_usd)
  SELECT user_id, link_id, day, total_clicks, adsterra_clicks, user_clicks, earnings_usd
  FROM calc
  ON CONFLICT (user_id, link_id, day) DO UPDATE
    SET total_clicks    = EXCLUDED.total_clicks,
        adsterra_clicks = EXCLUDED.adsterra_clicks,
        user_clicks     = EXCLUDED.user_clicks,
        earnings_usd    = EXCLUDED.earnings_usd;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END $$;

-- 4) Prune raw traffic_logs older than N days (default 30) — keeps DB lean.
--    clicks table also gets pruned older than 90 days (counters + ledger keep history).
CREATE OR REPLACE FUNCTION public.prune_raw_logs(
  _traffic_days int DEFAULT 30,
  _clicks_days  int DEFAULT 90
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tlogs int;
  v_clicks int;
BEGIN
  DELETE FROM public.traffic_logs
   WHERE created_at < now() - (_traffic_days || ' days')::interval;
  GET DIAGNOSTICS v_tlogs = ROW_COUNT;

  DELETE FROM public.clicks
   WHERE created_at < now() - (_clicks_days || ' days')::interval;
  GET DIAGNOSTICS v_clicks = ROW_COUNT;

  RETURN jsonb_build_object(
    'pruned_traffic_logs', v_tlogs,
    'pruned_clicks',       v_clicks,
    'run_at',              now()
  );
END $$;

-- 5) Schedule via pg_cron
--    - reconcile earnings every hour (covers last 3 days, safe re-runs)
--    - prune raw logs daily at 03:15 UTC
--    Remove old schedules first so re-running this file is idempotent.
DO $$
BEGIN
  PERFORM cron.unschedule('adspx-reconcile-earnings') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'adspx-reconcile-earnings');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$
BEGIN
  PERFORM cron.unschedule('adspx-prune-raw-logs') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'adspx-prune-raw-logs');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'adspx-reconcile-earnings',
  '5 * * * *',                                     -- every hour at :05
  $$ SELECT public.reconcile_earnings_ledger(3); $$
);

SELECT cron.schedule(
  'adspx-prune-raw-logs',
  '15 3 * * *',                                    -- 03:15 UTC daily
  $$ SELECT public.prune_raw_logs(30, 90); $$
);

-- 6) One-time reconciliation for the last 30 days (fills historical gaps)
SELECT public.reconcile_earnings_ledger(30) AS reconciled_rows;

-- 7) Verify
SELECT jobname, schedule, command FROM cron.job WHERE jobname LIKE 'adspx-%';
