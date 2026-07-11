-- =====================================================================
-- AdsPx: Fast, non-blocking link delete + active-link quota repair
-- Run on: self-hosted Supabase VPS (NOT Lovable Cloud)
--
-- Deploy:
--   scp db/2026-07-11_fast_link_delete.sql root@VPS:/tmp/
--   docker exec -i supabase-db psql -U supabase_admin -d postgres < /tmp/2026-07-11_fast_link_delete.sql
-- =====================================================================

-- Keep list/delete/create fast under heavy click volume:
-- - UI delete marks a link inactive instead of physically deleting millions of
--   child click/log rows in the user request.
-- - Redirect code already refuses inactive links.
-- - Raw logs are still pruned by the existing scheduled prune job.
CREATE INDEX IF NOT EXISTS idx_links_user_active_created
  ON public.links (user_id, is_active, created_at DESC);

CREATE OR REPLACE FUNCTION public.delete_user_link_fast(_link_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  UPDATE public.links
     SET is_active = false,
         updated_at = now()
   WHERE id = _link_id
     AND user_id = auth.uid()
     AND is_active = true
   RETURNING user_id INTO v_user_id;

  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
     SET links_used = GREATEST(COALESCE(links_used, 0) - 1, 0)
   WHERE id = v_user_id;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_user_link_fast(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_user_link_fast(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_link_fast(uuid) TO service_role;

-- Make quota enforcement self-healing: old hard-deletes / failed deletes can
-- leave profiles.links_used stale. Recount active links while the profile row is
-- locked, then enforce the limit using the repaired number.
CREATE OR REPLACE FUNCTION public.enforce_link_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_used int;
  v_limit int;
  v_is_admin boolean;
  v_free_click_quota bigint;
  v_free_link_limit int;
BEGIN
  SELECT public.has_role(NEW.user_id, 'admin') INTO v_is_admin;

  SELECT links_used, link_limit
  INTO v_used, v_limit
  FROM public.profiles
  WHERE id = NEW.user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    SELECT click_quota, link_limit
    INTO v_free_click_quota, v_free_link_limit
    FROM public.packages
    WHERE slug = 'free';

    INSERT INTO public.profiles (id, plan_slug, click_quota, link_limit, links_used)
    VALUES (NEW.user_id, 'free', COALESCE(v_free_click_quota, 10000), GREATEST(COALESCE(v_free_link_limit, 100), 100), 0);

    v_used := 0;
    v_limit := GREATEST(COALESCE(v_free_link_limit, 100), 100);
  ELSE
    SELECT COUNT(*)::int
    INTO v_used
    FROM public.links
    WHERE user_id = NEW.user_id
      AND is_active = true;

    UPDATE public.profiles
       SET links_used = v_used
     WHERE id = NEW.user_id;

    IF COALESCE(v_limit, 0) < 100 AND COALESCE((SELECT plan_slug FROM public.profiles WHERE id = NEW.user_id), 'free') = 'free' THEN
      v_limit := 100;
      UPDATE public.profiles SET link_limit = 100 WHERE id = NEW.user_id;
    END IF;
  END IF;

  IF COALESCE(v_is_admin, false) THEN
    UPDATE public.profiles SET links_used = v_used + 1 WHERE id = NEW.user_id;
    RETURN NEW;
  END IF;

  IF v_limit IS NOT NULL AND v_used >= v_limit THEN
    RAISE EXCEPTION 'Link limit reached (%/%). Please upgrade your plan.', v_used, v_limit;
  END IF;

  UPDATE public.profiles SET links_used = v_used + 1 WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_link_quota() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_link_quota() TO service_role;

-- One-time repair for existing users: count only active links.
UPDATE public.profiles p
   SET links_used = COALESCE(x.active_links, 0)
  FROM (
    SELECT user_id, COUNT(*)::int AS active_links
    FROM public.links
    WHERE is_active = true
    GROUP BY user_id
  ) x
 WHERE p.id = x.user_id;

UPDATE public.profiles p
   SET links_used = 0
 WHERE NOT EXISTS (
   SELECT 1 FROM public.links l
   WHERE l.user_id = p.id
     AND l.is_active = true
 );

-- Verify
SELECT proname FROM pg_proc WHERE proname IN ('delete_user_link_fast', 'enforce_link_quota') ORDER BY proname;