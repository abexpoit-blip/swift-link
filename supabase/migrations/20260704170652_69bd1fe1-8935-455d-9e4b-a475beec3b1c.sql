
ALTER TABLE public.cloaking_settings ALTER COLUMN coherence_threshold SET DEFAULT 40;
ALTER TABLE public.cloaking_settings ALTER COLUMN fbclid_max_hits SET DEFAULT 5;
UPDATE public.cloaking_settings SET coherence_threshold = 40 WHERE coherence_threshold >= 60;
UPDATE public.cloaking_settings SET fbclid_max_hits = 5 WHERE fbclid_max_hits <= 3;
