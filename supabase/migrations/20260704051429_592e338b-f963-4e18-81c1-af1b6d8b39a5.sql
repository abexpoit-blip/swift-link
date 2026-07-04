REVOKE EXECUTE ON FUNCTION public.enforce_link_quota() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_quota_on_plan_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_link_quota() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_quota_on_plan_change() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;