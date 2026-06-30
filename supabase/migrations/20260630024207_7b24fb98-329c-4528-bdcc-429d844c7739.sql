
-- 1. cloaking_settings (per link)
CREATE TABLE public.cloaking_settings (
  link_id uuid PRIMARY KEY REFERENCES public.links(id) ON DELETE CASCADE,
  campaign_launch_mode boolean NOT NULL DEFAULT false,
  launch_window_hours int NOT NULL DEFAULT 24,
  launched_at timestamptz,
  block_desktop boolean NOT NULL DEFAULT false,
  allowed_countries text[] NOT NULL DEFAULT '{}',
  safe_page_pool text[] NOT NULL DEFAULT '{}',
  coherence_threshold int NOT NULL DEFAULT 80,
  fbclid_max_hits int NOT NULL DEFAULT 2,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cloaking_settings TO authenticated;
GRANT ALL ON public.cloaking_settings TO service_role;
ALTER TABLE public.cloaking_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage their cloaking settings" ON public.cloaking_settings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.links l WHERE l.id = link_id AND l.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.links l WHERE l.id = link_id AND l.user_id = auth.uid()));
CREATE POLICY "admins manage all cloaking settings" ON public.cloaking_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. fbclid_tracking
CREATE TABLE public.fbclid_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fbclid text NOT NULL,
  link_id uuid NOT NULL REFERENCES public.links(id) ON DELETE CASCADE,
  hit_count int NOT NULL DEFAULT 1,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  flagged_bot boolean NOT NULL DEFAULT false,
  human_confirmed boolean NOT NULL DEFAULT false,
  UNIQUE (fbclid, link_id)
);
GRANT SELECT ON public.fbclid_tracking TO authenticated;
GRANT ALL ON public.fbclid_tracking TO service_role;
ALTER TABLE public.fbclid_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "link owners view fbclid" ON public.fbclid_tracking FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.links l WHERE l.id = link_id AND l.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_fbclid_link ON public.fbclid_tracking(link_id, last_seen DESC);

-- 3. velocity_tracking
CREATE TABLE public.velocity_tracking (
  fingerprint_hash text PRIMARY KEY,
  short_codes text[] NOT NULL DEFAULT '{}',
  window_start timestamptz NOT NULL DEFAULT now(),
  blocked boolean NOT NULL DEFAULT false,
  last_seen timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.velocity_tracking TO authenticated;
GRANT ALL ON public.velocity_tracking TO service_role;
ALTER TABLE public.velocity_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins view velocity" ON public.velocity_tracking FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. ip_whitelist
CREATE TABLE public.ip_whitelist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ip text,
  fingerprint_hash text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ip_whitelist TO authenticated;
GRANT ALL ON public.ip_whitelist TO service_role;
ALTER TABLE public.ip_whitelist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own whitelist" ON public.ip_whitelist FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_ip_whitelist_lookup ON public.ip_whitelist(ip, fingerprint_hash);

-- 5. ip_blacklist
CREATE TABLE public.ip_blacklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ip text,
  fingerprint_hash text,
  reason text,
  auto_added boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ip_blacklist TO authenticated;
GRANT ALL ON public.ip_blacklist TO service_role;
ALTER TABLE public.ip_blacklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own blacklist" ON public.ip_blacklist FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_ip_blacklist_lookup ON public.ip_blacklist(ip, fingerprint_hash);

-- 6. safe_page_snippets (global pool, admin managed)
CREATE TABLE public.safe_page_snippets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  body text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.safe_page_snippets TO authenticated, anon;
GRANT ALL ON public.safe_page_snippets TO service_role;
ALTER TABLE public.safe_page_snippets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read safe snippets" ON public.safe_page_snippets FOR SELECT USING (is_active = true);
CREATE POLICY "admins manage snippets" ON public.safe_page_snippets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.safe_page_snippets (category, title, body) VALUES
('lifestyle', '5 Morning Habits That Changed My Life', 'Starting your day with intention transforms productivity. Research from Stanford shows that the first 30 minutes set the tone for everything that follows.'),
('tech', 'The Quiet Revolution in Personal Computing', 'Modern devices have become invisible companions, anticipating needs before we voice them. This shift redefines what technology means in daily life.'),
('recipe', 'Grandma''s Secret to Perfect Sunday Pancakes', 'The trick is not the flour or the butter — it''s patience. Letting batter rest for exactly twelve minutes creates that fluffy texture everyone chases.'),
('travel', 'Hidden Coastal Towns Worth the Detour', 'Beyond the tourist trails lie villages where time moves at the pace of the tide. Locals share fresh catch and stories with anyone curious enough to ask.'),
('finance', 'Small Money Moves That Compound Over Decades', 'A modest investment routine, sustained consistently, outperforms aggressive but inconsistent strategies. The math favors the patient.'),
('wellness', 'Why Walking Beats the Gym For Most People', 'A daily walk delivers cardiovascular benefits, mood lift, and cognitive clarity without injury risk. It''s the most underrated tool in modern wellness.'),
('lifestyle', 'The Art of Doing Less and Achieving More', 'Minimalism is not about owning fewer things — it''s about freeing attention for what genuinely matters. The shift begins with one removed obligation.'),
('tech', 'How Quiet Software Wins Over Flashy Apps', 'The tools that survive a decade share one trait: they get out of the way. Loud interfaces fade; quiet ones become habits.'),
('recipe', 'A One-Pot Dinner That Tastes Like Sunday', 'Rich aromatics, tender protein, and starch cooked together create depth you cannot rush. This recipe rewards twenty unattended minutes.'),
('travel', 'The Underrated Joy of Slow Train Journeys', 'Watching landscape unspool through a window resets internal rhythm. The destination matters less than the moving meditation between.');

-- 7. traffic_logs (enriched click decisions)
CREATE TABLE public.traffic_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid REFERENCES public.links(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  decision text NOT NULL, -- 'money' | 'safe' | 'block'
  reasons text[] NOT NULL DEFAULT '{}',
  coherence_score int,
  bot_score int,
  fbclid text,
  fingerprint_hash text,
  ip text,
  country text,
  asn text,
  ua text,
  referer text,
  is_mobile boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.traffic_logs TO authenticated;
GRANT ALL ON public.traffic_logs TO service_role;
ALTER TABLE public.traffic_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners and admins view traffic logs" ON public.traffic_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_traffic_logs_link ON public.traffic_logs(link_id, created_at DESC);
CREATE INDEX idx_traffic_logs_user ON public.traffic_logs(user_id, created_at DESC);
CREATE INDEX idx_traffic_logs_decision ON public.traffic_logs(decision, created_at DESC);

-- 8. updated_at trigger for cloaking_settings
CREATE TRIGGER cloaking_settings_touch BEFORE UPDATE ON public.cloaking_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 9. evaluate_redirect: the brain
CREATE OR REPLACE FUNCTION public.evaluate_redirect(
  _link_id uuid,
  _user_id uuid,
  _short_code text,
  _fbclid text,
  _fingerprint text,
  _ip text,
  _country text,
  _asn text,
  _ua text,
  _referer text,
  _is_mobile boolean,
  _is_hard_bot boolean,
  _is_datacenter boolean,
  _coherence_score int
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cfg public.cloaking_settings;
  v_decision text := 'money';
  v_reasons text[] := '{}';
  v_safe_url text;
  v_fbclid_row public.fbclid_tracking;
  v_velocity public.velocity_tracking;
  v_pool text[];
BEGIN
  -- Load settings (create defaults if missing)
  SELECT * INTO cfg FROM public.cloaking_settings WHERE link_id = _link_id;
  IF NOT FOUND THEN
    INSERT INTO public.cloaking_settings (link_id) VALUES (_link_id)
      ON CONFLICT (link_id) DO NOTHING;
    SELECT * INTO cfg FROM public.cloaking_settings WHERE link_id = _link_id;
  END IF;

  -- Step 0c: Whitelist bypass (early)
  IF _ip IS NOT NULL AND EXISTS (SELECT 1 FROM public.ip_whitelist WHERE (ip = _ip OR fingerprint_hash = _fingerprint) AND (user_id = _user_id OR user_id IS NULL)) THEN
    RETURN jsonb_build_object('decision','money','reasons',ARRAY['whitelist'],'safe_url',null);
  END IF;

  -- Manual blacklist
  IF _ip IS NOT NULL AND EXISTS (SELECT 1 FROM public.ip_blacklist WHERE (ip = _ip OR fingerprint_hash = _fingerprint) AND (user_id = _user_id OR user_id IS NULL)) THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'blacklist');
  END IF;

  -- Step 0: hardcoded bot signatures
  IF _is_hard_bot THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'hardcoded_crawler');
  END IF;

  -- Step 0a-1: Datacenter ASN
  IF _is_datacenter AND NOT _is_mobile THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'datacenter_asn');
  END IF;

  -- Step 0a-2: Velocity lock (3 codes / 1h)
  IF _fingerprint IS NOT NULL AND _fingerprint <> '' THEN
    INSERT INTO public.velocity_tracking (fingerprint_hash, short_codes, window_start, last_seen)
    VALUES (_fingerprint, ARRAY[_short_code], now(), now())
    ON CONFLICT (fingerprint_hash) DO UPDATE
      SET short_codes = CASE
        WHEN velocity_tracking.window_start < now() - interval '1 hour' THEN ARRAY[_short_code]
        WHEN _short_code = ANY(velocity_tracking.short_codes) THEN velocity_tracking.short_codes
        ELSE array_append(velocity_tracking.short_codes, _short_code) END,
        window_start = CASE WHEN velocity_tracking.window_start < now() - interval '1 hour' THEN now() ELSE velocity_tracking.window_start END,
        last_seen = now(),
        blocked = CASE
          WHEN velocity_tracking.window_start < now() - interval '1 hour' THEN false
          WHEN array_length(array_append(velocity_tracking.short_codes, _short_code), 1) >= 3 THEN true
          ELSE velocity_tracking.blocked END
      RETURNING * INTO v_velocity;
    IF v_velocity.blocked THEN
      v_decision := 'safe'; v_reasons := array_append(v_reasons, 'velocity_lock');
    END IF;
  END IF;

  -- Step 0b: Ad-review tracer (referer lacking FB markers when fbclid present)
  IF _fbclid IS NOT NULL AND _fbclid <> '' AND _referer IS NOT NULL AND _referer NOT ILIKE '%fban%' AND _referer NOT ILIKE '%fbav%' AND _referer NOT ILIKE '%facebook.%' AND _referer NOT ILIKE '%instagram.%' THEN
    v_reasons := array_append(v_reasons, 'referer_mismatch');
    v_decision := 'safe';
  END IF;

  -- Step 0d: Desktop block
  IF cfg.block_desktop AND NOT _is_mobile THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'desktop_blocked');
  END IF;

  -- Step 0e: Geo-fence
  IF array_length(cfg.allowed_countries, 1) IS NOT NULL AND COALESCE(_country, '') <> '' AND NOT (_country = ANY(cfg.allowed_countries)) THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'geo_mismatch');
  END IF;

  -- fbclid single-use lock (only meaningful if fbclid present)
  IF _fbclid IS NOT NULL AND _fbclid <> '' THEN
    INSERT INTO public.fbclid_tracking (fbclid, link_id, hit_count)
    VALUES (_fbclid, _link_id, 1)
    ON CONFLICT (fbclid, link_id) DO UPDATE
      SET hit_count = fbclid_tracking.hit_count + 1,
          last_seen = now(),
          flagged_bot = CASE WHEN fbclid_tracking.hit_count + 1 > cfg.fbclid_max_hits AND fbclid_tracking.last_seen > now() - interval '2 hours' THEN true ELSE fbclid_tracking.flagged_bot END
    RETURNING * INTO v_fbclid_row;
    IF v_fbclid_row.flagged_bot THEN
      v_decision := 'safe'; v_reasons := array_append(v_reasons, 'fbclid_reused');
    END IF;
  END IF;

  -- Campaign launch timer (24-48h shield)
  IF cfg.campaign_launch_mode AND cfg.launched_at IS NOT NULL AND cfg.launched_at + (cfg.launch_window_hours || ' hours')::interval > now() THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'campaign_launch_window');
  END IF;

  -- Header coherence
  IF _coherence_score IS NOT NULL AND _coherence_score < cfg.coherence_threshold THEN
    v_decision := 'safe'; v_reasons := array_append(v_reasons, 'low_coherence');
  END IF;

  -- Pick a safe URL from pool (if any), else null and route uses inline article
  v_pool := cfg.safe_page_pool;
  IF array_length(v_pool, 1) IS NOT NULL THEN
    v_safe_url := v_pool[1 + floor(random() * array_length(v_pool, 1))::int];
  END IF;

  RETURN jsonb_build_object(
    'decision', v_decision,
    'reasons', v_reasons,
    'safe_url', v_safe_url,
    'coherence', _coherence_score
  );
END $$;

GRANT EXECUTE ON FUNCTION public.evaluate_redirect(uuid,uuid,text,text,text,text,text,text,text,text,boolean,boolean,boolean,int) TO authenticated, service_role, anon;

-- 10. confirm_human (called by behavior challenge endpoint)
CREATE OR REPLACE FUNCTION public.confirm_human_fbclid(_fbclid text, _link_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.fbclid_tracking SET human_confirmed = true
  WHERE fbclid = _fbclid AND link_id = _link_id;
$$;
GRANT EXECUTE ON FUNCTION public.confirm_human_fbclid(text, uuid) TO authenticated, service_role, anon;
