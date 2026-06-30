
-- 1. profiles columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS banned_reason text;

-- 2. key/value system settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone authed can read settings" ON public.system_settings;
CREATE POLICY "anyone authed can read settings" ON public.system_settings
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admins manage settings" ON public.system_settings;
CREATE POLICY "admins manage settings" ON public.system_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.system_settings (key, value) VALUES
  ('inactive_days', '14'::jsonb),
  ('allowed_email_domains', '["gmail.com"]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 3. touch last login
CREATE OR REPLACE FUNCTION public.touch_last_login()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles SET last_login_at = now() WHERE id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.touch_last_login() TO authenticated;

-- 4. admin: delete user
CREATE OR REPLACE FUNCTION public.admin_delete_user(_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  DELETE FROM auth.users WHERE id = _user_id;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;

-- 5. admin: ban/unban
CREATE OR REPLACE FUNCTION public.admin_set_banned(_user_id uuid, _banned boolean, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.profiles
     SET banned = _banned,
         banned_reason = CASE WHEN _banned THEN _reason ELSE NULL END
   WHERE id = _user_id;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_set_banned(uuid, boolean, text) TO authenticated;

-- 6. admin: verify email
CREATE OR REPLACE FUNCTION public.admin_verify_email(_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE auth.users SET email_confirmed_at = COALESCE(email_confirmed_at, now())
   WHERE id = _user_id;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_verify_email(uuid) TO authenticated;

-- 7. admin list users
CREATE OR REPLACE FUNCTION public.admin_list_users(_search text DEFAULT NULL, _limit int DEFAULT 100)
RETURNS TABLE (
  id uuid, email text, full_name text, plan_slug text,
  banned boolean, banned_reason text,
  email_confirmed_at timestamptz,
  last_login_at timestamptz, created_at timestamptz,
  links_used int, clicks_used int, balance_available numeric
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY
    SELECT p.id, p.email, p.full_name, p.plan_slug, p.banned, p.banned_reason,
           u.email_confirmed_at, p.last_login_at, p.created_at,
           p.links_used, p.clicks_used, p.balance_available
      FROM public.profiles p
      LEFT JOIN auth.users u ON u.id = p.id
     WHERE _search IS NULL OR _search = ''
        OR p.email ILIKE '%'||_search||'%'
        OR p.full_name ILIKE '%'||_search||'%'
     ORDER BY p.created_at DESC
     LIMIT GREATEST(1, LEAST(_limit, 500));
END $$;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text, int) TO authenticated;

-- 8. purge inactive users
CREATE OR REPLACE FUNCTION public.purge_inactive_users()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_days int; v_count int := 0;
BEGIN
  SELECT COALESCE((value)::text::int, 14) INTO v_days
    FROM public.system_settings WHERE key = 'inactive_days';
  IF v_days IS NULL OR v_days <= 0 THEN v_days := 14; END IF;

  WITH victims AS (
    SELECT p.id FROM public.profiles p
     WHERE p.last_login_at < now() - (v_days || ' days')::interval
       AND NOT public.has_role(p.id, 'admin')
  ), del AS (
    DELETE FROM auth.users u USING victims v WHERE u.id = v.id RETURNING u.id
  )
  SELECT COUNT(*) INTO v_count FROM del;
  RETURN v_count;
END $$;

-- 9. daily cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$ BEGIN
  PERFORM cron.unschedule('purge-inactive-users')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='purge-inactive-users');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('purge-inactive-users', '0 3 * * *', $$SELECT public.purge_inactive_users();$$);
