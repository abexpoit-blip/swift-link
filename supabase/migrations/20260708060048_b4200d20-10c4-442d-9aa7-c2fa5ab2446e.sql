CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END $function$;

CREATE OR REPLACE FUNCTION public.shortener_domains_touch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END $function$;