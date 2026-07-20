-- ============================================================
-- AdsPx ULTIMATE SETUP (2026-07-20)
-- 1 year old platform · zero-pressure stats · rate-limit
-- auto-archive · circuit breaker · anniversary
-- Run on VPS:  psql -f ultimate-setup-2026-07-20.sql
-- Safe to re-run.
-- ============================================================

\echo '==> [1/6] stats_cache — pre-computed per-user dashboard snapshot'

-- UNLOGGED = no WAL, blazing fast, perfect for regeneratable cache
CREATE UNLOGGED TABLE IF NOT EXISTS public.stats_cache (
  user_id            uuid PRIMARY KEY,
  total_24h          bigint      NOT NULL DEFAULT 0,
  humans_24h         bigint      NOT NULL DEFAULT 0,
  bots_24h           bigint      NOT NULL DEFAULT 0,
  total_7d           bigint      NOT NULL DEFAULT 0,
  humans_7d          bigint      NOT NULL DEFAULT 0,
  total_30d          bigint      NOT NULL DEFAULT 0,
  humans_30d         bigint      NOT NULL DEFAULT 0,
  earnings_today     numeric(12,6) NOT NULL DEFAULT 0,
  earnings_total     numeric(12,6) NOT NULL DEFAULT 0,
  balance_available  numeric(12,6) NOT NULL DEFAULT 0,
  top_countries      jsonb       NOT NULL DEFAULT '[]'::jsonb,
  top_referers       jsonb       NOT NULL DEFAULT '[]'::jsonb,
  daily_series       jsonb       NOT NULL DEFAULT '[]'::jsonb,
  refreshed_at       timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stats_cache TO authenticated;
GRANT ALL    ON public.stats_cache TO service_role;
ALTER TABLE public.stats_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS stats_cache_owner ON public.stats_cache;
CREATE POLICY stats_cache_owner ON public.stats_cache FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

\echo '==> [2/6] refresh_stats_cache() — background aggregator'

CREATE OR REPLACE FUNCTION public.refresh_stats_cache(_user_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count int := 0;
BEGIN
  WITH targets AS (
    SELECT DISTINCT user_id
      FROM public.traffic_logs
     WHERE created_at > now() - interval '31 days'
       AND (_user_id IS NULL OR user_id = _user_id)
  ),
  agg AS (
    SELECT
      t.user_id,
      COUNT(*) FILTER (WHERE tl.created_at > now() - interval '24 hours')                                       AS total_24h,
      COUNT(*) FILTER (WHERE tl.created_at > now() - interval '24 hours' AND tl.decision = 'money')             AS humans_24h,
      COUNT(*) FILTER (WHERE tl.created_at > now() - interval '24 hours' AND tl.decision <> 'money')            AS bots_24h,
      COUNT(*) FILTER (WHERE tl.created_at > now() - interval '7 days')                                         AS total_7d,
      COUNT(*) FILTER (WHERE tl.created_at > now() - interval '7 days'  AND tl.decision = 'money')              AS humans_7d,
      COUNT(*)                                                                                                  AS total_30d,
      COUNT(*) FILTER (WHERE tl.decision = 'money')                                                             AS humans_30d
    FROM targets t
    LEFT JOIN public.traffic_logs tl
      ON tl.user_id = t.user_id AND tl.created_at > now() - interval '30 days'
    GROUP BY t.user_id
  ),
  earn AS (
    SELECT user_id,
           COALESCE(SUM(earnings_usd) FILTER (WHERE day = (now() AT TIME ZONE 'utc')::date), 0) AS earnings_today,
           COALESCE(SUM(earnings_usd), 0) AS earnings_total
      FROM public.earnings_ledger
     WHERE (_user_id IS NULL OR user_id = _user_id)
     GROUP BY user_id
  ),
  bal AS (
    SELECT id AS user_id, COALESCE(balance_available, 0) AS balance_available
      FROM public.profiles
     WHERE (_user_id IS NULL OR id = _user_id)
  ),
  countries AS (
    SELECT user_id,
           jsonb_agg(jsonb_build_object('country', country, 'clicks', c) ORDER BY c DESC) AS top_countries
      FROM (
        SELECT user_id, UPPER(COALESCE(country,'')) AS country, COUNT(*) AS c
          FROM public.traffic_logs
         WHERE created_at > now() - interval '7 days'
           AND (_user_id IS NULL OR user_id = _user_id)
           AND COALESCE(country,'') <> ''
         GROUP BY user_id, UPPER(country)
      ) x
     GROUP BY user_id
  ),
  refs AS (
    SELECT user_id,
           jsonb_agg(jsonb_build_object('referer', referer, 'clicks', c) ORDER BY c DESC) AS top_referers
      FROM (
        SELECT user_id, COALESCE(referer,'direct') AS referer, COUNT(*) AS c
          FROM public.traffic_logs
         WHERE created_at > now() - interval '7 days'
           AND (_user_id IS NULL OR user_id = _user_id)
         GROUP BY user_id, COALESCE(referer,'direct')
      ) x
     GROUP BY user_id
  ),
  series AS (
    SELECT user_id,
           jsonb_agg(jsonb_build_object('date', d, 'humans', h, 'bots', b) ORDER BY d) AS daily_series
      FROM (
        SELECT user_id,
               (created_at AT TIME ZONE 'utc')::date AS d,
               COUNT(*) FILTER (WHERE decision = 'money')  AS h,
               COUNT(*) FILTER (WHERE decision <> 'money') AS b
          FROM public.traffic_logs
         WHERE created_at > now() - interval '30 days'
           AND (_user_id IS NULL OR user_id = _user_id)
         GROUP BY user_id, (created_at AT TIME ZONE 'utc')::date
      ) x
     GROUP BY user_id
  )
  INSERT INTO public.stats_cache AS sc (
    user_id, total_24h, humans_24h, bots_24h, total_7d, humans_7d,
    total_30d, humans_30d, earnings_today, earnings_total, balance_available,
    top_countries, top_referers, daily_series, refreshed_at
  )
  SELECT a.user_id,
         a.total_24h, a.humans_24h, a.bots_24h,
         a.total_7d, a.humans_7d, a.total_30d, a.humans_30d,
         COALESCE(e.earnings_today, 0), COALESCE(e.earnings_total, 0),
         COALESCE(b.balance_available, 0),
         COALESCE(c.top_countries, '[]'::jsonb),
         COALESCE(r.top_referers, '[]'::jsonb),
         COALESCE(s.daily_series, '[]'::jsonb),
         now()
    FROM agg a
    LEFT JOIN earn      e USING (user_id)
    LEFT JOIN bal       b USING (user_id)
    LEFT JOIN countries c USING (user_id)
    LEFT JOIN refs      r USING (user_id)
    LEFT JOIN series    s USING (user_id)
  ON CONFLICT (user_id) DO UPDATE SET
    total_24h = EXCLUDED.total_24h,
    humans_24h = EXCLUDED.humans_24h,
    bots_24h = EXCLUDED.bots_24h,
    total_7d = EXCLUDED.total_7d,
    humans_7d = EXCLUDED.humans_7d,
    total_30d = EXCLUDED.total_30d,
    humans_30d = EXCLUDED.humans_30d,
    earnings_today = EXCLUDED.earnings_today,
    earnings_total = EXCLUDED.earnings_total,
    balance_available = EXCLUDED.balance_available,
    top_countries = EXCLUDED.top_countries,
    top_referers = EXCLUDED.top_referers,
    daily_series = EXCLUDED.daily_series,
    refreshed_at = EXCLUDED.refreshed_at;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

GRANT EXECUTE ON FUNCTION public.refresh_stats_cache(uuid) TO authenticated, service_role;

\echo '==> [3/6] pg_cron — auto-refresh cache every 30s (all users, batched)'

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove previous schedule if exists
DO $$
BEGIN
  PERFORM cron.unschedule('adspx_refresh_stats_cache')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='adspx_refresh_stats_cache');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'adspx_refresh_stats_cache',
  '*/1 * * * *',   -- every minute (pg_cron minimum); still trivial load
  $$SELECT public.refresh_stats_cache(NULL);$$
);

\echo '==> [4/6] Rate limiter — per-IP short-window throttle for /r/*'

CREATE UNLOGGED TABLE IF NOT EXISTS public.rate_limit_bucket (
  ip           text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  hits         int         NOT NULL DEFAULT 1,
  blocked_until timestamptz
);
CREATE INDEX IF NOT EXISTS idx_ratelimit_window ON public.rate_limit_bucket(window_start);

CREATE OR REPLACE FUNCTION public.rate_limit_check(_ip text, _max int DEFAULT 120, _window_seconds int DEFAULT 10)
RETURNS boolean   -- true = allowed, false = throttle
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_blocked boolean := false;
BEGIN
  IF _ip IS NULL OR _ip = '' THEN RETURN true; END IF;

  INSERT INTO public.rate_limit_bucket(ip, window_start, hits)
  VALUES (_ip, now(), 1)
  ON CONFLICT (ip) DO UPDATE
    SET hits = CASE WHEN rate_limit_bucket.window_start < now() - (_window_seconds || ' seconds')::interval
                    THEN 1 ELSE rate_limit_bucket.hits + 1 END,
        window_start = CASE WHEN rate_limit_bucket.window_start < now() - (_window_seconds || ' seconds')::interval
                            THEN now() ELSE rate_limit_bucket.window_start END,
        blocked_until = CASE WHEN rate_limit_bucket.hits + 1 > _max AND rate_limit_bucket.window_start >= now() - (_window_seconds || ' seconds')::interval
                              THEN now() + interval '60 seconds'
                              ELSE rate_limit_bucket.blocked_until END
  RETURNING (blocked_until IS NOT NULL AND blocked_until > now()) INTO v_blocked;

  RETURN NOT v_blocked;
END $$;

GRANT EXECUTE ON FUNCTION public.rate_limit_check(text, int, int) TO anon, authenticated, service_role;

-- daily cleanup
DO $$ BEGIN
  PERFORM cron.unschedule('adspx_ratelimit_cleanup')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='adspx_ratelimit_cleanup');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('adspx_ratelimit_cleanup','*/15 * * * *',
  $$DELETE FROM public.rate_limit_bucket WHERE window_start < now() - interval '30 minutes';$$);

\echo '==> [5/6] Auto-archive — clicks/traffic_logs older than 30 days → cold table'

CREATE TABLE IF NOT EXISTS public.clicks_archive (LIKE public.clicks INCLUDING DEFAULTS INCLUDING INDEXES);
CREATE TABLE IF NOT EXISTS public.traffic_logs_archive (LIKE public.traffic_logs INCLUDING DEFAULTS INCLUDING INDEXES);

CREATE OR REPLACE FUNCTION public.archive_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  WITH moved AS (
    DELETE FROM public.clicks WHERE created_at < now() - interval '30 days' RETURNING *
  )
  INSERT INTO public.clicks_archive SELECT * FROM moved;

  WITH moved AS (
    DELETE FROM public.traffic_logs WHERE created_at < now() - interval '30 days' RETURNING *
  )
  INSERT INTO public.traffic_logs_archive SELECT * FROM moved;
END $$;

DO $$ BEGIN
  PERFORM cron.unschedule('adspx_archive_old_data')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='adspx_archive_old_data');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('adspx_archive_old_data','30 3 * * *',
  $$SELECT public.archive_old_data();$$);

\echo '==> [6/6] Circuit breaker — DB pressure monitor (system_settings switch)'

INSERT INTO public.system_settings(key, value)
VALUES ('circuit_breaker_active', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.check_db_pressure()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_conn int;
  v_max_conn    int;
  v_ratio       numeric;
BEGIN
  SELECT COUNT(*) INTO v_active_conn FROM pg_stat_activity WHERE state = 'active';
  SELECT setting::int INTO v_max_conn FROM pg_settings WHERE name = 'max_connections';
  v_ratio := v_active_conn::numeric / GREATEST(v_max_conn,1);

  UPDATE public.system_settings
     SET value = (CASE WHEN v_ratio > 0.85 THEN 'true' ELSE 'false' END)::jsonb
   WHERE key = 'circuit_breaker_active';
END $$;

DO $$ BEGIN
  PERFORM cron.unschedule('adspx_circuit_breaker')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='adspx_circuit_breaker');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('adspx_circuit_breaker','*/1 * * * *',
  $$SELECT public.check_db_pressure();$$);

-- Prime cache immediately
SELECT public.refresh_stats_cache(NULL);

\echo '==> DONE. Verify:'
\echo '   SELECT jobname, schedule FROM cron.job WHERE jobname LIKE ''adspx_%'';'
\echo '   SELECT count(*) FROM public.stats_cache;'
