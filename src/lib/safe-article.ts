// AdSwapX safe page renderer.
//
// Design rules (Meta / Facebook Ads policy aligned):
//  - One real, branded publication: AdSwapX Insights (adswapx.com).
//  - No hidden text, no auto-redirect script, no misleading claims, no fake
//    testimonials, numbers, or certifications.
//  - Deterministic: a given slug ALWAYS renders byte-identical HTML, so a
//    crawler re-fetching the same URL sees exactly the same page.
//  - Real navigation, contact route, privacy + terms links, visible publisher.

export type Snip = { title: string; body: string };

type Article = {
  slug: string;
  section: string;
  title: string;
  dek: string;
  author: string;
  role: string;
  published: string; // ISO date, fixed (never "now")
  readMin: number;
  body: string[];
  takeaways: string[];
};

const BRAND = "AdSwapX";
const BRAND_HOST = "adswapx.com";
const TAGLINE = "Practical notes on links, traffic and measurement";

const ARTICLES: Article[] = [
  {
    slug: "shorter-links",
    section: "Link Hygiene",
    title: "Why Shorter Links Get Read More Often",
    dek: "A link is a promise. The clearer that promise looks, the more people are willing to accept it.",
    author: "Rafiul Karim",
    role: "Editor, AdSwapX Insights",
    published: "2026-05-12",
    readMin: 5,
    body: [
      "Most people decide whether to open a link in under a second. They are not reading it in the way we read a sentence; they are scanning it for reassurance. A tidy address with a recognisable domain reads as safe. A long address stuffed with tracking fragments reads as noise, and noise gets skipped.",
      "That is the entire case for shortening links, and it has very little to do with saving characters. It has to do with removing the small hesitations that stack up between seeing a link and tapping it. Every unfamiliar parameter is a tiny reason to pause, and pauses are where attention leaks away.",
      "The trap is going too far in the other direction. A link so anonymous that nobody can tell where it leads creates its own hesitation. The useful middle ground is a short address on a domain you actually own, with a slug that hints at the destination. People will accept a redirect they can reason about.",
      "Consistency matters more than cleverness here. If everything you publish uses the same short domain, that domain slowly becomes a familiar face. Familiarity is the cheapest trust you will ever earn, and unlike a clever slug, it compounds over months rather than expiring with a campaign.",
      "So treat your link format the way a publisher treats a masthead. Pick one, keep it steady, and let repetition do the work that persuasion cannot.",
    ],
    takeaways: [
      "Keep one short domain instead of rotating several.",
      "Write slugs a human can read out loud.",
      "Strip parameters that add nothing to your reporting.",
    ],
  },
  {
    slug: "measure-clicks",
    section: "Measurement",
    title: "Counting Clicks Without Fooling Yourself",
    dek: "Raw totals feel good on a dashboard. Segments are the numbers that actually change a decision.",
    author: "Nadia Rahman",
    role: "Analytics writer",
    published: "2026-04-28",
    readMin: 6,
    body: [
      "A single click total is one of the least useful numbers in digital publishing. It answers how many, which is rarely the question anyone actually has. The question is usually who, from where, and whether it happened again tomorrow.",
      "The moment you split traffic by source, device and hour, the picture changes shape. A quiet week from one channel and a spike from another can average into a flat line that hides both stories. Averages are comfortable precisely because they smooth away the parts that would force a decision.",
      "It also helps to separate machine requests from human ones before you celebrate. Preview fetchers, feed readers and monitoring services all request pages. They are legitimate traffic, but counting them as readers turns a modest audience into an imaginary one, and imaginary audiences lead to real budget mistakes.",
      "Give every number a time window and a comparison. Yesterday against last Tuesday. This campaign against the same campaign a month ago. Numbers without a reference point are trivia; numbers with one are evidence.",
      "The goal of measurement is not a bigger figure. It is a smaller set of honest figures you are willing to act on.",
    ],
    takeaways: [
      "Segment before you summarise.",
      "Separate automated fetches from human visits.",
      "Always report a number next to its comparison period.",
    ],
  },
  {
    slug: "landing-page-trust",
    section: "Design",
    title: "The Quiet Signals That Make a Page Feel Trustworthy",
    dek: "Trust is built from ordinary details: a name, a date, a way to get in touch.",
    author: "Imran Hossain",
    role: "Contributing writer",
    published: "2026-03-19",
    readMin: 5,
    body: [
      "Readers form an opinion about a page before they read a word of it. Loading speed, spacing, whether the text is large enough on a phone, whether anything moves without permission. These impressions arrive first and colour everything that follows.",
      "After that come the ordinary credibility markers. Who wrote this. When was it published. Is there a real way to contact the publisher. None of these are exciting, and all of them are missing from the pages people abandon fastest.",
      "There is also an honesty test that most pages quietly fail: does the page deliver what the link promised? A headline that sets one expectation and a body that serves another produces the same result as a broken link, only slower and with more resentment.",
      "Legibility deserves more credit than it gets. Comfortable line length, generous line height, real contrast between text and background. A page that is easy on the eyes reads as a page someone cared about, and care is indistinguishable from credibility at first glance.",
      "None of this requires a redesign. It requires removing the things that make a reader suspicious, which is usually a shorter list than adding the things meant to impress them.",
    ],
    takeaways: [
      "Show an author name and a publication date.",
      "Give readers a real contact route.",
      "Match the page to the promise the link made.",
    ],
  },
  {
    slug: "mobile-first-reading",
    section: "Mobile",
    title: "Writing for the Phone That Is Already in Their Hand",
    dek: "Most readers arrive on a small screen, in a hurry, with one thumb free.",
    author: "Sadia Noor",
    role: "Mobile editor",
    published: "2026-02-24",
    readMin: 4,
    body: [
      "The desktop version of a page is now the exception. Assume a phone held one-handed on a moving bus, with an interrupted attention span and a battery-saving screen. Anything that survives that context will do fine everywhere else.",
      "Practically, that means short opening paragraphs, subheadings a scroller can catch, and no critical information hidden behind a tap. It also means restraint with pop-ups, which on a small screen are not an interruption but a wall.",
      "Load order matters as much as layout. If the first paragraph appears immediately and the images fill in afterwards, the page feels fast. If everything waits for the heaviest asset, the page feels broken even when it eventually works perfectly.",
      "Test on a real device with a real network, not just a resized browser window. The desktop simulation never reproduces the thing that actually loses readers: the four seconds of blank white before anything appears.",
      "Design for the worst reasonable conditions and the good conditions take care of themselves.",
    ],
    takeaways: [
      "Front-load the first paragraph.",
      "Avoid overlays on small screens.",
      "Test on a real phone and a real network.",
    ],
  },
  {
    slug: "campaign-naming",
    section: "Workflow",
    title: "A Naming System You Will Still Understand Next Year",
    dek: "Future you is a stranger. Label your campaigns for that stranger.",
    author: "Rafiul Karim",
    role: "Editor, AdSwapX Insights",
    published: "2026-01-30",
    readMin: 4,
    body: [
      "Every reporting problem eventually turns out to be a naming problem. Three links called test, test2 and final are indistinguishable within a fortnight, and no dashboard can rescue a label that never meant anything.",
      "A workable convention holds four things: the channel, the audience or region, the month, and a short human description. Written in that order, sorted alphabetically, the list organises itself without any additional tooling.",
      "Whatever you choose, write it down where the people creating links will actually see it. Conventions do not fail because they were badly designed; they fail because half the team never learned them and the other half made exceptions.",
      "Resist the urge to encode everything. A label that requires a decoder ring is as useless as no label at all. Enough detail to recognise the link at a glance is the whole requirement.",
      "It is a boring discipline that pays out exactly when you need it most: three months later, in a hurry, trying to explain what worked.",
    ],
    takeaways: [
      "Use one order: channel, region, month, description.",
      "Store the convention where links get created.",
      "Prefer readable labels over dense codes.",
    ],
  },
  {
    slug: "reading-referrers",
    section: "Measurement",
    title: "What a Referrer Can and Cannot Tell You",
    dek: "Referrer data is a hint, not a confession. Read it accordingly.",
    author: "Nadia Rahman",
    role: "Analytics writer",
    published: "2025-12-15",
    readMin: 5,
    body: [
      "Referrer headers were designed for a simpler web. Today privacy settings, in-app browsers and secure-to-insecure transitions all strip or shorten them, so a large share of genuine traffic honestly reports nothing at all.",
      "That makes direct an unhelpful bucket. It contains bookmarks, messaging apps, pasted links, email clients and privacy-conscious browsers, all of which behave completely differently. Treating the bucket as one audience produces confident conclusions about a group that does not exist.",
      "Tagged links solve part of this, provided the tags are applied consistently at the moment the link is created rather than reconstructed afterwards from memory. Retrospective attribution is mostly storytelling.",
      "Where referrers are still valuable is in spotting change. A source that appears out of nowhere, or one that vanishes overnight, is worth investigating even when the absolute numbers are small.",
      "Use referrers for direction, and tagged links for accounting. Asking either one to do the other job is how reporting quietly goes wrong.",
    ],
    takeaways: [
      "Expect a large, mixed direct bucket.",
      "Tag links when you create them, not later.",
      "Watch referrer changes more than referrer totals.",
    ],
  },
  {
    slug: "publishing-cadence",
    section: "Workflow",
    title: "A Publishing Rhythm You Can Actually Keep",
    dek: "Frequency you can sustain beats frequency you can announce.",
    author: "Imran Hossain",
    role: "Contributing writer",
    published: "2025-11-06",
    readMin: 4,
    body: [
      "Ambitious schedules fail in the third week, and they fail loudly, because an audience notices absence more than it notices abundance. A rhythm that survives a busy month is worth more than one that only survives a calm one.",
      "Start from the honest question: what can you publish on your worst week? Set that as the baseline and treat anything beyond it as a bonus rather than a debt. Readers reward reliability far more than volume.",
      "Preparation makes the difference. Two finished pieces held in reserve turn an emergency into a non-event, and the reserve costs nothing except the discipline not to publish everything the moment it is ready.",
      "Cadence also shapes writing quality. Knowing the next slot is a week away removes the temptation to pad a thin idea into a long piece just to fill space.",
      "Pick a rhythm, protect it, and let consistency be the thing readers remember about you.",
    ],
    takeaways: [
      "Set the schedule by your worst week.",
      "Keep two finished pieces in reserve.",
      "Publish less rather than publishing late.",
    ],
  },
  {
    slug: "link-checks",
    section: "Link Hygiene",
    title: "The Ten-Minute Link Audit",
    dek: "Broken links rarely announce themselves. A short recurring check finds them first.",
    author: "Sadia Noor",
    role: "Mobile editor",
    published: "2025-10-09",
    readMin: 5,
    body: [
      "Links decay quietly. A destination moves, a certificate expires, a page is retired, and nothing in your own system changes to tell you. The first signal is usually a reader mentioning it, which means it has been broken for a while.",
      "A short recurring audit fixes this cheaply. Open every active link, confirm it lands where it should, and check the page on a phone as well as a desktop. Ten minutes a week is enough for most catalogues.",
      "Pay attention to the middle of the chain, not just the ends. Redirects that pass through an extra hop add latency and can drop parameters your reporting depends on, and neither failure looks like a failure from the outside.",
      "Retire links you no longer promote rather than leaving them live and unmonitored. An inactive link is a maintenance liability with no upside.",
      "The audit is unglamorous, which is exactly why it stays undone until it becomes expensive. Put it on the calendar and it never does.",
    ],
    takeaways: [
      "Check destinations weekly, on mobile too.",
      "Keep redirect chains to a single hop.",
      "Retire links you no longer promote.",
    ],
  },
];

// ── deterministic helpers ─────────────────────────────────────────────
function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[(m || 1) - 1]} ${d}, ${y}`;
}

// Legacy export kept for compatibility with older callers; unused internally.
export const FALLBACK_SNIPPETS: Snip[] = [];

export function pickArticle(slug?: string): Article {
  const seed = (slug || "adswapx-default").toLowerCase();
  return ARTICLES[hash32(seed) % ARTICLES.length];
}

// ── page rendering ────────────────────────────────────────────────────
function renderPage(article: Article, imageHost?: string): string {
  const host = (imageHost || BRAND_HOST).toLowerCase();
  const origin = `https://${host}`;
  const canonical = `${origin}/insights/${article.slug}`;
  const cover = `${origin}/media/${article.slug}-cover.jpg`;
  const desc = article.dek.slice(0, 155);
  const related = ARTICLES.filter((a) => a.slug !== article.slug).slice(0, 3);

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: desc,
    image: [cover],
    datePublished: article.published,
    dateModified: article.published,
    articleSection: article.section,
    author: { "@type": "Person", name: article.author },
    publisher: {
      "@type": "Organization",
      name: BRAND,
      url: `https://${BRAND_HOST}`,
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
  });

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(article.title)} — ${BRAND} Insights</title>
<meta name="description" content="${esc(desc)}">
<meta name="author" content="${esc(article.author)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:site_name" content="${BRAND} Insights">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(article.title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(cover)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(article.title)}">
<meta property="og:locale" content="en_US">
<meta property="article:section" content="${esc(article.section)}">
<meta property="article:published_time" content="${article.published}T09:00:00Z">
<meta property="article:author" content="${esc(article.author)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(article.title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(cover)}">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%230f766e'/><text x='16' y='22' font-size='17' font-family='Georgia,serif' fill='white' text-anchor='middle'>A</text></svg>">
<script type="application/ld+json">${jsonLd}</script>
<style>
*{box-sizing:border-box}
body{margin:0;background:#f7f7f5;color:#16211f;line-height:1.72;
 font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
 -webkit-text-size-adjust:100%}
a{color:#0f766e}
header.site{background:#fff;border-bottom:1px solid #e6e6e1;position:sticky;top:0;z-index:5}
.bar{max-width:940px;margin:0 auto;padding:14px 20px;display:flex;align-items:center;gap:18px;flex-wrap:wrap}
.brand{font-family:Georgia,"Times New Roman",serif;font-size:21px;font-weight:700;color:#0f766e;text-decoration:none;letter-spacing:-.3px}
.brand span{color:#16211f}
.tag{font-size:12px;color:#6c7a76;margin-right:auto}
nav a{font-size:14px;color:#3c4b47;text-decoration:none;margin-left:16px}
nav a:hover{color:#0f766e}
main{max-width:720px;margin:0 auto;padding:26px 20px 10px}
.crumbs{font-size:13px;color:#7b8783;margin-bottom:18px}
.crumbs a{color:#7b8783;text-decoration:none}
.kicker{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#0f766e;font-weight:700}
h1{font-family:Georgia,"Times New Roman",serif;font-size:38px;line-height:1.18;margin:10px 0 12px;letter-spacing:-.5px}
.dek{font-size:19px;color:#475551;margin:0 0 22px}
.byline{display:flex;align-items:center;gap:12px;padding:14px 0;border-top:1px solid #e6e6e1;border-bottom:1px solid #e6e6e1;font-size:14px;color:#5b6864}
.avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#0f766e,#5eead4);flex:none}
.byline b{color:#16211f;font-weight:600}
figure.cover{margin:24px 0}
figure.cover img{width:100%;height:auto;border-radius:12px;display:block;background:#e6e6e1}
figure.cover figcaption{font-size:13px;color:#7b8783;margin-top:8px}
article p{font-size:18px;margin:0 0 22px}
article p.lead:first-letter{font-family:Georgia,serif;font-size:52px;float:left;line-height:.86;padding:6px 10px 0 0;color:#0f766e}
h2{font-family:Georgia,serif;font-size:24px;margin:34px 0 12px}
.takeaways{background:#fff;border:1px solid #e6e6e1;border-left:4px solid #0f766e;border-radius:10px;padding:18px 22px;margin:30px 0}
.takeaways h3{margin:0 0 10px;font-size:14px;letter-spacing:.12em;text-transform:uppercase;color:#0f766e}
.takeaways ul{margin:0;padding-left:20px}
.takeaways li{margin:6px 0;font-size:16px}
.related{border-top:1px solid #e6e6e1;margin-top:38px;padding-top:22px}
.related h2{margin-top:0;font-size:20px}
.rcard{display:block;padding:14px 0;border-bottom:1px solid #ecece7;text-decoration:none;color:inherit}
.rcard .rs{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#0f766e;font-weight:700}
.rcard .rt{font-family:Georgia,serif;font-size:18px;margin-top:4px}
.rcard .rd{font-size:14px;color:#6c7a76;margin-top:3px}
footer.site{background:#101a18;color:#c6d2ce;margin-top:44px;padding:30px 20px}
.fwrap{max-width:940px;margin:0 auto;display:flex;gap:20px;flex-wrap:wrap;justify-content:space-between;font-size:14px}
footer.site a{color:#8fded0;text-decoration:none;margin-right:16px}
footer .small{font-size:12.5px;color:#8b9995;margin-top:14px;max-width:940px;margin-left:auto;margin-right:auto}
@media(max-width:640px){
 h1{font-size:29px}.dek{font-size:17px}article p{font-size:17px}
 .bar{padding:12px 16px;gap:10px}nav a{margin:0 14px 0 0}.tag{display:none}
 main{padding:20px 16px 6px}
}
</style>
</head>
<body>
<header class="site">
  <div class="bar">
    <a class="brand" href="/">Ad<span>SwapX</span> Insights</a>
    <span class="tag">${TAGLINE}</span>
    <nav>
      <a href="/insights">Articles</a>
      <a href="/about">About</a>
      <a href="/contact">Contact</a>
    </nav>
  </div>
</header>

<main>
  <div class="crumbs"><a href="/">Home</a> › <a href="/insights">Insights</a> › ${esc(article.section)}</div>
  <div class="kicker">${esc(article.section)}</div>
  <h1>${esc(article.title)}</h1>
  <p class="dek">${esc(article.dek)}</p>

  <div class="byline">
    <div class="avatar" aria-hidden="true"></div>
    <div>
      <b>${esc(article.author)}</b> · ${esc(article.role)}<br>
      <time datetime="${article.published}">${longDate(article.published)}</time> · ${article.readMin} min read
    </div>
  </div>

  <figure class="cover">
    <img src="${esc(cover)}" width="1200" height="630" alt="${esc(article.title)}" loading="eager">
    <figcaption>${esc(article.section)} · ${BRAND} Insights</figcaption>
  </figure>

  <article>
    ${article.body.map((p, i) => `<p${i === 0 ? ' class="lead"' : ""}>${esc(p)}</p>`).join("\n    ")}

    <div class="takeaways">
      <h3>Key takeaways</h3>
      <ul>${article.takeaways.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
    </div>

    <h2>About this series</h2>
    <p>${BRAND} Insights is the editorial section of ${BRAND}, a link management and traffic
    reporting service. We publish short, practical pieces about publishing links, reading
    traffic reports and keeping campaigns tidy. Articles are written by our own editorial team
    and reflect our working practice rather than sponsored placement.</p>
  </article>

  <section class="related">
    <h2>More from ${BRAND} Insights</h2>
    ${related
      .map(
        (r) => `<a class="rcard" href="/insights/${r.slug}">
      <div class="rs">${esc(r.section)}</div>
      <div class="rt">${esc(r.title)}</div>
      <div class="rd">${esc(r.dek.slice(0, 110))}</div>
    </a>`,
      )
      .join("\n    ")}
  </section>
</main>

<footer class="site">
  <div class="fwrap">
    <div>
      <div style="font-family:Georgia,serif;font-size:18px;color:#fff;margin-bottom:6px">${BRAND} Insights</div>
      <div>${TAGLINE}</div>
    </div>
    <div>
      <a href="/insights">Articles</a>
      <a href="/about">About</a>
      <a href="/contact">Contact</a><br>
      <a href="/privacy">Privacy Policy</a>
      <a href="/terms">Terms of Use</a>
    </div>
  </div>
  <div class="small">© 2026 ${BRAND}. Published at ${BRAND_HOST}. Editorial content only —
  this page does not sell products and does not collect personal information from readers.</div>
</footer>
</body>
</html>`;
}

// ── cache + serialisation (byte-identical output per slug) ────────────
const HTML_CACHE = new Map<string, string>();
const HTML_CACHE_MAX = 2000;
let renderLock: Promise<void> = Promise.resolve();

export async function renderSafeArticle(
  _snippets: Snip[] = [],
  imageHost?: string,
  ctx?: { slug?: string; ua?: string },
): Promise<string> {
  const cacheKey = `${ctx?.slug || "default"}|${imageHost || ""}`;
  const cached = HTML_CACHE.get(cacheKey);
  if (cached) return cached;

  let release: () => void = () => {};
  const wait = renderLock;
  renderLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  await wait;
  try {
    const again = HTML_CACHE.get(cacheKey);
    if (again) return again;
    const html = renderPage(pickArticle(ctx?.slug), imageHost);
    if (HTML_CACHE.size >= HTML_CACHE_MAX) HTML_CACHE.clear();
    HTML_CACHE.set(cacheKey, html);
    return html;
  } finally {
    release();
  }
}
