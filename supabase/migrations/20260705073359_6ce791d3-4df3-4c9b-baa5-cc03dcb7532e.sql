CREATE TABLE public.injection_threshold_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_email TEXT,
  old_threshold INTEGER,
  new_threshold INTEGER NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.injection_threshold_audit TO authenticated;
GRANT ALL ON public.injection_threshold_audit TO service_role;

ALTER TABLE public.injection_threshold_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON public.injection_threshold_audit FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audit log"
  ON public.injection_threshold_audit FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND changed_by = auth.uid());

CREATE INDEX idx_injection_audit_created ON public.injection_threshold_audit(created_at DESC);