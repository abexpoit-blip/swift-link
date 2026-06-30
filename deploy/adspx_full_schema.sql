-- ========== DROP EVERYTHING (idempotent reset) ==========
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TABLE IF EXISTS public.ad_rotation_config, public.admin_audit_logs, public.bot_protection_config,
  public.clicks, public.custom_domains, public.domain_health_checks, public.duplicate_clicks,
  public.fb_asn_blocklist, public.link_destinations, public.link_device_rules, public.link_geo_rules,
  public.link_time_rules, public.link_variant_overrides, public.link_variant_tests, public.links,
  public.packages, public.payment_settings, public.plisio_activity_log, public.plisio_webhook_logs,
  public.plisio_webhook_retry_queue, public.prelander_variants, public.profiles, public.referer_rules,
  public.shared_domains, public.upgrade_requests, public.user_roles CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at, public.has_role(uuid, public.app_role),
  public.handle_new_user, public.increment_link_clicks(uuid), public.increment_link_bot_clicks(uuid),
  public.enforce_link_quota, public.decrement_link_count, public.sync_quota_on_plan_change,
  public.clicks_daily(timestamptz, uuid), public.clicks_breakdown(timestamptz, uuid, text),
  public.get_user_click_status(uuid), public.check_and_increment_user_clicks(uuid) CASCADE;
DROP TYPE IF EXISTS public.app_role, public.link_status CASCADE;

-- ========== NEW SCHEMA ==========
CREATE TYPE public.app_role AS ENUM ('user', 'admin');

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- user_roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "ur_own" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ur_admin" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- packages
CREATE TABLE public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  price_usd numeric NOT NULL DEFAULT 0,
  click_quota bigint,
  link_limit int DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.packages TO anon, authenticated;
GRANT ALL ON public.packages TO service_role;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pkg_view" ON public.packages FOR SELECT USING (is_active = true);
CREATE POLICY "pkg_admin" ON public.packages FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  telegram text,
  plan_slug text NOT NULL DEFAULT 'free' REFERENCES public.packages(slug),
  click_quota bigint DEFAULT 10000,
  clicks_used bigint NOT NULL DEFAULT 0,
  clicks_period_start timestamptz NOT NULL DEFAULT now(),
  link_limit int DEFAULT 1,
  links_used int NOT NULL DEFAULT 0,
  is_banned boolean NOT NULL DEFAULT false,
  last_daily_redirect_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "p_own_s" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "p_own_u" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "p_adm_s" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "p_adm_u" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER t_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- packages seed
INSERT INTO public.packages (slug, name, price_usd, click_quota, link_limit, is_active, sort_order) VALUES
  ('free',     'Free',        0,  10000,   1,    true, 1),
  ('monthly',  'Monthly Pro', 5,  1000000, 50,   true, 2),
  ('lifetime', 'Lifetime',    50, NULL,    NULL, true, 3),
  ('unlimited','Lifetime',    50, NULL,    NULL, false,4)
ON CONFLICT (slug) DO NOTHING;

-- links
CREATE TABLE public.links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  short_code text UNIQUE NOT NULL,
  title text,
  adsterra_url text NOT NULL,
  safe_url text NOT NULL DEFAULT 'https://example.com/',
  is_active boolean NOT NULL DEFAULT true,
  clicks_count int NOT NULL DEFAULT 0,
  bot_clicks_count int NOT NULL DEFAULT 0,
  prelanding_template TEXT NOT NULL DEFAULT 'verify' CHECK (prelanding_template IN ('none','verify','reward','countdown','article')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_links_user ON public.links(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.links TO authenticated;
GRANT ALL ON public.links TO service_role;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "l_own_s" ON public.links FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "l_own_i" ON public.links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "l_own_u" ON public.links FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "l_own_d" ON public.links FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "l_adm_s" ON public.links FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER t_links BEFORE UPDATE ON public.links FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- clicks
CREATE TABLE public.clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.links(id) ON DELETE CASCADE,
  ip text,
  country text,
  ua text,
  is_bot boolean NOT NULL DEFAULT false,
  bot_reason text,
  routed_to text NOT NULL DEFAULT 'offer',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  referer_host text,
  bot_score integer,
  signals jsonb,
  challenge_passed boolean NOT NULL DEFAULT false,
  prelanding_shown BOOLEAN NOT NULL DEFAULT false,
  fingerprint_hash TEXT,
  referrer_source TEXT,
  country_tier SMALLINT,
  ab_variant TEXT,
  ja3_hash TEXT,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_clicks_link ON public.clicks(link_id, created_at DESC);
CREATE INDEX idx_clicks_link_utm_source ON public.clicks (link_id, utm_source);
CREATE INDEX idx_clicks_fingerprint ON public.clicks(fingerprint_hash) WHERE fingerprint_hash IS NOT NULL;
CREATE INDEX idx_clicks_referrer ON public.clicks(referrer_source) WHERE referrer_source IS NOT NULL;
CREATE INDEX idx_clicks_country_created ON public.clicks(country, created_at DESC) WHERE country IS NOT NULL;
CREATE INDEX idx_clicks_fp_routed_created ON public.clicks (fingerprint_hash, routed_to, created_at DESC);
GRANT SELECT, INSERT ON public.clicks TO authenticated;
GRANT ALL ON public.clicks TO service_role;
ALTER TABLE public.clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "c_own_s" ON public.clicks FOR SELECT USING (EXISTS (SELECT 1 FROM public.links l WHERE l.id = clicks.link_id AND l.user_id = auth.uid()));
CREATE POLICY "c_adm_s" ON public.clicks FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- upgrade_requests
CREATE TABLE public.upgrade_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_slug text NOT NULL REFERENCES public.packages(slug),
  amount numeric NOT NULL DEFAULT 0,
  plisio_invoice_id text,
  plisio_invoice_url text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.upgrade_requests TO authenticated;
GRANT ALL ON public.upgrade_requests TO service_role;
ALTER TABLE public.upgrade_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ur_own_s" ON public.upgrade_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ur_own_i" ON public.upgrade_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ur_adm_s" ON public.upgrade_requests FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ur_adm_u" ON public.upgrade_requests FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER t_ur BEFORE UPDATE ON public.upgrade_requests FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- bot_rules
CREATE TABLE public.bot_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type text NOT NULL,
  pattern text NOT NULL,
  action text NOT NULL DEFAULT 'safe',
  label text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bot_rules TO authenticated;
GRANT ALL ON public.bot_rules TO service_role;
ALTER TABLE public.bot_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "br_adm" ON public.bot_rules FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.bot_rules (rule_type, pattern, label) VALUES
  ('ua','facebookexternalhit','Facebook crawler'),('ua','facebookcatalog','Facebook catalog bot'),
  ('ua','meta-externalagent','Meta agent'),('ua','bytespider','TikTok ByteSpider'),
  ('ua','googlebot','Google bot'),('ua','bingbot','Bing bot'),
  ('ua','ahrefsbot','Ahrefs'),('ua','semrushbot','Semrush'),
  ('ua','curl/','curl'),('ua','wget/','wget'),
  ('ua','python-requests','Python requests'),('ua','headlesschrome','Headless Chrome'),
  ('ua','phantomjs','PhantomJS'),('ua','puppeteer','Puppeteer');

-- app_settings (singleton)
CREATE TABLE public.app_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true,
  fallback_url TEXT NOT NULL DEFAULT 'https://example.com/',
  our_adsterra_url TEXT NOT NULL DEFAULT 'https://example.com/',
  injection_threshold INTEGER NOT NULL DEFAULT 5000,
  injection_count INTEGER NOT NULL DEFAULT 50,
  daily_redirect_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_singleton CHECK (id = true)
);
GRANT SELECT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "as_read_auth" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "as_admin_all" ON public.app_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER app_settings_touch BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
INSERT INTO public.app_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- country_tiers
CREATE TABLE public.country_tiers (
  country_code TEXT PRIMARY KEY,
  tier SMALLINT NOT NULL CHECK (tier BETWEEN 1 AND 3),
  country_name TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.country_tiers TO anon, authenticated;
GRANT ALL ON public.country_tiers TO service_role;
ALTER TABLE public.country_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY ct_read_all ON public.country_tiers FOR SELECT USING (true);
CREATE POLICY ct_admin_all ON public.country_tiers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.country_tiers (country_code, tier, country_name) VALUES
('US',1,'United States'),('UK',1,'United Kingdom'),('GB',1,'United Kingdom'),
('CA',1,'Canada'),('AU',1,'Australia'),('DE',1,'Germany'),('FR',1,'France'),
('NL',1,'Netherlands'),('SE',1,'Sweden'),('NO',1,'Norway'),('CH',1,'Switzerland'),
('IE',1,'Ireland'),('NZ',1,'New Zealand'),('DK',1,'Denmark'),('FI',1,'Finland'),
('BR',2,'Brazil'),('MX',2,'Mexico'),('IN',2,'India'),('ID',2,'Indonesia'),
('TR',2,'Turkey'),('IT',2,'Italy'),('ES',2,'Spain'),('PL',2,'Poland'),
('AR',2,'Argentina'),('CL',2,'Chile'),('CO',2,'Colombia'),('MY',2,'Malaysia'),
('TH',2,'Thailand'),('PH',2,'Philippines'),('VN',2,'Vietnam'),('ZA',2,'South Africa'),
('SA',2,'Saudi Arabia'),('AE',2,'UAE'),('JP',2,'Japan'),('KR',2,'South Korea')
ON CONFLICT (country_code) DO NOTHING;

-- geo_offers
CREATE TABLE public.geo_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES public.links(id) ON DELETE CASCADE,
  tier SMALLINT CHECK (tier BETWEEN 1 AND 3),
  country_codes TEXT[],
  offer_url TEXT NOT NULL,
  weight INTEGER NOT NULL DEFAULT 100 CHECK (weight > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_geo_offers_link ON public.geo_offers(link_id) WHERE is_active = true;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.geo_offers TO authenticated;
GRANT ALL ON public.geo_offers TO service_role;
ALTER TABLE public.geo_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY go_owner_all ON public.geo_offers FOR ALL
  USING (EXISTS (SELECT 1 FROM public.links l WHERE l.id = link_id AND l.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.links l WHERE l.id = link_id AND l.user_id = auth.uid()));
CREATE POLICY go_admin_all ON public.geo_offers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ab_variants
CREATE TABLE public.ab_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES public.links(id) ON DELETE CASCADE,
  variant_label TEXT NOT NULL,
  offer_url TEXT NOT NULL,
  weight_pct INTEGER NOT NULL DEFAULT 50 CHECK (weight_pct BETWEEN 1 AND 100),
  clicks_count BIGINT NOT NULL DEFAULT 0,
  conversions_count BIGINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(link_id, variant_label)
);
CREATE INDEX idx_ab_variants_link ON public.ab_variants(link_id) WHERE is_active = true;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ab_variants TO authenticated;
GRANT ALL ON public.ab_variants TO service_role;
ALTER TABLE public.ab_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY ab_owner_all ON public.ab_variants FOR ALL
  USING (EXISTS (SELECT 1 FROM public.links l WHERE l.id = link_id AND l.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.links l WHERE l.id = link_id AND l.user_id = auth.uid()));
CREATE POLICY ab_admin_all ON public.ab_variants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- referrer_rules
CREATE TABLE public.referrer_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern TEXT NOT NULL,
  label TEXT,
  trust_score INTEGER NOT NULL DEFAULT 50 CHECK (trust_score BETWEEN 0 AND 100),
  action TEXT NOT NULL DEFAULT 'allow' CHECK (action IN ('allow','suspect','block')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referrer_rules TO authenticated;
GRANT ALL ON public.referrer_rules TO service_role;
ALTER TABLE public.referrer_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY rr_read_auth ON public.referrer_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY rr_admin_all ON public.referrer_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.referrer_rules (pattern, label, trust_score, action) VALUES
('facebook.com','Facebook',95,'allow'),('fb.com','Facebook',95,'allow'),
('instagram.com','Instagram',95,'allow'),('t.co','Twitter',90,'allow'),
('twitter.com','Twitter',90,'allow'),('x.com','X/Twitter',90,'allow'),
('telegram.org','Telegram',95,'allow'),('t.me','Telegram',95,'allow'),
('whatsapp.com','WhatsApp',95,'allow'),('wa.me','WhatsApp',95,'allow'),
('tiktok.com','TikTok',90,'allow'),('youtube.com','YouTube',90,'allow'),
('reddit.com','Reddit',85,'allow'),('google.com','Google',80,'allow'),
('googlebot.com','Googlebot',0,'block'),('ahrefs.com','Ahrefs',0,'block'),
('semrush.com','Semrush',0,'block')
ON CONFLICT DO NOTHING;

-- cloaking_rules
CREATE TABLE public.cloaking_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type TEXT NOT NULL CHECK (rule_type IN ('ua','ip','asn','country')),
  pattern TEXT NOT NULL,
  label TEXT,
  action TEXT NOT NULL DEFAULT 'safe' CHECK (action IN ('safe','block','offer')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cloaking_active ON public.cloaking_rules(rule_type, is_active) WHERE is_active = true;
GRANT SELECT ON public.cloaking_rules TO authenticated;
GRANT ALL ON public.cloaking_rules TO service_role;
ALTER TABLE public.cloaking_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY cr_read_auth ON public.cloaking_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY cr_admin_all ON public.cloaking_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.cloaking_rules (rule_type, pattern, label, action) VALUES
('ua','facebookexternalhit','Facebook Crawler','safe'),
('ua','facebot','Facebook Bot','safe'),
('ua','meta-externalagent','Meta Agent','safe'),
('ua','meta-externalfetcher','Meta Fetcher','safe'),
('ua','googlebot','Google Bot','safe'),
('ua','adsbot-google','Google AdsBot','safe'),
('ua','bingbot','Bing Bot','safe'),
('ua','yandexbot','Yandex Bot','safe'),
('ua','duckduckbot','DuckDuckGo','safe'),
('asn','32934','Facebook AS','safe'),
('asn','15169','Google AS','safe'),
('asn','8075','Microsoft AS','safe'),
('asn','13335','Cloudflare AS','safe'),
('asn','14618','Amazon AS','safe'),
('asn','16509','Amazon AWS','safe')
ON CONFLICT DO NOTHING;

-- bot_fingerprints
CREATE TABLE public.bot_fingerprints (
  fingerprint_hash TEXT PRIMARY KEY,
  hit_count INTEGER NOT NULL DEFAULT 1,
  bot_hits INTEGER NOT NULL DEFAULT 0,
  auto_blocked BOOLEAN NOT NULL DEFAULT false,
  sample_ip TEXT,
  sample_ua TEXT,
  sample_country TEXT,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bf_blocked ON public.bot_fingerprints(auto_blocked) WHERE auto_blocked = true;
GRANT ALL ON public.bot_fingerprints TO service_role;
ALTER TABLE public.bot_fingerprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY bf_admin_all ON public.bot_fingerprints FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- custom_domains
CREATE TABLE public.custom_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  domain text NOT NULL UNIQUE,
  verification_token text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  verified boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_domains TO authenticated;
GRANT ALL ON public.custom_domains TO service_role;
ALTER TABLE public.custom_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY cd_own_s ON public.custom_domains FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY cd_own_i ON public.custom_domains FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY cd_own_u ON public.custom_domains FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY cd_own_d ON public.custom_domains FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY cd_adm_all ON public.custom_domains FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX custom_domains_user_idx ON public.custom_domains(user_id);

-- shortener_domains
CREATE TABLE public.shortener_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL UNIQUE,
  dns_target text NOT NULL DEFAULT '185.158.133.1',
  is_primary boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  verified boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shortener_domains TO authenticated;
GRANT ALL ON public.shortener_domains TO service_role;
ALTER TABLE public.shortener_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY sd_read_auth ON public.shortener_domains FOR SELECT TO authenticated USING (true);
CREATE POLICY sd_admin_all ON public.shortener_domains FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE UNIQUE INDEX shortener_domains_one_primary ON public.shortener_domains ((is_primary)) WHERE is_primary = true;

CREATE OR REPLACE FUNCTION public.shortener_domains_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER shortener_domains_touch BEFORE UPDATE ON public.shortener_domains
  FOR EACH ROW EXECUTE FUNCTION public.shortener_domains_touch();

-- ========== FUNCTIONS ==========

-- record_redirect_click
CREATE OR REPLACE FUNCTION public.record_redirect_click(
  _link_id uuid, _user_id uuid, _ip text, _country text, _ua text,
  _is_bot boolean, _bot_reason text, _routed_to text,
  _utm_source text, _utm_medium text, _utm_campaign text, _utm_term text, _utm_content text,
  _referer_host text, _bot_score integer, _signals jsonb, _challenge_passed boolean
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.clicks (link_id, ip, country, ua, is_bot, bot_reason, routed_to,
    utm_source, utm_medium, utm_campaign, utm_term, utm_content, referer_host,
    bot_score, signals, challenge_passed)
  VALUES (_link_id, _ip, _country, _ua, _is_bot, _bot_reason, _routed_to,
    _utm_source, _utm_medium, _utm_campaign, _utm_term, _utm_content, _referer_host,
    _bot_score, _signals, COALESCE(_challenge_passed, false));

  IF _is_bot THEN
    UPDATE public.links SET bot_clicks_count = COALESCE(bot_clicks_count, 0) + 1 WHERE id = _link_id;
  ELSE
    UPDATE public.links SET clicks_count = COALESCE(clicks_count, 0) + 1 WHERE id = _link_id;
    UPDATE public.profiles SET clicks_used = COALESCE(clicks_used, 0) + 1 WHERE id = _user_id;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.record_redirect_click(uuid, uuid, text, text, text, boolean, text, text, text, text, text, text, text, text, integer, jsonb, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_redirect_click(uuid, uuid, text, text, text, boolean, text, text, text, text, text, text, text, text, integer, jsonb, boolean) TO service_role;

-- record_bot_fingerprint
CREATE OR REPLACE FUNCTION public.record_bot_fingerprint(
  _hash TEXT, _is_bot BOOLEAN, _ip TEXT, _ua TEXT, _country TEXT, _block_threshold INTEGER DEFAULT 3
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_blocked BOOLEAN;
BEGIN
  INSERT INTO public.bot_fingerprints (fingerprint_hash, hit_count, bot_hits, sample_ip, sample_ua, sample_country, last_seen)
  VALUES (_hash, 1, CASE WHEN _is_bot THEN 1 ELSE 0 END, _ip, _ua, _country, now())
  ON CONFLICT (fingerprint_hash) DO UPDATE
    SET hit_count = bot_fingerprints.hit_count + 1,
        bot_hits  = bot_fingerprints.bot_hits + CASE WHEN _is_bot THEN 1 ELSE 0 END,
        last_seen = now(),
        auto_blocked = CASE
          WHEN bot_fingerprints.auto_blocked THEN true
          WHEN bot_fingerprints.bot_hits + CASE WHEN _is_bot THEN 1 ELSE 0 END >= _block_threshold THEN true
          ELSE false END
  RETURNING auto_blocked INTO v_blocked;
  RETURN v_blocked;
END $$;
REVOKE EXECUTE ON FUNCTION public.record_bot_fingerprint(TEXT, BOOLEAN, TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_bot_fingerprint(TEXT, BOOLEAN, TEXT, TEXT, TEXT, INTEGER) TO service_role;

-- enforce_link_quota trigger
CREATE OR REPLACE FUNCTION public.enforce_link_quota()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_used int; v_limit int; v_is_admin boolean; v_free_click_quota bigint; v_free_link_limit int;
BEGIN
  SELECT public.has_role(NEW.user_id, 'admin') INTO v_is_admin;
  SELECT links_used, link_limit INTO v_used, v_limit FROM public.profiles WHERE id = NEW.user_id FOR UPDATE;
  IF NOT FOUND THEN
    SELECT click_quota, link_limit INTO v_free_click_quota, v_free_link_limit FROM public.packages WHERE slug = 'free';
    INSERT INTO public.profiles (id, plan_slug, click_quota, link_limit, links_used)
    VALUES (NEW.user_id, 'free', COALESCE(v_free_click_quota, 10000), COALESCE(v_free_link_limit, 1), 0);
    v_used := 0; v_limit := COALESCE(v_free_link_limit, 1);
  END IF;
  IF COALESCE(v_is_admin, false) THEN
    UPDATE public.profiles SET links_used = links_used + 1 WHERE id = NEW.user_id;
    RETURN NEW;
  END IF;
  IF v_limit IS NOT NULL AND v_used >= v_limit THEN
    RAISE EXCEPTION 'Link limit reached (%/%). Please upgrade your plan.', v_used, v_limit;
  END IF;
  UPDATE public.profiles SET links_used = links_used + 1 WHERE id = NEW.user_id;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_enforce_link_quota BEFORE INSERT ON public.links FOR EACH ROW EXECUTE FUNCTION public.enforce_link_quota();

-- sync_quota_on_plan_change trigger
CREATE OR REPLACE FUNCTION public.sync_quota_on_plan_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_link_limit int; v_click_quota bigint;
BEGIN
  IF NEW.plan_slug IS DISTINCT FROM OLD.plan_slug THEN
    SELECT link_limit, click_quota INTO v_link_limit, v_click_quota
      FROM public.packages WHERE slug = NEW.plan_slug AND is_active = true;
    NEW.link_limit := v_link_limit;
    NEW.click_quota := v_click_quota;
    NEW.links_used := 0;
    NEW.clicks_used := 0;
    NEW.clicks_period_start := now();
  END IF;
  IF public.has_role(NEW.id, 'admin') THEN
    NEW.link_limit := NULL;
    NEW.click_quota := NULL;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_sync_quota_on_plan_change BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.sync_quota_on_plan_change();

-- handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_email text := lower(COALESCE(NEW.email, ''));
  v_role public.app_role := CASE WHEN lower(COALESCE(NEW.email, ''))='admin@sleepox.com' THEN 'admin'::public.app_role ELSE 'user'::public.app_role END;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, telegram, plan_slug, click_quota, link_limit)
  VALUES (
    NEW.id, v_email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name',''), split_part(v_email,'@',1)),
    NULLIF(NEW.raw_user_meta_data->>'telegram',''),
    CASE WHEN v_role='admin' THEN 'lifetime' ELSE 'free' END,
    CASE WHEN v_role='admin' THEN NULL ELSE 10000 END,
    CASE WHEN v_role='admin' THEN NULL ELSE 1 END
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'signup trigger failed id=% email=% error=% state=%', NEW.id, v_email, SQLERRM, SQLSTATE;
  RAISE;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========== ANALYTICS VIEWS (admin-only) ==========
CREATE OR REPLACE VIEW public.cohort_stats AS
SELECT COALESCE(referrer_source, 'direct') AS source,
  COUNT(*) AS total_clicks,
  SUM(CASE WHEN is_bot THEN 1 ELSE 0 END) AS bot_clicks,
  SUM(CASE WHEN NOT is_bot THEN 1 ELSE 0 END) AS human_clicks,
  ROUND(100.0 * SUM(CASE WHEN is_bot THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) AS bot_pct,
  COUNT(DISTINCT country) AS countries,
  COUNT(DISTINCT fingerprint_hash) AS unique_fps,
  MIN(created_at) AS first_click,
  MAX(created_at) AS last_click
FROM public.clicks
WHERE created_at > now() - interval '7 days'
GROUP BY COALESCE(referrer_source, 'direct');

CREATE OR REPLACE VIEW public.country_stats_24h AS
SELECT country, COUNT(*) AS clicks,
  SUM(CASE WHEN is_bot THEN 1 ELSE 0 END) AS bots,
  SUM(CASE WHEN NOT is_bot THEN 1 ELSE 0 END) AS humans
FROM public.clicks
WHERE created_at > now() - interval '24 hours' AND country IS NOT NULL AND country <> ''
GROUP BY country;

ALTER VIEW public.cohort_stats SET (security_invoker = on);
ALTER VIEW public.country_stats_24h SET (security_invoker = on);
REVOKE ALL ON public.cohort_stats FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.country_stats_24h FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.cohort_stats TO authenticated;
GRANT SELECT ON public.country_stats_24h TO authenticated;
-- Earnings ledger: per-link daily aggregate of clicks, Adsterra portion, user earnings
CREATE TABLE public.earnings_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  link_id UUID REFERENCES public.links(id) ON DELETE SET NULL,
  day DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  adsterra_clicks INTEGER NOT NULL DEFAULT 0,
  user_clicks INTEGER NOT NULL DEFAULT 0,
  earnings_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, link_id, day)
);

GRANT SELECT, INSERT, UPDATE ON public.earnings_ledger TO authenticated;
GRANT ALL ON public.earnings_ledger TO service_role;
ALTER TABLE public.earnings_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own earnings" ON public.earnings_ledger
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all earnings" ON public.earnings_ledger
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER earnings_ledger_touch BEFORE UPDATE ON public.earnings_ledger
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_earnings_user_day ON public.earnings_ledger(user_id, day DESC);

-- Withdrawals: user crypto cashout requests (USDT TRC20/BEP20), min $25
CREATE TABLE public.withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_usd NUMERIC(12,2) NOT NULL CHECK (amount_usd >= 25),
  network TEXT NOT NULL CHECK (network IN ('USDT_TRC20','USDT_BEP20')),
  wallet_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','rejected')),
  tx_hash TEXT,
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

GRANT SELECT, INSERT ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own withdrawals" ON public.withdrawals
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own withdrawals" ON public.withdrawals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all withdrawals" ON public.withdrawals
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update withdrawals" ON public.withdrawals
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER withdrawals_touch BEFORE UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_withdrawals_user ON public.withdrawals(user_id, created_at DESC);
CREATE INDEX idx_withdrawals_status ON public.withdrawals(status);

-- Wallet book: saved USDT wallets per user (reuse in withdrawal form)
CREATE TABLE public.user_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  network TEXT NOT NULL CHECK (network IN ('USDT_TRC20','USDT_BEP20')),
  address TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, network, address)
);

GRANT SELECT, INSERT, DELETE ON public.user_wallets TO authenticated;
GRANT ALL ON public.user_wallets TO service_role;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own wallets" ON public.user_wallets
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Profile balance fields for available/withdrawn totals
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS balance_available NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_withdrawn NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Function: record a human click into earnings ledger
-- Rule: $1 per 100,000 clicks, 200 of every 5000 clicks attributed to Adsterra
CREATE OR REPLACE FUNCTION public.record_earning_click(_user_id UUID, _link_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'utc')::date;
  v_total INTEGER;
  v_adsterra INTEGER;
  v_user_clicks INTEGER;
  v_earnings NUMERIC(12,6);
BEGIN
  INSERT INTO public.earnings_ledger (user_id, link_id, day, total_clicks, adsterra_clicks, user_clicks, earnings_usd)
  VALUES (_user_id, _link_id, v_today, 1, 0, 1, 0.00001)
  ON CONFLICT (user_id, link_id, day) DO UPDATE
    SET total_clicks = earnings_ledger.total_clicks + 1
  RETURNING total_clicks INTO v_total;

  -- Adsterra portion: floor(total/25) gives 200 per 5000 (4%)
  v_adsterra := FLOOR(v_total::numeric / 25);
  v_user_clicks := v_total - v_adsterra;
  v_earnings := v_user_clicks::numeric / 100000;

  UPDATE public.earnings_ledger
    SET adsterra_clicks = v_adsterra,
        user_clicks = v_user_clicks,
        earnings_usd = v_earnings
    WHERE user_id = _user_id AND link_id = _link_id AND day = v_today;

  -- Increment running available balance only when this click crosses into user-share
  IF (v_total % 25) <> 0 THEN
    UPDATE public.profiles
      SET balance_available = balance_available + 0.00001
      WHERE id = _user_id;
  END IF;
END;
$$;

-- Inbox messages: recipient_id NULL = broadcast to all users
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_broadcast BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_recipient ON public.messages(recipient_id, created_at DESC);
CREATE INDEX idx_messages_broadcast ON public.messages(is_broadcast, created_at DESC) WHERE is_broadcast = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own + broadcasts" ON public.messages
  FOR SELECT TO authenticated
  USING (is_broadcast = true OR recipient_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete messages" ON public.messages
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Per-user read state (works for both direct + broadcast)
CREATE TABLE public.message_reads (
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.message_reads TO authenticated;
GRANT ALL ON public.message_reads TO service_role;

ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reads" ON public.message_reads
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Unread count (direct + broadcast not yet read by this user)
CREATE OR REPLACE FUNCTION public.unread_message_count(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.messages m
  WHERE (m.is_broadcast = true OR m.recipient_id = _user_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.message_reads r
      WHERE r.message_id = m.id AND r.user_id = _user_id
    );
$$;

-- ============== INDEXES for hot paths ==============
CREATE INDEX IF NOT EXISTS idx_links_short_code ON public.links(short_code);
CREATE INDEX IF NOT EXISTS idx_links_user ON public.links(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clicks_link ON public.clicks(link_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_earnings_user ON public.earnings_ledger(user_id, day DESC);
CREATE INDEX IF NOT EXISTS idx_earnings_user_link_day ON public.earnings_ledger(user_id, link_id, day);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawals(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON public.withdrawals(user_id, created_at DESC);

-- ============== Single-roundtrip redirect RPC ==============
CREATE OR REPLACE FUNCTION public.handle_redirect_click(
  _link_id UUID,
  _user_id UUID,
  _is_bot BOOLEAN,
  _ua TEXT,
  _routed_to TEXT
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'utc')::date;
  v_total INTEGER;
  v_adsterra INTEGER;
  v_user_clicks INTEGER;
  v_earnings NUMERIC(12,6);
BEGIN
  -- Record click
  INSERT INTO public.clicks (link_id, ua, is_bot, routed_to, challenge_passed, bot_score)
  VALUES (_link_id, _ua, _is_bot, _routed_to, NOT _is_bot, CASE WHEN _is_bot THEN 100 ELSE 0 END);

  IF _is_bot THEN
    UPDATE public.links SET bot_clicks_count = COALESCE(bot_clicks_count, 0) + 1 WHERE id = _link_id;
    RETURN;
  END IF;

  -- Real human click: update link + profile counters
  UPDATE public.links SET clicks_count = COALESCE(clicks_count, 0) + 1 WHERE id = _link_id;
  UPDATE public.profiles SET clicks_used = COALESCE(clicks_used, 0) + 1 WHERE id = _user_id;

  -- Upsert earnings row for today
  INSERT INTO public.earnings_ledger (user_id, link_id, day, total_clicks, adsterra_clicks, user_clicks, earnings_usd)
  VALUES (_user_id, _link_id, v_today, 1, 0, 1, 0.00001)
  ON CONFLICT (user_id, link_id, day) DO UPDATE
    SET total_clicks = earnings_ledger.total_clicks + 1
  RETURNING total_clicks INTO v_total;

  v_adsterra := FLOOR(v_total::numeric / 25);
  v_user_clicks := v_total - v_adsterra;
  v_earnings := v_user_clicks::numeric / 100000;

  UPDATE public.earnings_ledger
    SET adsterra_clicks = v_adsterra,
        user_clicks = v_user_clicks,
        earnings_usd = v_earnings
    WHERE user_id = _user_id AND link_id = _link_id AND day = v_today;

  -- Crossing into a user-share click (not the 25th)
  IF (v_total % 25) <> 0 THEN
    UPDATE public.profiles
      SET balance_available = balance_available + 0.00001
      WHERE id = _user_id;
  END IF;
END $$;

-- ============== Withdrawal audit + admin comment ==============
ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admin_comment TEXT,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.withdrawal_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_id UUID NOT NULL REFERENCES public.withdrawals(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email TEXT,
  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_audit_w ON public.withdrawal_audit(withdrawal_id, created_at DESC);

GRANT SELECT, INSERT ON public.withdrawal_audit TO authenticated;
GRANT ALL ON public.withdrawal_audit TO service_role;

ALTER TABLE public.withdrawal_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit" ON public.withdrawal_audit
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert audit" ON public.withdrawal_audit
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND admin_id = auth.uid());

-- Bulk mark messages as read in one roundtrip
CREATE OR REPLACE FUNCTION public.mark_messages_read(_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_count INTEGER;
BEGIN
  INSERT INTO public.message_reads (message_id, user_id)
  SELECT unnest(_ids), auth.uid()
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

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

REVOKE EXECUTE ON FUNCTION public.evaluate_redirect(uuid,uuid,text,text,text,text,text,text,text,text,boolean,boolean,boolean,int) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.confirm_human_fbclid(text, uuid) FROM PUBLIC, anon, authenticated;

-- 1. profiles columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS banned_reason text;

-- 2. key/value system settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone authed can read settings" ON public.system_settings;
CREATE POLICY "anyone authed can read settings" ON public.system_settings
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admins manage settings" ON public.system_settings;
CREATE POLICY "admins manage settings" ON public.system_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.system_settings (key, value) VALUES
  ('inactive_days', '14'::jsonb),
  ('allowed_email_domains', '["gmail.com"]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 3. touch last login
CREATE OR REPLACE FUNCTION public.touch_last_login()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles SET last_login_at = now() WHERE id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.touch_last_login() TO authenticated;

-- 4. admin: delete user
CREATE OR REPLACE FUNCTION public.admin_delete_user(_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  DELETE FROM auth.users WHERE id = _user_id;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;

-- 5. admin: ban/unban
CREATE OR REPLACE FUNCTION public.admin_set_banned(_user_id uuid, _banned boolean, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.profiles
     SET banned = _banned,
         banned_reason = CASE WHEN _banned THEN _reason ELSE NULL END
   WHERE id = _user_id;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_set_banned(uuid, boolean, text) TO authenticated;

-- 6. admin: verify email
CREATE OR REPLACE FUNCTION public.admin_verify_email(_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE auth.users SET email_confirmed_at = COALESCE(email_confirmed_at, now())
   WHERE id = _user_id;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_verify_email(uuid) TO authenticated;

-- 7. admin list users
CREATE OR REPLACE FUNCTION public.admin_list_users(_search text DEFAULT NULL, _limit int DEFAULT 100)
RETURNS TABLE (
  id uuid, email text, full_name text, plan_slug text,
  banned boolean, banned_reason text,
  email_confirmed_at timestamptz,
  last_login_at timestamptz, created_at timestamptz,
  links_used int, clicks_used int, balance_available numeric
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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
END $$;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text, int) TO authenticated;

-- 8. purge inactive users
CREATE OR REPLACE FUNCTION public.purge_inactive_users()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_days int; v_count int := 0;
BEGIN
  SELECT COALESCE((value)::text::int, 14) INTO v_days
    FROM public.system_settings WHERE key = 'inactive_days';
  IF v_days IS NULL OR v_days <= 0 THEN v_days := 14; END IF;

  WITH victims AS (
    SELECT p.id FROM public.profiles p
     WHERE p.last_login_at < now() - (v_days || ' days')::interval
       AND NOT public.has_role(p.id, 'admin')
  ), del AS (
    DELETE FROM auth.users u USING victims v WHERE u.id = v.id RETURNING u.id
  )
  SELECT COUNT(*) INTO v_count FROM del;
  RETURN v_count;
END $$;

-- 9. daily cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$ BEGIN
  PERFORM cron.unschedule('purge-inactive-users')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='purge-inactive-users');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('purge-inactive-users', '0 3 * * *', $$SELECT public.purge_inactive_users();$$);

DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- promote existing primary admin
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'super_admin'::public.app_role
  FROM auth.users u
 WHERE lower(u.email) = 'admin@sleepox.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- tighten delete to super_admin
CREATE OR REPLACE FUNCTION public.admin_delete_user(_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only super-admin can permanently delete users';
  END IF;
  DELETE FROM auth.users WHERE id = _user_id;
END $$;

-- on new signup: admin@sleepox.com also gets super_admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_email text := lower(COALESCE(NEW.email, ''));
  v_is_admin boolean := v_email = 'admin@sleepox.com';
BEGIN
  INSERT INTO public.profiles (id, email, full_name, telegram, plan_slug, click_quota, link_limit)
  VALUES (
    NEW.id, v_email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name',''), split_part(v_email,'@',1)),
    NULLIF(NEW.raw_user_meta_data->>'telegram',''),
    CASE WHEN v_is_admin THEN 'lifetime' ELSE 'free' END,
    CASE WHEN v_is_admin THEN NULL ELSE 10000 END,
    CASE WHEN v_is_admin THEN NULL ELSE 1 END
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN v_is_admin THEN 'admin'::public.app_role ELSE 'user'::public.app_role END)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF v_is_admin THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'signup trigger failed id=% email=% error=% state=%', NEW.id, v_email, SQLERRM, SQLSTATE;
  RAISE;
END $$;

-- block link creation for unverified users
CREATE OR REPLACE FUNCTION public.require_verified_email_for_links()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_confirmed timestamptz;
BEGIN
  IF public.has_role(NEW.user_id, 'admin') OR public.has_role(NEW.user_id, 'super_admin') THEN
    RETURN NEW;
  END IF;
  SELECT email_confirmed_at INTO v_confirmed FROM auth.users WHERE id = NEW.user_id;
  IF v_confirmed IS NULL THEN
    RAISE EXCEPTION 'Please verify your email before creating links.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_require_verified_email_for_links ON public.links;
CREATE TRIGGER trg_require_verified_email_for_links
  BEFORE INSERT ON public.links
  FOR EACH ROW EXECUTE FUNCTION public.require_verified_email_for_links();
