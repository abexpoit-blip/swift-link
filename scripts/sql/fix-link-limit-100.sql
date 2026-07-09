-- Bump free plan link_limit from 1 to 100
-- Apply on VPS:
--   docker exec -i supabase-db psql -U supabase_admin -d postgres < scripts/sql/fix-link-limit-100.sql

BEGIN;

-- 1) Free package
UPDATE public.packages SET link_limit = 100 WHERE slug = 'free';

-- 2) Column defaults
ALTER TABLE public.profiles ALTER COLUMN link_limit SET DEFAULT 100;
ALTER TABLE public.packages ALTER COLUMN link_limit SET DEFAULT 100;

-- 3) Existing free users
UPDATE public.profiles
  SET link_limit = 100
  WHERE plan_slug = 'free' AND (link_limit IS NULL OR link_limit < 100);

-- 4) handle_new_user: default 100 for new signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_email text := lower(COALESCE(NEW.email, ''));
  v_role public.app_role := CASE WHEN lower(COALESCE(NEW.email, ''))='admin@sleepox.com' THEN 'admin'::public.app_role ELSE 'user'::public.app_role END;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, telegram, plan_slug, click_quota, link_limit)
  VALUES (
    NEW.id, v_email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name',''), split_part(v_email,'@',1)),
    NULLIF(NEW.raw_user_meta_data->>'telegram',''),
    CASE WHEN v_role='admin' THEN 'lifetime' ELSE 'free' END,
    CASE WHEN v_role='admin' THEN NULL ELSE 10000 END,
    CASE WHEN v_role='admin' THEN NULL ELSE 100 END
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role) ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

COMMIT;

SELECT slug, link_limit FROM public.packages WHERE slug='free';
SELECT count(*) AS free_users_at_100 FROM public.profiles WHERE plan_slug='free' AND link_limit=100;
