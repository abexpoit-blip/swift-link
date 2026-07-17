-- AdsPx statistics performance hotfix
-- Run this on the production VPS database. It makes old browser bundles fast
-- and guarantees future clicks are queryable directly by user_id.

\echo '==> Ensuring clicks.user_id exists'
ALTER TABLE public.clicks
  ADD COLUMN IF NOT EXISTS user_id uuid;

\echo '==> Backfilling clicks.user_id from links'
UPDATE public.clicks c
SET user_id = l.user_id
FROM public.links l
WHERE c.link_id = l.id
  AND c.user_id IS NULL;

\echo '==> Keeping clicks.user_id populated for new rows'
CREATE OR REPLACE FUNCTION public.set_click_user_id_from_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.link_id IS NOT NULL AND NEW.user_id IS NULL THEN
    SELECT l.user_id INTO NEW.user_id
    FROM public.links l
    WHERE l.id = NEW.link_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clicks_set_user_id ON public.clicks;
CREATE TRIGGER trg_clicks_set_user_id
BEFORE INSERT OR UPDATE OF link_id, user_id ON public.clicks
FOR EACH ROW
EXECUTE FUNCTION public.set_click_user_id_from_link();

\echo '==> Creating covering indexes for statistics page'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clicks_user_created_cover
  ON public.clicks (user_id, created_at)
  INCLUDE (country, referer_host, is_bot);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_traffic_logs_user_created_cover
  ON public.traffic_logs (user_id, created_at)
  INCLUDE (decision, country, referer);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_traffic_logs_user_decision_created
  ON public.traffic_logs (user_id, decision, created_at);

\echo '==> Creating compatibility indexes for old browser bundles'
-- Old cached bundles used PostgREST embedding: clicks + links!inner(user_id).
-- Keep that legacy query fast even if a stale tab or direct API client still calls it.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_links_user_id_id
  ON public.links (user_id, id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clicks_link_created_cover
  ON public.clicks (link_id, created_at)
  INCLUDE (country, referer_host, is_bot);

\echo '==> Refreshing planner stats'
ANALYZE public.clicks;
ANALYZE public.traffic_logs;
ANALYZE public.links;

\echo '==> Verifying remaining rows without user_id'
SELECT count(*) AS clicks_without_user_id
FROM public.clicks
WHERE user_id IS NULL;

\echo '✅ Statistics performance hotfix complete'