import { createFileRoute } from "@tanstack/react-router";

// ---------- Constants: hardcoded crawler signatures (Step 0) ----------
const HARD_BOT_UA =
  /facebookexternalhit|facebookcatalog|meta-externalagent|metafetcher|whatsapp|telegrambot|slackbot|discordbot|twitterbot|linkedinbot|pinterest|skypeuripreview|googlebot|bingbot|yandexbot|duckduckbot|baiduspider|applebot|petalbot|semrushbot|ahrefsbot|mj12bot|dotbot|headlesschrome|phantomjs|puppeteer|playwright|chrome-lighthouse|curl|wget|python-requests|httpclient|axios\/|go-http-client|java\/|okhttp|node-fetch/i;

// Meta-owned ASNs
const META_ASNS = new Set(["32934", "63293", "54115", "149642"]);
// AWS / GCP / Azure / OVH / Hetzner / Linode / DO datacenter ASNs (representative sample)
const DC_ASNS = new Set([
  "16509", "14618", "8987", "39111", "62785", // AWS
  "15169", "396982", "139070", "36492", // GCP / Google
  "8075", "8068", "8074", "8076", // Microsoft / Azure
  "16276", "12876", // OVH
  "24940", // Hetzner
  "63949", "20473", // Linode / Vultr
  "14061", // DigitalOcean
  "13335", "209242", // Cloudflare WARP datacenter ranges
]);
// IPv6 prefixes from Meta (2a03:2880::/29 family)
const META_V6 = ["2a03:2880", "2620:0:1c00", "2401:db00", "2803:6080"];

const MOBILE_UA = /android|iphone|ipad|ipod|mobile|silk|kindle|opera mini|opera mobi|blackberry|windows phone/i;

// ---------- Helpers ----------
function pickHeader(req: Request, ...names: string[]): string {
  for (const n of names) {
    const v = req.headers.get(n);
    if (v) return v;
  }
  return "";
}

function isHardcodedBot(ua: string, ip: string): boolean {
  if (!ua) return true;
  if (HARD_BOT_UA.test(ua)) return true;
  if (ip) {
    const lower = ip.toLowerCase();
    if (META_V6.some((p) => lower.startsWith(p))) return true;
  }
  return false;
}

function fingerprintHash(ua: string, ip: string, acceptLang: string): string {
  // FNV-1a style cheap hash — deterministic, no crypto needed
  const s = `${ua}|${ip.split(".").slice(0, 3).join(".")}|${acceptLang}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h.toString(36);
}

function coherenceScore(ua: string, acceptLang: string, secChUa: string, secChMobile: string): number {
  let score = 100;
  if (!ua) score -= 40;
  if (!acceptLang) score -= 15;
  // Modern Chrome/Edge should send sec-ch-ua
  const isChromeLike = /chrome|edg\//i.test(ua) && !/firefox|safari\/[0-9]+\.[0-9]+ \(/i.test(ua);
  if (isChromeLike && !secChUa) score -= 25;
  // sec-ch-ua-mobile should align with UA
  const uaMobile = MOBILE_UA.test(ua);
  if (secChMobile === "?1" && !uaMobile) score -= 20;
  if (secChMobile === "?0" && uaMobile && /android|iphone/i.test(ua)) score -= 10;
  // UA claiming Chrome but no Accept header
  if (/chrome/i.test(ua) && score > 0 && !acceptLang) score -= 10;
  return Math.max(0, Math.min(100, score));
}

// ---------- In-memory link cache ----------
type CachedLink = {
  id: string;
  user_id: string;
  adsterra_url: string;
  safe_url: string | null;
  is_active: boolean;
  expires: number;
};
const LINK_CACHE = new Map<string, CachedLink>();
const SNIPPET_CACHE: { items: { title: string; body: string }[]; expires: number } = { items: [], expires: 0 };
const CACHE_TTL_MS = 60_000;
const CACHE_MAX = 1000;

// ---------- Dynamic safe page renderer ----------
function shuffle<T>(a: T[]): T[] {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function renderSafeArticle(snippets: { title: string; body: string }[]): string {
  const picks = shuffle(snippets).slice(0, 4);
  const lead = picks[0] || {
    title: "Notes From a Quiet Afternoon",
    body: "Small habits compound into entire lifestyles. The hard part is starting before motivation arrives.",
  };
  const rest = picks.slice(1);
  const year = new Date().getFullYear();
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(lead.title)} — Daily Reader</title>
<meta name="description" content="${escapeHtml(lead.body.slice(0, 150))}"/>
<style>
:root{--bg:#fafaf7;--ink:#1a1a1a;--muted:#666;--accent:#0a6;--rule:#e6e6e0}
*{box-sizing:border-box}body{margin:0;font:17px/1.7 Georgia,serif;background:var(--bg);color:var(--ink)}
header{padding:24px 20px;border-bottom:1px solid var(--rule)}
header h1{margin:0;font-size:22px;letter-spacing:-.01em}
header span{color:var(--muted);font-size:13px}
main{max-width:680px;margin:0 auto;padding:36px 20px 80px}
article h2{font-size:32px;line-height:1.2;margin:0 0 16px;letter-spacing:-.02em}
article .meta{color:var(--muted);font-size:14px;margin-bottom:28px}
article p{margin:0 0 18px}
hr{border:0;border-top:1px solid var(--rule);margin:36px 0}
.related h3{font-size:16px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
.related a{display:block;color:var(--ink);text-decoration:none;padding:14px 0;border-bottom:1px solid var(--rule)}
.related a:hover{color:var(--accent)}
footer{text-align:center;color:var(--muted);font-size:13px;padding:24px 20px;border-top:1px solid var(--rule)}
</style></head><body>
<header><h1>Daily Reader</h1><span>Stories worth your time · ${year}</span></header>
<main>
<article>
<h2>${escapeHtml(lead.title)}</h2>
<div class="meta">By Editorial Staff · ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
<p>${escapeHtml(lead.body)}</p>
<p>${escapeHtml(rest[0]?.body || "There is wisdom in the unremarkable parts of every day. We tend to skip them while chasing the dramatic.")}</p>
<p>${escapeHtml(rest[1]?.body || "Consider this an invitation to slow down. Read the next paragraph twice.")}</p>
<p>${escapeHtml(rest[2]?.body || "Patterns are noisy in real time and obvious in hindsight. Most progress hides inside that gap.")}</p>
</article>
<hr/>
<section class="related"><h3>More Reading</h3>
${rest.map((r) => `<a href="#">${escapeHtml(r.title)}</a>`).join("\n")}
</section>
</main>
<footer>© ${year} Daily Reader · A small publication about ordinary life</footer>
</body></html>`;
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

// ---------- Money page with JS behavior challenge ----------
function renderMoneyPage(moneyUrl: string, fbclid: string | null, linkId: string): string {
  // Lightweight challenge: 2s window for scroll/mouse/touch. On success → location.replace.
  // On fail → stays on this page (safe).
  return `<!doctype html>
<html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Loading…</title>
<style>html,body{margin:0;height:100%;background:#fff;font-family:system-ui,-apple-system,sans-serif}
.wrap{display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;color:#333}
.spinner{width:38px;height:38px;border:3px solid #eee;border-top-color:#0a6;border-radius:50%;animation:spin .8s linear infinite;margin-bottom:14px}
@keyframes spin{to{transform:rotate(360deg)}}
.sub{font-size:13px;color:#888}</style></head>
<body><div class="wrap"><div class="spinner"></div><div>Preparing your content…</div><div class="sub">Please wait a moment</div></div>
<script>
(function(){
  var events=0,start=Date.now();
  var bump=function(){events++};
  ['scroll','mousemove','touchstart','touchmove','keydown','pointermove'].forEach(function(e){addEventListener(e,bump,{passive:true,once:false})});
  // Move cursor naturally by checking matchMedia / visualViewport
  var hasViewport = typeof visualViewport !== 'undefined';
  var hasHover = matchMedia('(hover:hover)').matches;
  setTimeout(function(){
    var ok = events >= 1 || hasViewport;
    if(!ok){ return; } // stays on safe-looking shell
    try{
      var payload = {fbclid:${JSON.stringify(fbclid)},link_id:${JSON.stringify(linkId)},events:events,ms:Date.now()-start,hover:hasHover};
      fetch('/api/public/behavior-check',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),keepalive:true}).catch(function(){});
    }catch(e){}
    location.replace(${JSON.stringify(moneyUrl)});
  }, 2000);
})();
</script></body></html>`;
}

// ---------- Route ----------
export const Route = createFileRoute("/r/$slug")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const slug = String(params.slug || "").slice(0, 64);
        if (!slug) return new Response("Not found", { status: 404 });

        const url = new URL(request.url);
        const fbclid = url.searchParams.get("fbclid");

        const ua = request.headers.get("user-agent") || "";
        const ip = pickHeader(request, "cf-connecting-ip", "x-real-ip", "x-forwarded-for").split(",")[0].trim();
        const country = pickHeader(request, "cf-ipcountry", "x-vercel-ip-country").toUpperCase();
        const asn = pickHeader(request, "cf-ipasn", "x-asn");
        const referer = request.headers.get("referer") || "";
        const acceptLang = request.headers.get("accept-language") || "";
        const secChUa = request.headers.get("sec-ch-ua") || "";
        const secChMobile = request.headers.get("sec-ch-ua-mobile") || "";

        const fp = fingerprintHash(ua, ip, acceptLang);
        const isHard = isHardcodedBot(ua, ip) || (asn && META_ASNS.has(asn));
        const isDC = !!asn && DC_ASNS.has(asn);
        const isMobile = MOBILE_UA.test(ua) || secChMobile === "?1";
        const coherence = coherenceScore(ua, acceptLang, secChUa, secChMobile);

        // Resolve link from cache or DB
        const now = Date.now();
        let link = LINK_CACHE.get(slug);
        if (link && link.expires < now) { LINK_CACHE.delete(slug); link = undefined; }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (!link) {
          const { data } = await supabaseAdmin
            .from("links")
            .select("id, user_id, adsterra_url, safe_url, is_active")
            .eq("short_code", slug)
            .maybeSingle();
          if (!data || !data.is_active) {
            return new Response("Link not found", { status: 404, headers: { "content-type": "text/plain" } });
          }
          link = { ...data, expires: now + CACHE_TTL_MS };
          if (LINK_CACHE.size >= CACHE_MAX) {
            const k = LINK_CACHE.keys().next().value;
            if (k) LINK_CACHE.delete(k);
          }
          LINK_CACHE.set(slug, link);
        }

        // Decision pipeline via DB
        const { data: decisionData } = await (supabaseAdmin.rpc as any)("evaluate_redirect", {
          _link_id: link.id,
          _user_id: link.user_id,
          _short_code: slug,
          _fbclid: fbclid,
          _fingerprint: fp,
          _ip: ip,
          _country: country,
          _asn: asn,
          _ua: ua,
          _referer: referer,
          _is_mobile: isMobile,
          _is_hard_bot: !!isHard,
          _is_datacenter: isDC,
          _coherence_score: coherence,
        });

        const decision: "money" | "safe" | "block" = (decisionData?.decision as any) || "safe";
        const reasons: string[] = decisionData?.reasons || [];
        const safeUrl: string | null = decisionData?.safe_url || link.safe_url;

        // Fire-and-forget: enrich click log + traffic log + click counter
        void (supabaseAdmin.rpc as any)("handle_redirect_click", {
          _link_id: link.id,
          _user_id: link.user_id,
          _is_bot: decision !== "money",
          _ua: ua,
          _routed_to: decision === "money" ? link.adsterra_url : (safeUrl || "safe_inline"),
        });
        void supabaseAdmin.from("traffic_logs").insert({
          link_id: link.id,
          user_id: link.user_id,
          decision,
          reasons,
          coherence_score: coherence,
          bot_score: 100 - coherence,
          fbclid,
          fingerprint_hash: fp,
          ip,
          country,
          asn,
          ua,
          referer,
          is_mobile: isMobile,
        });

        // Render safe content (200 OK, no redirect — DOM mimicking)
        if (decision !== "money") {
          if (safeUrl) {
            // External safe URL: do a 302 (acceptable for safe pool)
            return new Response(null, {
              status: 302,
              headers: { location: safeUrl, "cache-control": "no-store", "referrer-policy": "no-referrer" },
            });
          }
          // Inline dynamic article (200 OK)
          let snippets = SNIPPET_CACHE.items;
          if (!snippets.length || SNIPPET_CACHE.expires < now) {
            const { data: sn } = await supabaseAdmin
              .from("safe_page_snippets")
              .select("title, body")
              .eq("is_active", true)
              .limit(50);
            snippets = sn || [];
            SNIPPET_CACHE.items = snippets;
            SNIPPET_CACHE.expires = now + 120_000;
          }
          return new Response(renderSafeArticle(snippets), {
            status: 200,
            headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "referrer-policy": "no-referrer" },
          });
        }

        // decision === 'money' → behavioral JS challenge gate
        return new Response(renderMoneyPage(link.adsterra_url, fbclid, link.id), {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "referrer-policy": "no-referrer" },
        });
      },
    },
  },
});
