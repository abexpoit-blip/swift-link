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