
# Advanced Shortener — Port + Redesign Plan

Old repo (`abexpoit-blip/comeback-code-5f322e81`) holo ekta complete advanced URL shortener + cloaking system, already TanStack Start e lekha — same stack hisebe amader project er sathe match kore. Aitar shortener + admin part ke ei new project e port korbo, Lovable Cloud (managed Supabase) er upor cholbe, pore self-hosted Supabase + Contabo VPS e migrate kora jabe.

---

## Phase 1 — Backend foundation (Lovable Cloud)

1. **Lovable Cloud enable kora** — managed Supabase (Postgres + Auth + Storage + Edge runtime).
2. **Schema port** — purono repo te 40+ migration file ase. Consolidate kore ekta clean migration banabo with:
   - Core: `profiles`, `user_roles` (separate table, has_role security definer), `app_settings`
   - Links: `links`, `clicks`, `daily_stats`, `analytics_cache`
   - Anti-bot: `bot_fingerprints`, `bot_rules`, `bot_whitelist`, `cloaking_rules`, `referrer_rules`, `signup_attempts`, `blocked_email_domains`
   - Geo/offers: `country_tiers`, `geo_offers`, `ab_variants`
   - Safety net: `wikipedia_safe_urls`, `monitored_domains`, `domain_health_checks`, `custom_domains`
   - Ops: `broadcasts`, `broadcast_reads`, `error_logs`, `upgrade_requests`, `packages`, `quota_reset_snapshots`
   - RPCs: `admin_clicks_timeseries`, `admin_top_countries`, `admin_bot_reasons`, `admin_user_trend`, `_fast_analytics_summary`, `expire_monthly_plans`, `expire_old_upgrade_requests`, `delete_inactive_free_users`, plus `has_role`
   - Sob table e GRANT + RLS + scoped policies (`auth.uid()` based, admin via `has_role`)
3. **Auth setup** — Lovable Cloud default: email/password + Google OAuth. Admin login old repo er `/sx-vault-9k2m7x` baad — ekta normal `/auth` route, admin role check `user_roles` theke.

---

## Phase 2 — Code port (shortener + admin only)

Purono repo theke ai files copy + adapt korbo. Ecommerce parts (shop, cart, checkout, blog, breezy, sleepox-home, host variants) baad.

### Routes
- `src/routes/index.tsx` → simplified shortener landing (purono host-aware homepage er bodole single page)
- `src/routes/auth.tsx` → email/password + Google sign-in
- `src/routes/r.$code.ts` → public redirect endpoint (bot detect, geo block, prelanding, safe-page, weighted offer pick)
- `src/routes/_authenticated/` (10 page):
  - `dashboard.tsx` — link list, create/edit/delete, copy
  - `analytics.tsx` — charts, top countries, click timeseries
  - `live.tsx` — realtime click feed
  - `link-debugger.tsx` — per-link request inspection
  - `domains.tsx` — custom domains + health
  - `smart-filter.tsx` — cloaking/referrer rule editor
  - `control-panel.tsx` — admin control panel
  - `notices.tsx` — broadcasts admin
  - `support.tsx` — support tickets
  - `upgrade.tsx` — plan management
- `src/routes/api/public/preview-prelanding.$code.ts` — prelanding preview

### Lib (server fns + helpers)
`links.functions.ts`, `link-targeting.functions.ts`, `link-debugger.functions.ts`, `link-drilldown.functions.ts`, `custom-domains.functions.ts`, `domain-monitor.functions.ts`, `domain-health.server.ts`, `shortener-domains.functions.ts`, `short-domains.ts`, `analytics-data.functions.ts`, `analytics.server.ts`, `bot-detect.ts`, `prelanding-templates.ts` (1074 lines), `safe-page-pool.ts`, `smart-filter.functions.ts`, `broadcasts.functions.ts`, `support.functions.ts`, `app-settings.functions.ts`, `signup-protection.functions.ts`, `click-reset.functions.ts`, `cohort-retention.functions.ts`, `billing.functions.ts`, `plan-gate.server.ts`, `impersonation.ts`, `host.ts`, `fetch-ipv4.ts`, `error-log.server.ts`, `config.server.ts`, `request-auth.server.ts`.

Baad: `breezy-*`, `plisio-*` (crypto payment), `live-feed.functions.ts` keep, `redis-cache.server.ts` → Postgres-backed no-op shim (niche dekho).

### Components
- `broadcast-bell.tsx`, `broadcast-markdown.tsx`, `impersonation-banner.tsx`, `CountryShieldDialog.tsx`, `StatIcons.tsx`, `brand-logo.tsx`, `logo.tsx` — copy
- `breezy/`, `sleepox-home.tsx` — baad
- Notun: `AppSidebar.tsx` for admin layout (shadcn sidebar)

### Integrations
- `src/integrations/supabase/*` — Lovable Cloud enable korar por auto-regenerate hobe; old `client.server.ts`, `auth-middleware.ts`, `auth-attacher.ts`, `client-ipv4.server.ts` er logic merge korbo.

---

## Phase 3 — Runtime adaptations (Lovable Cloud constraints)

1. **Redis baad** — old code `ioredis` use kore (Contabo VPS er jonno). Cloudflare Workers (Lovable Cloud edge) e Node TCP socket nai → `ioredis` chalbe na. Replace strategy:
   - `redis-cache.server.ts` ke Postgres `analytics_cache` table-backed shim banabo (same API: `get/set/sadd/ttl`).
   - Bot fingerprint counting → `bot_fingerprints` table direct (already exists).
   - Pore VPS e gele, real Redis pluggable korbo via env flag.
2. **`supabaseAdmin` placement** — `r.$code.ts` route file client-reachable, so admin client `await import()` use korbo handler er vetore (current Lovable rules).
3. **`fetch-ipv4.ts` / `client-ipv4.server.ts`** — Workers e raw IPv4 socket nai. Simplify kore standard `fetch` use korbo; pore VPS e gele original restore hobe.
4. **Background jobs** — old repo te pm2 cron use kore (`expire_monthly_plans` etc). Lovable Cloud e pg_cron schedule korbo same SQL functions e.
5. **Multi-domain custom domains** — Lovable Cloud single domain. Custom domains UI rakhbo but actual DNS routing pore VPS e enable hobe.

---

## Phase 4 — Baseline working, then REDESIGN

Code port complete howar por old design (Sora display + Manrope body, lavender violet glow palette) baseline hisebe boshbe. Tarpor user er actual request — **redesign** — start:

1. Current screen capture nibo (homepage + dashboard).
2. 3ta visual preference question (palette / typography / layout preset) — proper visual choices, shortener domain-fit options.
3. `design--create_directions` diye 3 distinct rendered direction generate korbo (same locked taste, different composition/density/energy).
4. User pick korar por chosen direction strictly implement — tokens verbatim, composition match.

---

## Self-hosted migration path (later, after redesign locked)

Plan e ekhon implement na, but architecture eivabe rakhbo jate clean migration hoy:
- All Supabase calls `@/integrations/supabase/*` clients er moddhe — env swap kore self-hosted URL/keys dile cholbe.
- `redis-cache.server.ts` shim e `REDIS_URL` env thakle real Redis, na thakle Postgres fallback.
- All DB logic SQL migrations e — self-hosted Supabase e same migration apply hobe.
- Contabo VPS deploy guide (Docker compose for Supabase + Caddy for custom domains + PM2 for Node SSR) Phase 5 e step-by-step Bangla te debo.

---

## Technical details (dev-facing)

- **Stack**: TanStack Start v1, React 19, Vite 7, Tailwind v4, shadcn — already in place.
- **Server boundary**: app-internal = `createServerFn` (with `requireSupabaseAuth` middleware for protected); raw HTTP (`r/$code`, prelanding preview) = TanStack server routes.
- **Auth**: integration-managed `_authenticated/route.tsx` (Lovable Cloud auto-ships). Admin gate = `has_role(auth.uid(), 'admin')` RPC inside protected server fns.
- **RLS**: `links`, `clicks`, etc. user-scoped via `auth.uid() = user_id`; admin tables (`cloaking_rules`, `bot_rules`, `app_settings`, `broadcasts`, `monitored_domains`) admin-only via `has_role`.
- **Anon access**: `wikipedia_safe_urls`, `country_tiers`, `geo_offers` (read-only public — needed by `/r/$code` SSR via publishable-key server client).
- **Sidebar**: shadcn `Sidebar` with `collapsible="icon"`, active route via `useRouterState`.
- **Deploy**: prottek backend change er pore exact deploy command + log check command Bangla te debo.

---

## Ki order e build hobe

```text
1. Lovable Cloud enable
2. Consolidated migration apply (schema + RLS + grants + RPCs + seed admin role)
3. Integrations layer (supabase clients, auth middleware) verify
4. Port lib/ files (server fns + helpers) with adaptations
5. Port admin sidebar layout + 10 admin pages
6. Port /r/$code redirect + prelanding preview
7. Port auth page + landing page (placeholder, will redesign)
8. Verify build green, manual smoke (sign up, create link, hit /r/CODE)
9. STOP → redesign questions (palette/typography/layout) → directions → user picks → implement
10. (Future) self-hosted Supabase + Contabo VPS migration guide
```

Approve korle Phase 1 (Lovable Cloud enable + consolidated migration) theke start korbo.
