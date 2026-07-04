
-- Enable launch shield by default for all NEW links
ALTER TABLE public.cloaking_settings ALTER COLUMN campaign_launch_mode SET DEFAULT true;
ALTER TABLE public.cloaking_settings ALTER COLUMN launch_window_hours SET DEFAULT 24;

-- Trigger: stamp launched_at when a cloaking row is created so the 24h window starts
CREATE OR REPLACE FUNCTION public.stamp_launched_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.launched_at IS NULL AND COALESCE(NEW.campaign_launch_mode, true) THEN
    NEW.launched_at := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_stamp_launched_at ON public.cloaking_settings;
CREATE TRIGGER trg_stamp_launched_at
  BEFORE INSERT ON public.cloaking_settings
  FOR EACH ROW EXECUTE FUNCTION public.stamp_launched_at();

-- Backfill: any existing link that never went through launch mode gets a fresh 24h shield NOW
-- (only if it has no launched_at yet — old already-launched links untouched)
UPDATE public.cloaking_settings
   SET campaign_launch_mode = true,
       launch_window_hours = 24,
       launched_at = now()
 WHERE launched_at IS NULL;
