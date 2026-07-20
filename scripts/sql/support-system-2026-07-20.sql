-- ============================================================
-- Support Ticket System — user ↔ admin two-way chat
-- Run: docker exec -i supabase-db psql -U postgres -d postgres < scripts/sql/support-system-2026-07-20.sql
-- ============================================================

BEGIN;

-- Status enum
DO $$ BEGIN
  CREATE TYPE public.support_status AS ENUM ('open', 'pending', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============= support_tickets =============
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  status public.support_status NOT NULL DEFAULT 'open',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_sender_is_admin boolean NOT NULL DEFAULT false,
  unread_for_user boolean NOT NULL DEFAULT false,
  unread_for_admin boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tickets_select_own_or_admin" ON public.support_tickets;
CREATE POLICY "tickets_select_own_or_admin" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "tickets_insert_own" ON public.support_tickets;
CREATE POLICY "tickets_insert_own" ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "tickets_update_own_or_admin" ON public.support_tickets;
CREATE POLICY "tickets_update_own_or_admin" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "tickets_delete_own_or_admin" ON public.support_tickets;
CREATE POLICY "tickets_delete_own_or_admin" ON public.support_tickets
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status, last_message_at DESC);

-- ============= support_messages =============
CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_admin boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "msgs_select_participant" ON public.support_messages;
CREATE POLICY "msgs_select_participant" ON public.support_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND (t.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

DROP POLICY IF EXISTS "msgs_insert_participant" ON public.support_messages;
CREATE POLICY "msgs_insert_participant" ON public.support_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND t.status <> 'closed'
        AND (t.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

DROP POLICY IF EXISTS "msgs_delete_admin" ON public.support_messages;
CREATE POLICY "msgs_delete_admin" ON public.support_messages
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON public.support_messages(ticket_id, created_at ASC);

-- ============= Trigger: update ticket meta on new message =============
CREATE OR REPLACE FUNCTION public.support_after_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.support_tickets
     SET last_message_at = NEW.created_at,
         last_sender_is_admin = NEW.is_admin,
         status = CASE WHEN status = 'closed' THEN 'open' ELSE
                       CASE WHEN NEW.is_admin THEN 'pending' ELSE 'open' END
                  END,
         unread_for_user = CASE WHEN NEW.is_admin THEN true ELSE unread_for_user END,
         unread_for_admin = CASE WHEN NEW.is_admin THEN unread_for_admin ELSE true END
   WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_support_after_message ON public.support_messages;
CREATE TRIGGER trg_support_after_message
AFTER INSERT ON public.support_messages
FOR EACH ROW EXECUTE FUNCTION public.support_after_message();

-- ============= RPC: create ticket with first message atomically =============
CREATE OR REPLACE FUNCTION public.support_create_ticket(_subject text, _body text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF length(coalesce(_subject,'')) = 0 OR length(coalesce(_body,'')) = 0 THEN
    RAISE EXCEPTION 'subject and body required';
  END IF;
  INSERT INTO public.support_tickets(user_id, subject)
    VALUES (v_uid, left(_subject, 200))
    RETURNING id INTO v_id;
  INSERT INTO public.support_messages(ticket_id, sender_id, is_admin, body)
    VALUES (v_id, v_uid, false, left(_body, 4000));
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.support_create_ticket(text, text) TO authenticated;

-- ============= RPC: mark ticket read (clears the right flag) =============
CREATE OR REPLACE FUNCTION public.support_mark_read(_ticket uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_admin boolean := public.has_role(v_uid, 'admin');
BEGIN
  IF v_admin THEN
    UPDATE public.support_tickets SET unread_for_admin = false WHERE id = _ticket;
  ELSE
    UPDATE public.support_tickets SET unread_for_user = false
     WHERE id = _ticket AND user_id = v_uid;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.support_mark_read(uuid) TO authenticated;

COMMIT;

SELECT 'support system installed' AS status,
       (SELECT count(*) FROM public.support_tickets) AS tickets,
       (SELECT count(*) FROM public.support_messages) AS messages;
