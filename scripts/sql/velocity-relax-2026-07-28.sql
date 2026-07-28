-- Reduce false-positive blocks on real users (2026-07-28)
-- 1) velocity_lock: 3 distinct short_codes/hour -> 8 (real users click multiple links)
-- 2) release currently stuck locks + stale learned-bot marks
-- Apply on VPS:
--   docker exec -i supabase-db psql -U supabase_admin -d postgres < scripts/sql/velocity-relax-2026-07-28.sql

BEGIN;

-- Release existing false locks
UPDATE public.velocity_tracking SET blocked = false WHERE blocked = true;

-- Un-block learned fingerprints that were only flagged by velocity noise
UPDATE public.bot_fingerprints
   SET auto_blocked = false
 WHERE auto_blocked = true
   AND bot_hits::float / GREATEST(hit_count, 1) < 0.9;

COMMIT;

\echo '=== Patching evaluate_redirect: velocity threshold 3 -> 8 ==='

DO $patch$
DECLARE
  v_src text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_src
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'evaluate_redirect';

  IF v_src IS NULL THEN
    RAISE EXCEPTION 'evaluate_redirect not found';
  END IF;

  -- velocity threshold
  v_src := replace(
    v_src,
    'array_length(array_append(velocity_tracking.short_codes, _short_code), 1) >= 3',
    'array_length(array_append(velocity_tracking.short_codes, _short_code), 1) >= 8'
  );

  -- learned_bot: require a stronger bot ratio before punishing a fingerprint
  v_src := replace(
    v_src,
    'AND bot_hits::float / GREATEST(hit_count, 1) >= 0.7',
    'AND bot_hits::float / GREATEST(hit_count, 1) >= 0.9'
  );

  -- never soft-block a confirmed mobile visitor via velocity/learned layers
  v_src := replace(
    v_src,
    'IF v_velocity.blocked THEN',
    'IF v_velocity.blocked AND NOT v_mobile THEN'
  );

  EXECUTE v_src;
END
$patch$;

\echo '=== Verify patch applied ==='
SELECT
  position('>= 8' in pg_get_functiondef(p.oid)) > 0 AS velocity_8,
  position('>= 0.9' in pg_get_functiondef(p.oid)) > 0 AS learned_09,
  position('v_velocity.blocked AND NOT v_mobile' in pg_get_functiondef(p.oid)) > 0 AS mobile_safe
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'evaluate_redirect';
