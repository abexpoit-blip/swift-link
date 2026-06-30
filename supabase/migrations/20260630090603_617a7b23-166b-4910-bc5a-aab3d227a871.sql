
-- promote existing primary admin
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'super_admin'::public.app_role
  FROM auth.users u
 WHERE lower(u.email) = 'admin@sleepox.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- tighten delete to super_admin
CREATE OR REPLACE FUNCTION public.admin_delete_user(_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only super-admin can permanently delete users';
  END IF;
  DELETE FROM auth.users WHERE id = _user_id;
END $$;

-- on new signup: admin@sleepox.com also gets super_admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_email text := lower(COALESCE(NEW.email, ''));
  v_is_admin boolean := v_email = 'admin@sleepox.com';
BEGIN
  INSERT INTO public.profiles (id, email, full_name, telegram, plan_slug, click_quota, link_limit)
  VALUES (
    NEW.id, v_email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name',''), split_part(v_email,'@',1)),
    NULLIF(NEW.raw_user_meta_data->>'telegram',''),
    CASE WHEN v_is_admin THEN 'lifetime' ELSE 'free' END,
    CASE WHEN v_is_admin THEN NULL ELSE 10000 END,
    CASE WHEN v_is_admin THEN NULL ELSE 1 END
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN v_is_admin THEN 'admin'::public.app_role ELSE 'user'::public.app_role END)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF v_is_admin THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'signup trigger failed id=% email=% error=% state=%', NEW.id, v_email, SQLERRM, SQLSTATE;
  RAISE;
END $$;

-- block link creation for unverified users
CREATE OR REPLACE FUNCTION public.require_verified_email_for_links()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_confirmed timestamptz;
BEGIN
  IF public.has_role(NEW.user_id, 'admin') OR public.has_role(NEW.user_id, 'super_admin') THEN
    RETURN NEW;
  END IF;
  SELECT email_confirmed_at INTO v_confirmed FROM auth.users WHERE id = NEW.user_id;
  IF v_confirmed IS NULL THEN
    RAISE EXCEPTION 'Please verify your email before creating links.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_require_verified_email_for_links ON public.links;
CREATE TRIGGER trg_require_verified_email_for_links
  BEFORE INSERT ON public.links
  FOR EACH ROW EXECUTE FUNCTION public.require_verified_email_for_links();
