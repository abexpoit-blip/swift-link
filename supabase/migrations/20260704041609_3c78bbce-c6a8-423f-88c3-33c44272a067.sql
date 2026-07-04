DROP TRIGGER IF EXISTS require_verified_email_for_links_trg ON public.links;
DROP TRIGGER IF EXISTS trg_require_verified_email_for_links ON public.links;
DROP TRIGGER IF EXISTS require_verified_email_for_links ON public.links;
DROP FUNCTION IF EXISTS public.require_verified_email_for_links() CASCADE;