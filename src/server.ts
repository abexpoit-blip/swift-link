import "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderSafeArticle, type Snip } from "./lib/safe-article";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;
let localEnvLoaded = false;

// In-memory cache for DB snippets used by the safe article renderer.
const SNIPPET_CACHE: { items: Snip[]; expires: number } = { items: [], expires: 0 };
const SNIPPET_TTL_MS = 120_000;

const HARD_BOT_UA =
  /facebookexternalhit|facebookcatalog|facebot|meta-externalagent|meta-externalfetcher|metafetcher|whatsapp|telegrambot|slackbot|discordbot|twitterbot|linkedinbot|pinterest|skypeuripreview|googlebot|bingbot|yandexbot|duckduckbot|baiduspider|applebot|petalbot|semrushbot|ahrefsbot|mj12bot|dotbot|headlesschrome|phantomjs|puppeteer|playwright|chrome-lighthouse|curl|wget|python-requests|httpclient|axios\/|go-http-client|java\/|okhttp|node-fetch/i;
const META_ASNS = new Set(["32934", "63293", "54115", "149642"]);
const DC_ASNS = new Set([
  "16509",
  "14618",
  "8987",
  "39111",
  "62785",
  "15169",
  "396982",
  "139070",
  "36492",
  "8075",
  "8068",
  "8074",
  "8076",
  "16276",
  "12876",
  "24940",
  "63949",
  "20473",
  "14061",
  "13335",
  "209242",
]);
const META_V6 = ["2a03:2880", "2620:0:1c00", "2401:db00", "2803:6080"];
// IPv4 /16 Meta scraper prefixes — any hit is Facebook/Instagram, always serve safe (no 302)
const META_V4 = [
  "31.13.", "66.220.", "69.63.", "69.171.", "74.119.",
  "103.4.", "129.134.", "157.240.", "173.252.", "179.60.",
  "185.60.", "204.15.",
];
const MOBILE_UA = /android|iphone|ipad|ipod|mobile|silk|kindle|opera mini|opera mobi|blackberry|windows phone/i;
const ALLOWED_BACKEND_HOSTS = new Set(["api.adspx.com"]);
const PRIVATE_HOST_RE = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0|::1|fc00:|fe80:)/i;

type RedirectDecision = {
  found?: boolean;
  decision?: "money" | "safe" | "block";
  reasons?: string[];
  safe_url?: string | null;
  money_url?: string | null;
  link_id?: string | null;
};

function parseEnvContent(content: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    values[key] = rawValue.replace(/^['"]|['"]$/g, "").trim();
  }
  return values;
}

function applyEnv(values: Record<string, string>, override = false) {
  for (const [key, value] of Object.entries(values)) {
    if (!value) continue;
    if (!override && process.env[key]) continue;
    process.env[key] = value;
  }
}

async function loadLocalEnvFile() {
  if (localEnvLoaded) return;
  localEnvLoaded = true;

  try {
    const [{ existsSync, readFileSync }, { resolve }] = await Promise.all([
      import("node:fs"),
      import("node:path"),
    ]);

    const selfhostEnvPath = "/opt/supabase-prod/.env";
    const selfhostValues = existsSync(selfhostEnvPath)
      ? parseEnvContent(readFileSync(selfhostEnvPath, "utf8"))
      : null;

    const appEnvPath = resolve(process.cwd(), ".env");
    if (existsSync(appEnvPath)) {
      applyEnv(parseEnvContent(readFileSync(appEnvPath, "utf8")));
    }

    if (selfhostValues) {
      applyEnv(
        {
          SUPABASE_URL:
            selfhostValues.SUPABASE_URL || selfhostValues.API_EXTERNAL_URL || process.env.SUPABASE_URL || "https://api.adspx.com",
          SUPABASE_PUBLISHABLE_KEY:
            selfhostValues.ANON_KEY || selfhostValues.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "",
          SUPABASE_SERVICE_ROLE_KEY:
            selfhostValues.SERVICE_ROLE_KEY || selfhostValues.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "",
        },
        true,
      );
    }
  } catch {
    // Hosted runtime may not expose local env files; normal platform env vars still work.
  }
}

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry),
    );
  }
  return serverEntryPromise;
}

function pickHeader(req: Request, ...names: string[]): string {
  for (const name of names) {
    const value = req.headers.get(name);
    if (value) return value;
  }
  return "";
}

function isHardcodedBot(ua: string, ip: string): boolean {
  if (!ua) return true;
  if (HARD_BOT_UA.test(ua)) return true;
  const lowerIp = ip.toLowerCase();
  if (META_V6.some((prefix) => lowerIp.startsWith(prefix))) return true;
  if (META_V4.some((prefix) => lowerIp.startsWith(prefix))) return true;
  return false;
}

function fingerprintHash(ua: string, ip: string, acceptLang: string): string {
  // Use the FULL client IP, not the /24 block. On mobile carriers (CGNAT) thousands
  // of real users share a /24 with an identical in-app UA, which collapsed them into
  // one fingerprint and triggered false velocity_lock / learned_bot blocks.
  const value = `${ua}|${ip}|${acceptLang}`;

  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = (hash * 16777619) >>> 0;
  }
  return hash.toString(36);
}

function coherenceScore(ua: string, acceptLang: string, secChUa: string, secChMobile: string): number {
  let score = 100;
  if (!ua) score -= 40;
  if (!acceptLang) score -= 15;
  const isChromeLike = /chrome|edg\//i.test(ua) && !/firefox|safari\/[0-9]+\.[0-9]+ \(/i.test(ua);
  if (isChromeLike && !secChUa) score -= 25;
  const uaMobile = MOBILE_UA.test(ua);
  if (secChMobile === "?1" && !uaMobile) score -= 20;
  if (secChMobile === "?0" && uaMobile && /android|iphone/i.test(ua)) score -= 10;
  if (/chrome/i.test(ua) && score > 0 && !acceptLang) score -= 10;
  return Math.max(0, Math.min(100, score));
}

// --- Known-human pass (sleepox parity) -------------------------------------
// A visitor that already resolved to `money` gets a 6h pass cookie bound to their
// fingerprint. Every later hit skips the SOFT filters (velocity, fbclid reuse,
// reviewer-geo, cold-desktop), which is what fixed reload / duplicate-tab loss.
const HUMAN_COOKIE = "_sxh";
const HUMAN_TTL_SEC = 6 * 60 * 60;

function readCookie(request: Request, name: string): string {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return "";
}

function humanPassCookie(fingerprint: string, secure: boolean): string {
  return `${HUMAN_COOKIE}=${encodeURIComponent(fingerprint)}; Max-Age=${HUMAN_TTL_SEC}; Path=/; SameSite=Lax; HttpOnly${secure ? "; Secure" : ""}`;
}

// Cloudflare returns XX / T1 when it cannot geo-locate (Tor, unknown, some carriers).
// Reviewer-geo rules must NEVER fire on an unconfident country.
function isCountryConfident(country: string): boolean {
  return /^[A-Z]{2}$/.test(country) && country !== "XX" && country !== "T1";
}

// Chrome-family UA that did NOT send sec-ch-ua = headless / spoofed automation signal.
function isChromeWithoutClientHints(ua: string, secChUa: string): boolean {
  if (!/chrome\/|edg\//i.test(ua)) return false;
  if (/opr\/|yabrowser|samsungbrowser/i.test(ua)) return false;
  return !secChUa;
}


function isBackendAllowed(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    const host = parsed.hostname.toLowerCase();
    if (PRIVATE_HOST_RE.test(host)) return false;
    return ALLOWED_BACKEND_HOSTS.has(host);
  } catch {
    return false;
  }
}

async function renderEntrySafe(request?: Request, slug?: string): Promise<Response> {
  // Try to hydrate snippets from DB; fall back to FALLBACK_SNIPPETS built into safe-article.
  const now = Date.now();
  if (!SNIPPET_CACHE.items.length || SNIPPET_CACHE.expires < now) {
    try {
      const { getAdspxPublicClient } = await import("./lib/adspx-public.server");
      const supabasePublic = getAdspxPublicClient();
      const { data } = await supabasePublic
        .from("safe_page_snippets")
        .select("title, body")
        .eq("is_active", true)
        .limit(50);
      SNIPPET_CACHE.items = (data as Snip[] | null) || [];
      SNIPPET_CACHE.expires = now + SNIPPET_TTL_MS;
    } catch (error) {
      console.error("[server:/r] safe snippet fetch failed", error);
    }
  }
  // og:image must resolve on the actual serving host (adspx.com) — the /media/*-cover.jpg
  // handler lives here. Persona domains (dailyreader.co etc.) are only for branding text.
  const reqUrl = request ? new URL(request.url) : null;
  const imageHost = reqUrl?.host;
  // Fallback: derive slug from URL if caller didn't pass one, so every /r/{slug}
  // response — including error/catch paths — selects the same template deterministically.
  let effectiveSlug = slug;
  if (!effectiveSlug && reqUrl) {
    const m = reqUrl.pathname.match(/^\/r\/([^/]+)\/?$/);
    if (m) effectiveSlug = decodeURIComponent(m[1] || "").slice(0, 64) || undefined;
  }
  // Deterministic template selection: FB / Meta crawlers get the SAME template every time
  // for a given slug (consistency = FB trust signal). Real safe traffic gets variety.
  const ua = request?.headers.get("user-agent") || undefined;
  return new Response(renderSafeArticle(SNIPPET_CACHE.items, imageHost, { slug: effectiveSlug, ua }), {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
      "x-adspx-r-handler": "entry-safe",
    },
  });
}


function getBackendApiBase(request: Request): string {
  const requestOrigin = new URL(request.url).origin;
  const configured =
    process.env.BACKEND_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.API_EXTERNAL_URL ||
    "https://api.adspx.com";
  const backend = configured.replace(/\/$/, "");

  // If the browser build points to the main site for same-origin auth proxying,
  // never proxy back to the same host or it would recurse forever.
  if (backend === requestOrigin) return "https://api.adspx.com";
  // Fail closed to the real self-hosted API if env accidentally points at the
  // app host or a private host. This keeps /auth/v1 and /rest/v1 from recursing.
  if (!isBackendAllowed(backend)) return "https://api.adspx.com";
  return backend;
}

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    if (payload.unhandled !== true || payload.message !== "HTTPError") return response;
  } catch {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

async function handleBackendProxy(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const shouldProxy =
    url.pathname.startsWith("/auth/v1/") ||
    url.pathname.startsWith("/rest/v1/") ||
    url.pathname.startsWith("/storage/v1/");

  if (!shouldProxy) return null;

  const legacyStatsResponse = await handleLegacyClicksStatsProxy(request, url);
  if (legacyStatsResponse) return legacyStatsResponse;

  const targetUrl = new URL(`${getBackendApiBase(request)}${url.pathname}${url.search}`);
  const headers = new Headers(request.headers);
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("host");
  headers.delete("accept-encoding");

  const method = request.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";
  // Buffer the body — Node's fetch requires `duplex: 'half'` for streamed bodies.
  const body = hasBody ? await request.arrayBuffer() : undefined;

  const response = await fetch(targetUrl, {
    method,
    headers,
    body,
    redirect: "manual",
  });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.set("cache-control", "no-store");
  responseHeaders.set("x-adspx-backend-proxy", "selfhost");
  // Node fetch transparently decompresses upstream auth responses, so forwarding
  // the original compression headers makes browsers fail with
  // net::ERR_CONTENT_DECODING_FAILED, surfaced by the auth client as
  // TypeError: Failed to fetch.
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

function isLegacyClicksStatsRequest(url: URL, method: string): boolean {
  if (url.pathname !== "/rest/v1/clicks") return false;
  if (method !== "GET" && method !== "HEAD") return false;
  const select = decodeURIComponent(url.searchParams.get("select") || "").toLowerCase();
  return select.includes("country") && select.includes("referer_host") && select.includes("links!inner");
}

function copyStatsFilter(src: URLSearchParams, dst: URLSearchParams, key: string) {
  const value = src.get(key);
  if (value) dst.set(key, value);
}

async function handleLegacyClicksStatsProxy(request: Request, url: URL): Promise<Response | null> {
  const method = request.method.toUpperCase();
  if (!isLegacyClicksStatsRequest(url, method)) return null;

  const userFilter = url.searchParams.get("links.user_id") || url.searchParams.get("user_id");
  if (!userFilter?.startsWith("eq.")) return null;

  const rewritten = new URL(`${getBackendApiBase(request)}/rest/v1/traffic_logs`);
  rewritten.searchParams.set("select", "decision,country,referer,created_at");
  rewritten.searchParams.set("user_id", userFilter);
  copyStatsFilter(url.searchParams, rewritten.searchParams, "created_at");
  copyStatsFilter(url.searchParams, rewritten.searchParams, "limit");
  copyStatsFilter(url.searchParams, rewritten.searchParams, "offset");
  copyStatsFilter(url.searchParams, rewritten.searchParams, "order");

  const headers = new Headers(request.headers);
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("host");
  headers.delete("accept-encoding");

  const upstream = await fetch(rewritten, { method, headers, redirect: "manual" });
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.set("cache-control", "no-store");
  responseHeaders.set("x-adspx-backend-proxy", "selfhost");
  responseHeaders.set("x-adspx-legacy-clicks-stats", "traffic_logs");
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  if (!upstream.ok || method === "HEAD") {
    return new Response(method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  }

  const data = await upstream.json().catch(() => []);
  const rows = Array.isArray(data)
    ? data.map((row: any) => ({
        country: row.country ?? null,
        referer_host: row.referer ?? null,
        is_bot: row.decision !== "money",
        created_at: row.created_at,
      }))
    : [];

  responseHeaders.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(rows), {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

// ─── On-the-fly OG cover images for safe pages ───
// Facebook crawler fetches og:image URLs; we generate a 1200×630 SVG cover
// derived from the slug so every article page has a real, cacheable share preview.
// URL shape: /media/{slug}-cover.jpg  (served as image/svg+xml — modern crawlers accept it)
function handleMediaCover(request: Request): Response | null {
  const url = new URL(request.url);
  const m = url.pathname.match(/^\/media\/([a-z0-9-]{1,80})-cover\.(jpg|jpeg|png|svg)$/i);
  if (!m) return null;
  const slug = m[1];
  // Deterministic pseudo-random from slug so the same URL always yields the same image
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) | 0;
  const palettes = [
    ["#1a1a2e", "#16213e", "#e94560"],
    ["#0e1117", "#1f2937", "#3b82f6"],
    ["#2d1b0e", "#7c3a1d", "#f59e0b"],
    ["#1a2f1f", "#2d5a3d", "#10b981"],
    ["#2a1b3d", "#4a2f6b", "#a78bfa"],
    ["#3d1a1a", "#7c2d2d", "#ef4444"],
    ["#1e293b", "#334155", "#06b6d4"],
    ["#292524", "#57534e", "#fbbf24"],
  ];
  const p = palettes[Math.abs(h) % palettes.length];
  // Title from slug (dash → space, title-cased first letters)
  const title = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 60);
  // Word-wrap title across up to 3 lines (~22 chars/line for 1200px canvas)
  const words = title.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > 22) {
      if (cur) lines.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
    if (lines.length >= 2) break;
  }
  if (cur && lines.length < 3) lines.push(cur);
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
  const tspans = lines.map((ln, i) => `<tspan x="80" dy="${i === 0 ? 0 : 88}">${esc(ln)}</tspan>`).join("");
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${p[0]}"/>
      <stop offset="100%" stop-color="${p[1]}"/>
    </linearGradient>
    <radialGradient id="glow" cx="85%" cy="15%" r="60%">
      <stop offset="0%" stop-color="${p[2]}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${p[2]}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect x="60" y="60" width="6" height="60" fill="${p[2]}" rx="3"/>
  <text x="80" y="105" font-family="Georgia, 'Times New Roman', serif" font-size="26" font-weight="400" fill="${p[2]}" letter-spacing="4">FEATURED ARTICLE</text>
  <text x="80" y="240" font-family="Georgia, 'Times New Roman', serif" font-size="72" font-weight="700" fill="#ffffff">${tspans}</text>
  <line x1="80" y1="530" x2="240" y2="530" stroke="${p[2]}" stroke-width="2"/>
  <text x="80" y="570" font-family="-apple-system, 'Segoe UI', sans-serif" font-size="22" fill="#e5e7eb" opacity="0.85">Editorial · ${new Date().getFullYear()}</text>
</svg>`;
  return new Response(svg, {
    status: 200,
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=86400, s-maxage=604800, immutable",
      "x-adspx-r-handler": "media-cover",
    },
  });
}

const CHUNK_RECOVERY_SCRIPT = `<script id="adspx_chunk_reload">
(function(){
  if (window.__adspxChunkRecoveryInstalled) return;
  window.__adspxChunkRecoveryInstalled = true;
  function isChunkErr(msg){
    if(!msg) return false;
    msg = String(msg);
    return msg.indexOf('Failed to fetch dynamically imported module') !== -1
        || msg.indexOf('Importing a module script failed') !== -1
        || msg.indexOf('error loading dynamically imported module') !== -1
        || /ChunkLoadError/i.test(msg);
  }
  function reloadOnce(){
    try {
      var k = '__adspx_reload_at';
      var last = Number(sessionStorage.getItem(k) || 0);
      var now = Date.now();
      if (now - last < 10000) return;
      sessionStorage.setItem(k, String(now));
    } catch(e){}
    location.reload();
  }
  window.addEventListener('error', function(e){
    if (isChunkErr(e && (e.message || (e.error && e.error.message)))) reloadOnce();
  });
  window.addEventListener('unhandledrejection', function(e){
    var r = e && e.reason;
    var msg = r && (r.message || r);
    if (isChunkErr(msg)) reloadOnce();
  });
})();
</script>`;

async function injectChunkRecoveryIntoHtml(request: Request, response: Response): Promise<Response> {
  const url = new URL(request.url);
  const trace = (reason: string) => {
    const h = new Headers(response.headers);
    h.set("x-adspx-chunk-recovery", `skip:${reason}`);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers: h });
  };

  if (response.status < 200 || response.status >= 400) return trace(`status-${response.status}`);
  if (url.pathname.startsWith("/r/") || url.pathname.startsWith("/media/")) return trace("path-r-media");
  if (url.pathname.startsWith("/auth/v1/") || url.pathname.startsWith("/rest/v1/") || url.pathname.startsWith("/storage/v1/")) return trace("path-backend");
  if (url.pathname.startsWith("/api/")) return trace("path-api");
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/_build/")) return trace("path-assets");
  if (/\.(js|mjs|css|map|png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|txt|xml|json)$/i.test(url.pathname)) return trace("ext-static");

  const contentType = response.headers.get("content-type") || "";
  if (contentType && !contentType.includes("text/html")) return trace(`ct-${contentType.split(";")[0]}`);


  const html = await response.text();
  let injectedHtml = html;
  if (!injectedHtml.includes("adspx_chunk_reload")) {
    if (/<\/head>/i.test(injectedHtml)) {
      injectedHtml = injectedHtml.replace(/<\/head>/i, `${CHUNK_RECOVERY_SCRIPT}</head>`);
    } else if (/<head[^>]*>/i.test(injectedHtml)) {
      injectedHtml = injectedHtml.replace(/<head[^>]*>/i, (m) => `${m}${CHUNK_RECOVERY_SCRIPT}`);
    } else if (/<body[^>]*>/i.test(injectedHtml)) {
      injectedHtml = injectedHtml.replace(/<body[^>]*>/i, (m) => `${m}${CHUNK_RECOVERY_SCRIPT}`);
    } else {
      injectedHtml = `${CHUNK_RECOVERY_SCRIPT}${injectedHtml}`;
    }
  }


  const headers = new Headers(response.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "no-store, max-age=0, must-revalidate");
  headers.set("cdn-cache-control", "no-store");
  headers.set("cloudflare-cdn-cache-control", "no-store");
  headers.set("x-adspx-chunk-recovery", "1");
  headers.delete("content-length");

  return new Response(injectedHtml, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}


async function handleRedirectRoute(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/r\/([^/]+)\/?$/);
  if (!match) return null;

  try {
    await loadLocalEnvFile();
    const slug = decodeURIComponent(match[1] || "").slice(0, 64);
    if (!slug) return renderEntrySafe(request, slug);

    const ua = request.headers.get("user-agent") || "";
    const ip = pickHeader(request, "cf-connecting-ip", "x-real-ip", "x-forwarded-for").split(",")[0].trim();
    const country = pickHeader(request, "cf-ipcountry", "x-vercel-ip-country").toUpperCase();
    const asn = pickHeader(request, "cf-ipasn", "x-asn");
    const referer = request.headers.get("referer") || "";
    const acceptLang = request.headers.get("accept-language") || "";
    const secChUa = request.headers.get("sec-ch-ua") || "";
    const secChMobile = request.headers.get("sec-ch-ua-mobile") || "";
    const isMobile = MOBILE_UA.test(ua) || secChMobile === "?1";
    const fingerprint = fingerprintHash(ua, ip, acceptLang);
    const knownHuman = readCookie(request, HUMAN_COOKIE) === fingerprint && !!fingerprint;
    const countryConfident = isCountryConfident(country);
    const chromeNoHints = isChromeWithoutClientHints(ua, secChUa);

    if (process.env.DEBUG_REDIRECT === "1") {
      console.log(`[server:/r] slug=${slug} ua_len=${ua.length} country=${country} mobile=${isMobile} known_human=${knownHuman} url=${process.env.SUPABASE_URL} srk=${(process.env.SUPABASE_SERVICE_ROLE_KEY || "").length}`);
    }

    const { getAdspxPublicClient } = await import("./lib/adspx-public.server");
    const supabasePublic = getAdspxPublicClient();
    const rpcArgs = {
      _short_code: slug,
      _fbclid: url.searchParams.get("fbclid"),
      _fingerprint: fingerprint,
      _ip: ip,
      _country: country,
      _asn: asn,
      _ua: ua,
      _referer: referer,
      _is_mobile: isMobile,
      _is_hard_bot: isHardcodedBot(ua, ip) || (!!asn && META_ASNS.has(asn)),
      _is_datacenter: !!asn && DC_ASNS.has(asn),
      _coherence_score: coherenceScore(ua, acceptLang, secChUa, secChMobile),
      _known_human: knownHuman,
      _country_confident: countryConfident,
      _chrome_no_hints: chromeNoHints,
      _asn_unknown: !asn,
    };

    // Transient upstream failures (502/504/network blips from the DB proxy) must not
    // silently downgrade a real human to the safe article -> that is real traffic loss.
    // Retry quickly a couple of times before giving up.
    const isTransient = (e: unknown) => {
      const m = String((e as { message?: string } | null)?.message ?? e ?? "");
      return /50[234]|timeout|timed out|fetch failed|ECONNRESET|ETIMEDOUT|EAI_AGAIN|socket hang up|upstream/i.test(m);
    };

    let rpcResult = await supabasePublic.rpc("resolve_public_redirect", rpcArgs);
    for (let attempt = 1; attempt <= 2 && rpcResult.error && isTransient(rpcResult.error); attempt++) {
      await new Promise((r) => setTimeout(r, attempt * 120));
      rpcResult = await supabasePublic.rpc("resolve_public_redirect", rpcArgs);
      if (!rpcResult.error) {
        console.warn(`[server:/r] resolve_public_redirect recovered on retry ${attempt}`);
      }
    }

    const data = rpcResult.data as RedirectDecision | null;
    const error = rpcResult.error;

    if (process.env.DEBUG_REDIRECT === "1") {
      console.log(`[server:/r] rpc_result data=${JSON.stringify(data)} error=${JSON.stringify(error)}`);
    }

    if (error) {
      console.error("[server:/r] resolve_public_redirect failed (after retries)", error);
      return renderEntrySafe(request, slug);
    }


    if (!data || data.found === false || data.decision !== "money") {
      if (data?.safe_url) {
        return new Response(null, {
          status: 302,
          headers: {
            location: data.safe_url,
            "cache-control": "no-store",
            "referrer-policy": "no-referrer",
            "x-adspx-r-handler": "entry-safe-url",
          },
        });
      }
      return renderEntrySafe(request, slug);
    }

    if (!data.money_url) return renderEntrySafe(request, slug);
    return new Response(null, {
      status: 302,
      headers: {
        location: data.money_url,
        "cache-control": "no-store",
        "referrer-policy": "no-referrer",
        "x-adspx-r-handler": "entry-money",
      },
    });
  } catch (error) {
    console.error("[server:/r] handler error", error);
    return renderEntrySafe(request);
  }
}

// Security headers applied to every response (improves domain trust score).
// Note: do NOT set X-Frame-Options on /r/* article responses for FB crawler — FB embeds in iframe.
function applySecurityHeaders(request: Request, response: Response): Response {
  const url = new URL(request.url);
  const headers = new Headers(response.headers);

  // Always-on baseline
  if (!headers.has("strict-transport-security")) {
    headers.set("strict-transport-security", "max-age=31536000; includeSubDomains; preload");
  }
  if (!headers.has("x-content-type-options")) {
    headers.set("x-content-type-options", "nosniff");
  }
  if (!headers.has("referrer-policy")) {
    headers.set("referrer-policy", "strict-origin-when-cross-origin");
  }
  if (!headers.has("permissions-policy")) {
    headers.set("permissions-policy", "geolocation=(), microphone=(), camera=(), payment=()");
  }
  if (!headers.has("x-xss-protection")) {
    headers.set("x-xss-protection", "0");
  }

  // X-Frame-Options: skip for /r/* (cloaked article may be previewed in social iframes)
  const isRedirectRoute = url.pathname.startsWith("/r/");
  if (!isRedirectRoute && !headers.has("x-frame-options")) {
    headers.set("x-frame-options", "SAMEORIGIN");
  }

  const nullBodyStatus = response.status === 204 || response.status === 205 || response.status === 304;

  return new Response(nullBodyStatus ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const tag = (r: Response, source: string): Response => {
      const h = new Headers(r.headers);
      h.set("x-adspx-route", source);
      return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h });
    };
    try {
      await loadLocalEnvFile();
      const backendProxyResponse = await handleBackendProxy(request);
      if (backendProxyResponse) return applySecurityHeaders(request, tag(backendProxyResponse, "proxy"));
      const mediaResponse = handleMediaCover(request);
      if (mediaResponse) return applySecurityHeaders(request, tag(mediaResponse, "media"));
      const redirectResponse = await handleRedirectRoute(request);
      if (redirectResponse) return applySecurityHeaders(request, tag(redirectResponse, "redirect"));

      const handler = await getServerEntry();
      const response = await normalizeCatastrophicSsrResponse(await handler.fetch(request, env, ctx));
      return applySecurityHeaders(request, tag(await injectChunkRecoveryIntoHtml(request, response), "ssr"));

    } catch (error) {
      console.error(error);
      return applySecurityHeaders(
        request,
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    }
  },
};