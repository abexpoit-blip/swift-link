UPDATE public.profiles
SET link_limit = 100
WHERE plan_slug = 'free'
  AND NOT public.has_role(id, 'admin')
  AND (link_limit IS NULL OR link_limit < 100);

CREATE OR REPLACE FUNCTION public.sync_quota_on_plan_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_link_limit int;
  v_click_quota bigint;
BEGIN
  IF NEW.plan_slug IS DISTINCT FROM OLD.plan_slug THEN
    SELECT link_limit, click_quota
    INTO v_link_limit, v_click_quota
    FROM public.packages
    WHERE slug = NEW.plan_slug
      AND is_active = true;

    IF NEW.plan_slug = 'free' THEN
      NEW.link_limit := GREATEST(COALESCE(v_link_limit, 100), 100);
    ELSE
      NEW.link_limit := v_link_limit;
    END IF;

    NEW.click_quota := v_click_quota;
    NEW.links_used := 0;
    NEW.clicks_used := 0;
    NEW.clicks_period_start := now();
  END IF;

  IF public.has_role(NEW.id, 'admin') THEN
    NEW.link_limit := NULL;
    NEW.click_quota := NULL;
  END IF;

  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email text := lower(COALESCE(NEW.email, ''));
  v_role public.app_role := CASE WHEN lower(COALESCE(NEW.email, '')) = 'admin@sleepox.com' THEN 'admin'::public.app_role ELSE 'user'::public.app_role END;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, telegram, plan_slug, click_quota, link_limit)
  VALUES (
    NEW.id,
    v_email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(v_email, '@', 1)),
    NULLIF(NEW.raw_user_meta_data->>'telegram', ''),
    CASE WHEN v_role = 'admin' THEN 'lifetime' ELSE 'free' END,
    CASE WHEN v_role = 'admin' THEN NULL ELSE 10000 END,
    CASE WHEN v_role = 'admin' THEN NULL ELSE 100 END
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END
$$;