
DROP FUNCTION IF EXISTS public.admin_list_users(text, integer);

CREATE OR REPLACE FUNCTION public.admin_list_users(_search text DEFAULT NULL::text, _limit integer DEFAULT 100)
RETURNS TABLE(
  id uuid, email text, full_name text, plan_slug text,
  banned boolean, banned_reason text,
  email_confirmed_at timestamp with time zone,
  last_login_at timestamp with time zone,
  created_at timestamp with time zone,
  links_used integer, clicks_used bigint, balance_available numeric
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
END $function$;
