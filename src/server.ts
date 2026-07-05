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
  /facebookexternalhit|facebookcatalog|meta-externalagent|metafetcher|whatsapp|telegrambot|slackbot|discordbot|twitterbot|linkedinbot|pinterest|skypeuripreview|googlebot|bingbot|yandexbot|duckduckbot|baiduspider|applebot|petalbot|semrushbot|ahrefsbot|mj12bot|dotbot|headlesschrome|phantomjs|puppeteer|playwright|chrome-lighthouse|curl|wget|python-requests|httpclient|axios\/|go-http-client|java\/|okhttp|node-fetch/i;
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
const MOBILE_UA = /android|iphone|ipad|ipod|mobile|silk|kindle|opera mini|opera mobi|blackberry|windows phone/i;

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
  return META_V6.some((prefix) => lowerIp.startsWith(prefix));
}

function fingerprintHash(ua: string, ip: string, acceptLang: string): string {
  const value = `${ua}|${ip.split(".").slice(0, 3).join(".")}|${acceptLang}`;
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

function renderEntrySafe(): Response {
  return new Response(
    "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Article</title></head><body><article style='max-width:720px;margin:48px auto;padding:0 20px;font:18px/1.7 Georgia,serif;color:#222'><h1 style='font-size:38px;line-height:1.15'>Notes From a Quiet Afternoon</h1><p>Small habits compound into entire lifestyles. The hard part is starting before motivation arrives, which usually means starting when it is not comfortable.</p><p>We tend to overestimate what we can accomplish in a day and underestimate what a year of small, consistent actions can produce.</p></article></body></html>",
    {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "referrer-policy": "no-referrer",
        "x-adspx-r-handler": "entry-safe",
      },
    },
  );
}

async function handleRedirectRoute(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/r\/([^/]+)\/?$/);
  if (!match) return null;

  try {
    await loadLocalEnvFile();
    const slug = decodeURIComponent(match[1] || "").slice(0, 64);
    if (!slug) return renderEntrySafe();

    const ua = request.headers.get("user-agent") || "";
    const ip = pickHeader(request, "cf-connecting-ip", "x-real-ip", "x-forwarded-for").split(",")[0].trim();
    const country = pickHeader(request, "cf-ipcountry", "x-vercel-ip-country").toUpperCase();
    const asn = pickHeader(request, "cf-ipasn", "x-asn");
    const referer = request.headers.get("referer") || "";
    const acceptLang = request.headers.get("accept-language") || "";
    const secChUa = request.headers.get("sec-ch-ua") || "";
    const secChMobile = request.headers.get("sec-ch-ua-mobile") || "";
    const isMobile = MOBILE_UA.test(ua) || secChMobile === "?1";

    console.log(`[server:/r] slug=${slug} ua_len=${ua.length} country=${country} mobile=${isMobile} url=${process.env.SUPABASE_URL} srk=${(process.env.SUPABASE_SERVICE_ROLE_KEY || "").length}`);

    const { getAdspxPublicClient } = await import("./lib/adspx-public.server");
    const supabasePublic = getAdspxPublicClient();
    const rpcArgs = {
      _short_code: slug,
      _fbclid: url.searchParams.get("fbclid"),
      _fingerprint: fingerprintHash(ua, ip, acceptLang),
      _ip: ip,
      _country: country,
      _asn: asn,
      _ua: ua,
      _referer: referer,
      _is_mobile: isMobile,
      _is_hard_bot: isHardcodedBot(ua, ip) || (!!asn && META_ASNS.has(asn)),
      _is_datacenter: !!asn && DC_ASNS.has(asn),
      _coherence_score: coherenceScore(ua, acceptLang, secChUa, secChMobile),
    };
    const rpcResult = await supabasePublic.rpc("resolve_public_redirect", rpcArgs);
    const data = rpcResult.data as RedirectDecision | null;
    const error = rpcResult.error;

    console.log(`[server:/r] rpc_result data=${JSON.stringify(data)} error=${JSON.stringify(error)}`);

    if (error) {
      console.error("[server:/r] resolve_public_redirect failed", error);
      return renderEntrySafe();
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
      return renderEntrySafe();
    }

    if (!data.money_url) return renderEntrySafe();
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
    return renderEntrySafe();
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
    try {
      await loadLocalEnvFile();
      const redirectResponse = await handleRedirectRoute(request);
      if (redirectResponse) return applySecurityHeaders(request, redirectResponse);
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return applySecurityHeaders(request, response);
    } catch (error) {
      console.error(error);
      return applySecurityHeaders(
        request,
        new Response("Internal Server Error", {
          status: 500,
          headers: { "content-type": "text/plain; charset=utf-8" },
        }),
      );
    }
  },
};