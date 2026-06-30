
REVOKE EXECUTE ON FUNCTION public.evaluate_redirect(uuid,uuid,text,text,text,text,text,text,text,text,boolean,boolean,boolean,int) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.confirm_human_fbclid(text, uuid) FROM PUBLIC, anon, authenticated;
