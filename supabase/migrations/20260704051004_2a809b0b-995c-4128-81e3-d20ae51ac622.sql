UPDATE public.packages
SET link_limit = 100
WHERE slug = 'free'
  AND (link_limit IS NULL OR link_limit < 100);

UPDATE public.profiles
SET link_limit = 100
WHERE plan_slug = 'free'
  AND (link_limit IS NULL OR link_limit < 100);

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
  ELSIF COALESCE(v_limit, 0) < 100 AND COALESCE((SELECT plan_slug FROM public.profiles WHERE id = NEW.user_id), 'free') = 'free' THEN
    v_limit := 100;
    UPDATE public.profiles SET link_limit = 100 WHERE id = NEW.user_id;
  END IF;

  IF COALESCE(v_is_admin, false) THEN
    UPDATE public.profiles SET links_used = links_used + 1 WHERE id = NEW.user_id;
    RETURN NEW;
  END IF;

  IF v_limit IS NOT NULL AND v_used >= v_limit THEN
    RAISE EXCEPTION 'Link limit reached (%/%). Please upgrade your plan.', v_used, v_limit;
  END IF;

  UPDATE public.profiles SET links_used = links_used + 1 WHERE id = NEW.user_id;
  RETURN NEW;
END
$$;