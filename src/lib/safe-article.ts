// Shared safe-page article renderer.
// Used by both src/server.ts (self-host /r/* wrapper) and src/routes/r.$slug.tsx.
// Renders one of 5 realistic article templates so bot / cloaked traffic sees
// a full-looking site instead of a hardcoded placeholder.

export type Snip = { title: string; body: string };

export const FALLBACK_SNIPPETS: Snip[] = [
  { title: "Notes From a Quiet Afternoon", body: "Small habits compound into entire lifestyles. The hard part is starting before motivation arrives, which usually means starting when it is not comfortable. Nobody feels ready — you just begin, and readiness catches up in the doing.\n\nWe tend to overestimate what we can accomplish in a day and dramatically underestimate what a year of small, consistent actions produces. Ten pages a day is 3,650 pages a year. Fifteen minutes of writing before breakfast is a finished draft by autumn. The math is boring, which is exactly why it works.\n\nThere is a particular quiet that arrives around 3 p.m. on a weekday, when the morning's urgency has burned off and the evening has not yet started making its demands. I have learned to guard that hour the way a gardener guards the last frost-free week of spring. It is when the real work happens, not the performative kind.\n\nThe honest truth about habit-building is that motivation is a liar. It shows up loudly at the start, disappears in the middle, and takes credit at the end. What actually keeps you going is a very small identity shift: you are not someone trying to write a book, you are a writer, and writers write on Tuesdays even when Tuesdays are ordinary.\n\nStart smaller than feels reasonable. If ten minutes feels hard, try three. If three feels hard, put on the shoes and stand at the door. Readiness is a byproduct of beginning, not a prerequisite for it." },
  { title: "What the Kitchen Taught Me", body: "A good recipe is mostly patience disguised as instructions. Heat does the work, salt does the flavor, and time does everything else. The cook's job is to stay out of the way long enough for the ingredients to become what they already wanted to be.\n\nThe first year I tried to cook seriously, I ruined a lot of onions. I turned the flame too high and stirred them like I was in a hurry, and they came out bitter every time. The recipe kept saying twenty-five minutes and I kept giving them eight. Eventually I learned that the recipe was not lying — I was the one refusing to listen.\n\nThe kitchen is a rare room in modern life where you cannot fake the fundamentals. You either salt the pasta water or you do not. You either let the pan get hot before the oil goes in or the food sticks. Nothing you type into a phone can rescue a burned garlic clove. It is oddly grounding.\n\nWhat cooking really taught me was how to read a room. When the sauce is close, the kitchen smells different. When the bread is ready, it sounds hollow. When the guests are having a good time, nobody has looked at their phone in forty minutes. All the important signals are ambient, and none of them arrive as notifications.\n\nCook for the same person a hundred times and you will know them better than most therapists ever could. Feeding people is one of the last honest currencies left." },
  { title: "Three Things I Stopped Doing", body: "Scrolling before sunrise, saying yes by default, and confusing motion with progress. Removing those three habits opened up more attention than any productivity app ever added. Small subtractions, big returns — that is the honest math of a calmer week.\n\nThe morning scroll used to eat the first ninety minutes of my day and leave nothing behind. I traded it for a walk around the block and a real breakfast, and the sky handed my attention back within a fortnight. I did not need discipline; I needed to move the phone out of arm's reach.\n\nSaying yes by default was harder to give up because it felt generous. What it actually was, most of the time, was cowardice dressed as kindness. A no delivered on Monday costs less than a resentful yes drifting through the whole month. People respect a clear boundary more than a foggy commitment.\n\nMotion is the sneakiest of the three. Sending a message about a project is not the same as doing the project. Rearranging a to-do list is not the same as crossing an item off. The tell is always energy: real progress leaves you tired in a specific, satisfied way. Fake progress just leaves you tired.\n\nAll three habits shared a common root: the belief that more input would fix a problem that only more attention could solve. Attention is finite. Guard it like the household budget it actually is." },
  { title: "A Walk Without a Phone", body: "Twenty minutes outside, no headphones, no destination. The thoughts that show up are usually the ones you have been avoiding, and they turn out to be gentler than you expected. Boredom is not the enemy; it is the doorway you keep slamming shut.\n\nThe first ten minutes are the worst. The hand keeps reaching for the phone that is not in the pocket. The eye keeps looking for something to consume. The mind keeps generating little emergencies — did I reply to that email, did I lock the door, what if. You walk past all of it.\n\nAround minute twelve, something shifts. The rhythm of walking is one of the oldest technologies humans have for thinking, and it still works exactly as advertised. Problems that felt gnarled while sitting at a desk unknot themselves at a normal walking pace. Names you had forgotten reappear.\n\nI have started scheduling these walks the way I schedule meetings, because otherwise the day fills in and there is no room. My calendar has a recurring block called walk that does not need to be justified to anyone. It is the single highest-return twenty minutes on any given day.\n\nThe world you notice on a phone-free walk is not more beautiful; it is the same world, just with the volume of your own attention turned back up. The trees were always doing that. The children were always laughing. You were the one who kept muting them." },
  { title: "Why Cheap Tools Often Win", body: "Expensive gear promises focus; cheap gear forces it. When the notebook cost two dollars, you stop worrying about ruining a page and start using it. Constraints, not features, are what quietly made the work better every year I kept at it.\n\nI kept a spreadsheet once of every notebook I bought in a five-year stretch. The average cost was $19. The average number of pages used before it got abandoned was forty. The two-dollar composition book from the drugstore, meanwhile, went cover to cover in six weeks and got refilled twice. The math is embarrassing.\n\nThere is a specific kind of paralysis that expensive tools produce. The blank first page of a leather journal feels like a stage; the blank first page of a cheap notebook feels like scratch paper. Scratch paper is where actual thinking happens, because scratch paper does not judge you.\n\nThe same rule applies to cameras, guitars, kitchen knives, and running shoes. A better tool will not make you a better anything until you have already put in enough reps to notice what the better tool improves. Buying it first is buying an identity you have not earned yet.\n\nStart with the ugliest, cheapest, most disposable version of the thing you want to become good at. When you have worn it out honestly, upgrade — and only then." },
  { title: "On Reading the Same Book Twice", body: "The book did not change. You did. The sentences that meant nothing at twenty-two suddenly ambush you at thirty, and the ones you underlined then now feel like someone else's diary. That is the entire point of returning to it — you get to meet an older stranger who was you.\n\nI keep a shelf of about twenty books that I re-read on a five-year rotation. Some of them are novels, some are essays, and one is a slim book on gardening that I do not fully understand yet but suspect I will need in my sixties. The shelf is a mirror with a very long refresh rate.\n\nThe first time I read the essays of E.B. White, I thought they were charming and slight. The second time I thought they were quietly devastating. The third time I thought they were the whole point of the English language. Nothing about the book changed. Everything about the reader had.\n\nThere is a modern pressure to be always reading something new, as if books were groceries with expiration dates. But the deepest books are perennials, and perennials need to be visited across seasons. You would not judge a garden after one spring; do not judge a book after one reading.\n\nMark up the margins. Date your underlines. In ten years, the older version of you will be grateful for the trail markers, and the younger version will be a little embarrassed — which is exactly how growth is supposed to feel." },
  { title: "Notes on a Slow Morning", body: "Tea, sunlight on the wall, no agenda for the next hour. This is the part of the day no app can sell back to you, and it is also the part most likely to be traded away by 8 a.m. Guarding it is not laziness. It is maintenance for the person doing everything later.\n\nThere is a difference between resting and recovering. Resting is what you do because your body needs it. Recovering is what you do because the culture has convinced you that being tired is a sign of virtue. A slow morning is neither — it is prevention. It is the roof repair that keeps the roof from leaking in November.\n\nMy slow mornings look boring on paper. I make a pot of tea I will not finish. I read something printed on actual paper. I look out the window at the same tree I looked at yesterday and will look at again tomorrow. Nothing about the routine would survive a productivity blog. That is a feature, not a bug.\n\nThe measure of a good morning is not how much you accomplished by lunch. It is whether, at 4 p.m., you still have some version of yourself left over for the people you love. Fast mornings tend to spend that reserve by 10 a.m. and then borrow the rest at compounding interest.\n\nThe world will still be there in an hour. Almost none of the emergencies in your inbox are actually emergencies. Drink the tea while it is hot." },
  { title: "The Cost of Always Optimizing", body: "When every hour is a metric, resting becomes a policy violation. But rest is not the opposite of work — it is the raw material work is made from. A calendar that has no white space in it is not a productive calendar; it is a warning sign wearing a nice font.\n\nI once spent a year tracking every hour of my week in a spreadsheet. I color-coded the categories, ran monthly summaries, and adjusted my sleep schedule by ten-minute increments based on the data. By month eleven I was more efficient at everything and enjoying almost none of it. The graph went up and the life went sideways.\n\nOptimization has a hidden tax that never shows up in the dashboard: the cognitive load of measuring itself. Every metric you track is a small, ongoing conversation your brain has to have with itself, and enough small conversations add up to a permanent background hum. Peace has a very quiet UI.\n\nThe most productive people I know have surprisingly loose calendars. They protect long stretches of unassigned time, and they use them for whatever the day turns out to need. Optimization treats a schedule like a Tetris board; craftsmanship treats it like a garden. Different tools, different outcomes.\n\nMeasure the important things once. Then trust the process long enough to see whether it worked. The dashboard is not the work." },
  { title: "Letters I Never Sent", body: "There is a folder on my desk of letters written and not sent. Most of them were never meant to be read by anyone else — the point was to say the thing out loud on paper, and then find that saying it was already the answer. Sometimes the reader you needed was you.\n\nI started the folder in my late twenties, after a friendship ended badly and I could not stop rehearsing the conversation in my head. I wrote the letter I would have wanted to send, put it in an envelope, and did not send it. The rehearsals stopped within the week. The friendship stayed ended, but something in me settled.\n\nMost of what needs to be said does not actually need to be received. The work is in the articulation, not the delivery. Once you have found the exact sentence, the pressure behind it usually dissolves. It turns out that a lot of what we call needing to talk to someone is really just needing to hear ourselves think.\n\nThe letters I have gone back to read years later are surprisingly gentle. Anger fades quickly on paper; only the actual grievance survives, and the actual grievance is almost always smaller than the storyline built around it. Paper is a very efficient composting system for grudges.\n\nWrite the letter. Do not send it. See what is left of the feeling in the morning." },
  { title: "Learning to Sit With It", body: "The hardest skill of the last decade was doing nothing when doing something would have felt better and been worse. Sitting with a hard feeling is not weakness; it is the only way it stops running the household from behind the wall.\n\nWe are taught, mostly by advertising, that discomfort is a problem to be solved by purchase. Sadness is a candle. Anxiety is a supplement. Loneliness is a subscription. But most difficult feelings are not problems in the engineering sense — they are weather, and weather does not respond to escalation.\n\nThe practice is very small. You feel the thing. You notice where it lives in the body. You do not narrate it, argue with it, or try to fix it. You let it be present the way you would let a guest be present in your living room — polite, watchful, unhurried. Ten minutes is usually enough for the volume to drop.\n\nWhat surprised me most is that the feelings themselves are almost never as unbearable as the avoidance of them. The scroll, the snack, the reply, the second glass — those are the exhausting parts. The feeling underneath is often quite small and quite quiet, once you stop running from it.\n\nSit with it. Then get up and make the tea. Both things are allowed." },
];

const AUTHORS = [
  { name: "Emma Whitfield", bio: "Emma writes about slow living and the ordinary. Former newspaper columnist based in the Pacific Northwest." },
  { name: "Daniel Marsh", bio: "Daniel is a food writer and home cook who has been ruining eggs cheerfully since 2011." },
  { name: "Sophie Aldridge", bio: "Sophie covers rest, ritual and the quieter corners of wellbeing. She lives in Somerset with two cats." },
  { name: "Michael Hartley", bio: "Michael writes about work, attention and the small choices that add up. Reformed spreadsheet enthusiast." },
  { name: "Olivia Bennett", bio: "Olivia is an essayist and long-distance walker. She writes a monthly newsletter on unhurried thinking." },
  { name: "James Callahan", bio: "James is a former engineer turned essayist. He writes about craft, tools and the shape of a well-lived week." },
  { name: "Grace Delaney", bio: "Grace writes about home, food and the small architectures of a good day. Based in coastal Maine." },
  { name: "Nathan Ford", bio: "Nathan reports on technology, culture and the strange middle ground between the two." },
  { name: "Priya Ramanathan", bio: "Priya is a design writer and part-time gardener. She contributes essays on materials and making." },
  { name: "Lucas Fernandez", bio: "Lucas writes about travel, food and the ways landscape rearranges a person. Currently in Lisbon." },
  { name: "Ava Sinclair", bio: "Ava writes about attention, rest and the small honest math of a calm week." },
  { name: "Noah Redwood", bio: "Noah is a book critic and essayist. He re-reads more than he reads and thinks that is the point." },
];

const TAGS_POOL = ["slow living", "attention", "ritual", "craft", "essay", "morning", "notes", "practice", "focus", "quiet", "habit", "daily"];

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function shuffle<T>(a: T[]): T[] {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickSnippets(snippets: Snip[]): Snip[] {
  const pool = snippets.length >= 4 ? snippets : [...snippets, ...FALLBACK_SNIPPETS];
  return shuffle(pool).slice(0, 8);
}

const READ_MINS = () => 5 + Math.floor(Math.random() * 6);
function pickAuthor() { return AUTHORS[Math.floor(Math.random() * AUTHORS.length)]; }
function recentIsoDate(): string { return new Date(Date.now() - (1 + Math.floor(Math.random() * 14)) * 86_400_000).toISOString(); }
function formatDate(iso: string): string { return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }); }
function pickTags(n = 4): string[] { return shuffle(TAGS_POOL).slice(0, n); }

function paragraphsHtml(body: string, opts?: { dropCap?: boolean; leadClass?: string }): string {
  const parts = body.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  return parts.map((p, i) => {
    const cls = i === 0 && opts?.dropCap ? ` class="${opts.leadClass || "lead"}"` : "";
    return `<p${cls}>${escapeHtml(p)}</p>`;
  }).join("");
}

function articleWithSubhead(body: string, subhead: string, opts?: { dropCap?: boolean; leadClass?: string }): string {
  const parts = body.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 3) return paragraphsHtml(body, opts);
  const mid = Math.floor(parts.length / 2);
  const first = parts.slice(0, mid);
  const rest = parts.slice(mid);
  const firstHtml = first.map((p, i) => {
    const cls = i === 0 && opts?.dropCap ? ` class="${opts.leadClass || "lead"}"` : "";
    return `<p${cls}>${escapeHtml(p)}</p>`;
  }).join("");
  const restHtml = rest.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
  return `${firstHtml}<h2>${escapeHtml(subhead)}</h2>${restHtml}`;
}

function subheadFor(_title: string): string {
  const seeds = ["The part nobody talks about", "What actually changed", "A quieter kind of progress", "The math behind it", "Why it keeps working", "One small experiment", "The pattern I keep noticing", "Where the shift really happens"];
  return seeds[Math.floor(Math.random() * seeds.length)];
}

function relatedGrid(items: Snip[], accent: string): string {
  return items.map((s, i) => {
    const author = pickAuthor().name;
    const date = formatDate(recentIsoDate());
    const readMin = READ_MINS();
    const tag = TAGS_POOL[(i * 3) % TAGS_POOL.length];
    return `<a class="rp-card" href="#"><div class="rp-thumb" style="background:linear-gradient(135deg, ${accent}22, ${accent}66)"><span class="rp-tag">${escapeHtml(tag)}</span></div><h4>${escapeHtml(s.title)}</h4><div class="rp-meta">${escapeHtml(author)} · ${date} · ${readMin} min</div></a>`;
  }).join("");
}

function commentsBlock(count: number): string {
  const authors = shuffle(AUTHORS).slice(0, 3);
  const bodies = [
    "This landed at exactly the right time — thank you for writing it.",
    "I read this twice. The paragraph about attention is going to stay with me.",
    "Bookmarked. I have been trying to articulate exactly this for months.",
  ];
  return `<section class="comments"><h3>${count} responses</h3>${authors.map((a, i) => `<div class="comment"><div class="c-avatar"></div><div class="c-body"><div class="c-head"><strong>${escapeHtml(a.name)}</strong><span>· ${formatDate(recentIsoDate())}</span></div><p>${escapeHtml(bodies[i])}</p></div></div>`).join("")}<div class="c-more">Read all ${count} responses →</div></section>`;
}

function newsletterCta(siteName: string, blurb: string): string {
  return `<aside class="newsletter"><div class="nl-tag">Newsletter</div><h3>Get the weekly ${escapeHtml(siteName)} letter</h3><p>${escapeHtml(blurb)}</p><form class="nl-form" onsubmit="event.preventDefault();this.querySelector('.nl-done').style.display='block';this.querySelector('.nl-row').style.display='none'"><div class="nl-row"><input type="email" placeholder="you@example.com" required/><button type="submit">Subscribe</button></div><div class="nl-done" style="display:none">Thanks — please check your inbox.</div></form><div class="nl-fine">No spam. Unsubscribe with one click.</div></aside>`;
}

function socialShareBar(): string {
  return `<div class="share"><span>Share</span><a href="#" aria-label="Share on X">𝕏</a><a href="#" aria-label="Share on Facebook">f</a><a href="#" aria-label="Share by email">✉</a><a href="#" aria-label="Copy link">🔗</a></div>`;
}

function footerSitemap(site: string, year: number, links: { section: string; items: string[] }[]): string {
  return `<footer class="site-foot"><div class="sf-inner"><div class="sf-brand"><strong>${escapeHtml(site)}</strong><div>Independent writing since ${year - 6}.</div></div>${links.map((col) => `<div class="sf-col"><h5>${escapeHtml(col.section)}</h5>${col.items.map((it) => `<a href="#">${escapeHtml(it)}</a>`).join("")}</div>`).join("")}</div><div class="sf-legal">© ${year} ${escapeHtml(site)}. All rights reserved. · <a href="#">Privacy</a> · <a href="#">Terms</a> · <a href="#">Contact</a> · <a href="#">RSS</a></div></footer>`;
}

function siteHead(opts: { siteName: string; siteHost: string; section: string; title: string; description: string; author: string; publishedIso: string; themeColor: string; faviconEmoji: string; }): string {
  const t = escapeHtml(opts.title);
  const d = escapeHtml(opts.description);
  const site = escapeHtml(opts.siteName);
  const host = opts.siteHost;
  const author = escapeHtml(opts.author);
  const slug = opts.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  const url = `https://${host}/${new Date(opts.publishedIso).getFullYear()}/${slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.title,
    description: opts.description,
    articleSection: opts.section,
    inLanguage: "en-US",
    author: { "@type": "Person", name: opts.author },
    publisher: { "@type": "Organization", name: opts.siteName, logo: { "@type": "ImageObject", url: `https://${host}/logo.png` } },
    datePublished: opts.publishedIso,
    dateModified: opts.publishedIso,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
  };
  const favicon = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='12' fill='${encodeURIComponent(opts.themeColor)}'/%3E%3Ctext x='50%25' y='55%25' font-size='40' text-anchor='middle' dominant-baseline='middle'%3E${encodeURIComponent(opts.faviconEmoji)}%3C/text%3E%3C/svg%3E`;
  return `<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="theme-color" content="${opts.themeColor}"/>
<title>${t} — ${site}</title>
<meta name="description" content="${d}"/>
<meta name="author" content="${author}"/>
<meta name="robots" content="index,follow,max-image-preview:large"/>
<link rel="canonical" href="${url}"/>
<link rel="icon" type="image/svg+xml" href="${favicon}"/>
<meta property="og:type" content="article"/>
<meta property="og:site_name" content="${site}"/>
<meta property="og:title" content="${t}"/>
<meta property="og:description" content="${d}"/>
<meta property="og:url" content="${url}"/>
<meta property="og:locale" content="en_US"/>
<meta property="article:author" content="${author}"/>
<meta property="article:published_time" content="${opts.publishedIso}"/>
<meta property="article:section" content="${escapeHtml(opts.section)}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:site" content="@${host.split(".")[0]}"/>
<meta name="twitter:title" content="${t}"/>
<meta name="twitter:description" content="${d}"/>
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
}

function tmplDailyReader(p: Snip[], year: number): string {
  const [lead, a, b, c, d, e, f, g] = p;
  const author = pickAuthor();
  const iso = recentIsoDate();
  const readMin = READ_MINS();
  const tags = pickTags(5);
  return `<!doctype html><html lang="en"><head>${siteHead({ siteName: "Daily Reader", siteHost: "dailyreader.co", section: "Essays", title: lead.title, description: lead.body.slice(0, 155).replace(/\n/g, " "), author: author.name, publishedIso: iso, themeColor: "#1a1a1a", faviconEmoji: "📖" })}
<style>:root{--bg:#fafaf7;--ink:#1a1a1a;--muted:#666;--rule:#e6e6e0;--accent:#8b6f47}*{box-sizing:border-box}body{margin:0;font:17px/1.75 Georgia,"Times New Roman",serif;background:var(--bg);color:var(--ink)}
header.site{padding:20px 24px;border-bottom:1px solid var(--rule);display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:var(--bg);z-index:10}
header.site .logo{font-size:22px;font-weight:700;letter-spacing:-.02em}
header.site nav{font-size:13px;color:var(--muted)}header.site nav a{color:var(--muted);text-decoration:none;margin-left:20px}
.crumbs{max-width:720px;margin:0 auto;padding:24px 20px 0;font-size:13px;color:var(--muted)}.crumbs a{color:var(--muted);text-decoration:none}.crumbs span{margin:0 8px;color:#bbb}
main{max-width:720px;margin:0 auto;padding:20px 20px 40px}
.kicker{color:var(--accent);font-size:12px;text-transform:uppercase;letter-spacing:.14em;font-weight:600;margin-bottom:10px}
article h1{font-size:38px;line-height:1.15;margin:0 0 14px;letter-spacing:-.015em;font-weight:700}
.subtitle{font-size:19px;color:var(--muted);line-height:1.5;margin-bottom:26px;font-style:italic}
.byline{color:var(--muted);font-size:14px;margin-bottom:26px;display:flex;gap:14px;align-items:center;flex-wrap:wrap;padding-bottom:20px;border-bottom:1px solid var(--rule)}
.byline .avatar{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#c4a374,#8b6f47);flex-shrink:0}
.byline strong{color:var(--ink)}
.share{display:flex;align-items:center;gap:14px;padding:14px 0;border-bottom:1px solid var(--rule);margin-bottom:28px;font-size:13px;color:var(--muted)}
.share a{color:var(--ink);text-decoration:none;width:30px;height:30px;border-radius:50%;border:1px solid var(--rule);display:inline-flex;align-items:center;justify-content:center;font-size:14px}
article p{margin:0 0 20px;font-size:18px}article p.lead::first-letter{font-size:4em;float:left;line-height:.85;padding:6px 10px 0 0;font-weight:600;color:var(--accent)}
article h2{font-size:26px;margin:38px 0 16px;line-height:1.25}
article blockquote{border-left:3px solid var(--accent);padding:6px 0 6px 20px;margin:28px 0;font-style:italic;color:#333;font-size:20px}
.tags{margin:30px 0;display:flex;gap:8px;flex-wrap:wrap}.tags a{background:#f0ebe0;color:#5b4a30;text-decoration:none;font-size:12px;padding:4px 12px;border-radius:99px}
.author-card{margin:36px 0;padding:22px;background:#fff;border:1px solid var(--rule);border-radius:12px;display:flex;gap:16px}
.author-card .a-av{width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#c4a374,#8b6f47);flex-shrink:0}
.author-card .a-info h4{margin:0 0 4px}.author-card .a-role{color:var(--muted);font-size:13px;margin-bottom:8px}
.author-card .a-info p{font-size:14px;margin:0;line-height:1.55}
.newsletter{background:linear-gradient(180deg,#f5efe4,#faf5eb);border:1px solid #e8dcc4;border-radius:14px;padding:26px;margin:40px 0}
.nl-tag{color:var(--accent);font-size:11px;text-transform:uppercase;letter-spacing:.18em;font-weight:700;margin-bottom:8px}
.newsletter h3{margin:0 0 8px;font-size:22px}.newsletter p{margin:0 0 16px;font-size:15px;color:#5b4a30}
.nl-row{display:flex;gap:8px}.nl-row input{flex:1;padding:11px 14px;border-radius:8px;border:1px solid #d4c3a3;background:#fff;font-size:14px}
.nl-row button{padding:11px 20px;border-radius:8px;background:var(--ink);color:var(--bg);border:0;font-weight:600;cursor:pointer}
.nl-done{color:var(--accent);font-weight:600}.nl-fine{color:var(--muted);font-size:12px;margin-top:8px}
.related{margin:44px 0 0;padding-top:32px;border-top:1px solid var(--rule)}
.related h3{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.14em;margin-bottom:22px;font-weight:700}
.rp-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:22px}
.rp-card{display:block;color:inherit;text-decoration:none}
.rp-thumb{width:100%;aspect-ratio:16/10;border-radius:8px;position:relative;margin-bottom:12px}
.rp-tag{position:absolute;bottom:10px;left:10px;background:rgba(255,255,255,.9);color:var(--ink);padding:3px 10px;border-radius:99px;font-size:11px;font-weight:600}
.rp-card h4{margin:0 0 6px;font-size:17px;line-height:1.3;font-weight:700}.rp-meta{color:var(--muted);font-size:12px}
.comments{margin:44px 0 0;padding-top:32px;border-top:1px solid var(--rule)}.comments h3{font-size:18px;margin-bottom:20px}
.comment{display:flex;gap:12px;margin-bottom:18px;padding-bottom:18px;border-bottom:1px solid var(--rule)}
.c-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#d4a373,#a67c52);flex-shrink:0}
.c-body{flex:1}.c-head{font-size:13px;margin-bottom:4px}.c-head span{color:var(--muted);margin-left:6px;font-size:12px}
.comment p{font-size:15px;margin:0;line-height:1.55}
.c-more{color:var(--accent);font-size:13px;font-weight:600;margin-top:12px}
.site-foot{background:#f0eae0;border-top:1px solid var(--rule);padding:40px 20px 24px;margin-top:60px}
.sf-inner{max-width:960px;margin:0 auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:32px}
.sf-brand strong{display:block;font-size:18px;margin-bottom:6px}.sf-brand div{color:var(--muted);font-size:13px;max-width:250px}
.sf-col h5{margin:0 0 12px;font-size:12px;text-transform:uppercase;letter-spacing:.14em;color:var(--muted)}
.sf-col a{display:block;color:var(--ink);text-decoration:none;font-size:14px;padding:4px 0}
.sf-legal{max-width:960px;margin:32px auto 0;padding-top:20px;border-top:1px solid #e0d6c0;color:var(--muted);font-size:12px;text-align:center}.sf-legal a{color:var(--muted);margin:0 6px}
@media(max-width:720px){.rp-grid{grid-template-columns:1fr}.sf-inner{grid-template-columns:1fr 1fr;gap:24px}article h1{font-size:30px}.subtitle{font-size:17px}}
</style></head>
<body>
<header class="site"><div class="logo">Daily Reader</div><nav><a href="#">Essays</a><a href="#">Notes</a><a href="#">Archive</a><a href="#">About</a></nav></header>
<div class="crumbs"><a href="#">Home</a><span>/</span><a href="#">Essays</a><span>/</span>${escapeHtml(lead.title)}</div>
<main><article>
  <div class="kicker">Essays · Slow Living</div>
  <h1>${escapeHtml(lead.title)}</h1>
  <div class="subtitle">${escapeHtml(a.body.split(/\n\n/)[0].slice(0, 140))}…</div>
  <div class="byline"><span class="avatar"></span><div><div>By <strong>${escapeHtml(author.name)}</strong></div><div style="font-size:12px;color:var(--muted);margin-top:2px">${formatDate(iso)} · ${readMin} min read · Updated for ${year}</div></div></div>
  ${socialShareBar()}
  ${articleWithSubhead(lead.body, subheadFor(lead.title), { dropCap: true })}
  <blockquote>${escapeHtml(b.body.split(/\n\n/)[0])}</blockquote>
  ${paragraphsHtml(c.body.split(/\n\n/).slice(0, 2).join("\n\n"))}
  <h2>What I keep coming back to</h2>
  ${paragraphsHtml(d.body.split(/\n\n/).slice(0, 2).join("\n\n"))}
  <div class="tags">${tags.map((t) => `<a href="#">#${escapeHtml(t)}</a>`).join("")}</div>
</article>
<div class="author-card"><div class="a-av"></div><div class="a-info"><h4>${escapeHtml(author.name)}</h4><div class="a-role">Contributing writer, Daily Reader</div><p>${escapeHtml(author.bio)}</p></div></div>
${newsletterCta("Daily Reader", "A short essay every Sunday morning. Read by 42,000 quiet people.")}
<section class="related"><h3>More from Daily Reader</h3><div class="rp-grid">${relatedGrid([e, f, g, b], "#8b6f47")}</div></section>
${commentsBlock(84 + Math.floor(Math.random() * 200))}
</main>
${footerSitemap("Daily Reader", year, [{ section: "Sections", items: ["Essays", "Notes", "Reviews", "Interviews"] }, { section: "About", items: ["Our story", "Writers", "Newsletter", "Advertise"] }, { section: "Legal", items: ["Privacy", "Terms", "Contact", "RSS"] }])}
</body></html>`;
}

function tmplKitchenJournal(p: Snip[], year: number): string {
  const [lead, a, b, c, d, e, f, g] = p;
  const author = pickAuthor();
  const iso = recentIsoDate();
  const readMin = READ_MINS();
  const tags = ["cooking", "slow food", "seasonal", "home"];
  return `<!doctype html><html lang="en"><head>${siteHead({ siteName: "The Kitchen Journal", siteHost: "thekitchenjournal.com", section: "Cooking", title: lead.title, description: lead.body.slice(0, 155).replace(/\n/g, " "), author: author.name, publishedIso: iso, themeColor: "#c0392b", faviconEmoji: "🍳" })}
<style>*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,sans-serif;background:#fff8f0;color:#3a2a1a;line-height:1.7}
.nav{background:#c0392b;color:#fff;padding:16px 24px;font-weight:700;letter-spacing:.06em;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:10}
.nav .links{display:flex;gap:20px}.nav .links a{color:#fde9d9;text-decoration:none;font-weight:500;font-size:14px;letter-spacing:0}
.crumbs{max-width:720px;margin:0 auto;padding:24px 20px 0;font-size:13px;color:#8a7560}.crumbs a{color:#8a7560;text-decoration:none}
.wrap{max-width:720px;margin:0 auto;padding:20px 24px 40px}
.tag-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
.tag{background:#f4e1c7;color:#8b5e30;padding:4px 12px;border-radius:99px;font-size:12px;font-weight:600}
h1{font-size:36px;color:#a8341f;margin:0 0 12px;letter-spacing:-.015em;line-height:1.15;font-weight:800}
.subtitle{font-size:18px;color:#7a6249;line-height:1.5;margin-bottom:24px;font-style:italic}
.byline{color:#8a7560;font-size:14px;margin-bottom:24px;display:flex;gap:12px;align-items:center;padding-bottom:20px;border-bottom:1px solid #e8d8c0}
.byline .avatar{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#e8b76a,#a8341f);flex-shrink:0}
.byline strong{color:#3a2a1a}
.share{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #e8d8c0;margin-bottom:24px;font-size:13px;color:#8a7560}
.share a{width:30px;height:30px;border-radius:50%;border:1px solid #e8d8c0;display:inline-flex;align-items:center;justify-content:center;color:#3a2a1a;text-decoration:none}
p{margin:0 0 18px;font-size:17px}p.lead::first-letter{font-size:4em;float:left;line-height:.9;padding:4px 10px 0 0;color:#c0392b;font-weight:700;font-family:Georgia,serif}
h2{font-size:24px;color:#a8341f;margin:34px 0 14px;line-height:1.25}
.box{background:#fff;border-left:4px solid #c0392b;padding:18px 22px;margin:26px 0;border-radius:0 10px 10px 0;box-shadow:0 2px 8px rgba(0,0,0,.05)}
.box strong{color:#c0392b;display:block;margin-bottom:6px;font-size:13px;text-transform:uppercase;letter-spacing:.1em}
.author-card{margin:36px 0;padding:22px;background:#fff;border:1px solid #e8d8c0;border-radius:12px;display:flex;gap:16px}
.a-av{width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#e8b76a,#a8341f);flex-shrink:0}
.a-info h4{margin:0 0 4px}.a-role{color:#8a7560;font-size:13px;margin-bottom:8px}.a-info p{font-size:14px;margin:0;line-height:1.55}
.newsletter{background:linear-gradient(180deg,#fce9d0,#fff5e6);border:1px solid #e8c896;border-radius:14px;padding:26px;margin:40px 0}
.nl-tag{color:#c0392b;font-size:11px;text-transform:uppercase;letter-spacing:.18em;font-weight:700;margin-bottom:8px}
.newsletter h3{margin:0 0 8px;font-size:22px;color:#a8341f}.newsletter p{margin:0 0 16px;font-size:15px}
.nl-row{display:flex;gap:8px}.nl-row input{flex:1;padding:11px 14px;border-radius:8px;border:1px solid #d4b280;background:#fff;font-size:14px}
.nl-row button{padding:11px 20px;border-radius:8px;background:#c0392b;color:#fff;border:0;font-weight:700;cursor:pointer}
.nl-done{color:#c0392b;font-weight:600}.nl-fine{color:#8a7560;font-size:12px;margin-top:8px}
.related{margin:40px 0 0;padding-top:28px;border-top:1px solid #e8d8c0}.related h3{font-size:12px;color:#8a7560;text-transform:uppercase;letter-spacing:.14em;margin-bottom:20px;font-weight:700}
.rp-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}
.rp-card{display:block;color:inherit;text-decoration:none}
.rp-thumb{width:100%;aspect-ratio:16/10;border-radius:8px;position:relative;margin-bottom:10px}
.rp-tag{position:absolute;bottom:8px;left:8px;background:rgba(255,255,255,.95);color:#c0392b;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700}
.rp-card h4{margin:0 0 6px;font-size:16px;line-height:1.3;color:#3a2a1a}.rp-meta{color:#8a7560;font-size:12px}
.comments{margin:40px 0 0;padding-top:28px;border-top:1px solid #e8d8c0}.comments h3{font-size:17px;margin-bottom:18px}
.comment{display:flex;gap:12px;margin-bottom:18px;padding-bottom:16px;border-bottom:1px solid #f2e6cc}
.c-avatar{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#e8b76a,#c0392b);flex-shrink:0}
.c-head{font-size:13px;margin-bottom:4px}.c-head span{color:#8a7560;margin-left:6px;font-size:12px}
.comment p{font-size:15px;margin:0}.c-more{color:#c0392b;font-size:13px;font-weight:700;margin-top:10px}
.site-foot{background:#a8341f;color:#fde9d9;padding:40px 24px 24px;margin-top:50px}
.sf-inner{max-width:960px;margin:0 auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:32px}
.sf-brand strong{display:block;font-size:18px;margin-bottom:6px;color:#fff}.sf-brand div{font-size:13px;max-width:240px}
.sf-col h5{margin:0 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:.14em;color:#e8b76a}
.sf-col a{display:block;color:#fde9d9;text-decoration:none;font-size:14px;padding:3px 0}
.sf-legal{max-width:960px;margin:28px auto 0;padding-top:18px;border-top:1px solid rgba(255,255,255,.15);font-size:12px;text-align:center}.sf-legal a{color:#fde9d9;margin:0 6px}
@media(max-width:720px){.rp-grid{grid-template-columns:1fr}.sf-inner{grid-template-columns:1fr 1fr;gap:24px}h1{font-size:28px}}
</style></head>
<body>
<div class="nav"><span>THE KITCHEN JOURNAL</span><div class="links"><a href="#">Recipes</a><a href="#">Techniques</a><a href="#">Seasons</a><a href="#">Newsletter</a></div></div>
<div class="crumbs"><a href="#">Home</a> / <a href="#">Notes</a> / ${escapeHtml(lead.title)}</div>
<div class="wrap">
  <div class="tag-row">${tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
  <h1>${escapeHtml(lead.title)}</h1>
  <div class="subtitle">${escapeHtml(a.body.split(/\n\n/)[0].slice(0, 130))}…</div>
  <div class="byline"><span class="avatar"></span><div><div>By <strong>${escapeHtml(author.name)}</strong></div><div style="font-size:12px;color:#8a7560;margin-top:2px">${formatDate(iso)} · ${readMin} min read</div></div></div>
  ${socialShareBar()}
  ${articleWithSubhead(lead.body, "The trick that finally worked", { dropCap: true })}
  <div class="box"><strong>From the editor</strong>${escapeHtml(a.body.split(/\n\n/)[0])}</div>
  ${paragraphsHtml(b.body.split(/\n\n/).slice(0, 2).join("\n\n"))}
  <h2>A small ritual worth keeping</h2>
  ${paragraphsHtml(c.body.split(/\n\n/).slice(0, 2).join("\n\n"))}
  <div class="author-card"><div class="a-av"></div><div class="a-info"><h4>${escapeHtml(author.name)}</h4><div class="a-role">Food writer · The Kitchen Journal</div><p>${escapeHtml(author.bio)}</p></div></div>
  ${newsletterCta("Kitchen Journal", "Weekly recipes, technique notes, and one honest kitchen mistake — every Saturday.")}
  <section class="related"><h3>More recipes & notes</h3><div class="rp-grid">${relatedGrid([d, e, f, g], "#c0392b")}</div></section>
  ${commentsBlock(48 + Math.floor(Math.random() * 180))}
</div>
${footerSitemap("The Kitchen Journal", year, [{ section: "Cook", items: ["Recipes", "Techniques", "Ingredients", "Menus"] }, { section: "Read", items: ["Essays", "Interviews", "Reviews", "Newsletter"] }, { section: "About", items: ["Contact", "Team", "Advertise", "RSS"] }])}
</body></html>`;
}

function tmplTechWeekly(p: Snip[], year: number): string {
  const [lead, a, b, c, d, e, f, g] = p;
  const author = pickAuthor();
  const iso = recentIsoDate();
  const readMin = READ_MINS();
  const tags = ["culture", "attention", "product", "essay"];
  return `<!doctype html><html lang="en"><head>${siteHead({ siteName: "Tech Weekly", siteHost: "techweekly.io", section: "Technology", title: lead.title, description: lead.body.slice(0, 155).replace(/\n/g, " "), author: author.name, publishedIso: iso, themeColor: "#0e1117", faviconEmoji: "⚡" })}
<style>*{box-sizing:border-box}body{margin:0;font-family:Inter,-apple-system,BlinkMacSystemFont,system-ui,sans-serif;background:#0d1117;color:#e6edf3;line-height:1.65}
header.site{padding:16px 24px;border-bottom:1px solid #21262d;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:#0d1117;z-index:10}
.logo{font-weight:800;letter-spacing:-.02em;font-size:19px}.logo span{color:#58a6ff}
header nav a{color:#8b949e;text-decoration:none;margin-left:22px;font-size:14px;font-weight:500}
.crumbs{max-width:780px;margin:0 auto;padding:24px 24px 0;font-size:13px;color:#8b949e}.crumbs a{color:#8b949e;text-decoration:none}.crumbs span{margin:0 8px;color:#484f58}
main{max-width:780px;margin:0 auto;padding:20px 24px 40px}
.kicker{color:#58a6ff;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;margin-bottom:12px}
h1{font-size:40px;line-height:1.15;margin:0 0 14px;letter-spacing:-.025em;font-weight:800}
.subtitle{font-size:20px;color:#8b949e;line-height:1.5;margin-bottom:26px}
.byline{color:#8b949e;font-size:13px;margin-bottom:24px;display:flex;gap:14px;align-items:center;padding-bottom:20px;border-bottom:1px solid #21262d}
.byline .avatar{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#58a6ff,#7c3aed);flex-shrink:0}
.byline strong{color:#e6edf3}
.share{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #21262d;margin-bottom:24px;color:#8b949e;font-size:13px}
.share a{width:32px;height:32px;border-radius:50%;background:#161b22;border:1px solid #21262d;display:inline-flex;align-items:center;justify-content:center;color:#e6edf3;text-decoration:none}
p{margin:0 0 20px;font-size:18px}p.lead{font-size:20px;line-height:1.6;color:#c9d1d9}
h2{font-size:26px;margin:36px 0 14px;line-height:1.25;font-weight:700}
.card{background:#161b22;border:1px solid #21262d;border-radius:12px;padding:20px 24px;margin:28px 0}
.card h3{margin:0 0 8px;font-size:15px;color:#58a6ff;font-weight:700}.card p{margin:0;font-size:15px;color:#c9d1d9}
blockquote{border-left:3px solid #58a6ff;padding:6px 0 6px 20px;margin:28px 0;color:#c9d1d9;font-size:20px;font-style:italic}
.tags{display:flex;gap:8px;flex-wrap:wrap;margin:30px 0}.tags a{background:#161b22;border:1px solid #21262d;color:#8b949e;padding:4px 12px;border-radius:99px;font-size:12px;text-decoration:none}
.author-card{margin:36px 0;padding:22px;background:#161b22;border:1px solid #21262d;border-radius:12px;display:flex;gap:16px}
.a-av{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#58a6ff,#7c3aed);flex-shrink:0}
.a-info h4{margin:0 0 4px;color:#e6edf3}.a-role{color:#8b949e;font-size:13px;margin-bottom:8px}.a-info p{font-size:14px;margin:0;color:#c9d1d9;line-height:1.55}
.newsletter{background:linear-gradient(135deg,#161b22,#0d2e4b);border:1px solid #1f6feb44;border-radius:14px;padding:28px;margin:40px 0}
.nl-tag{color:#58a6ff;font-size:11px;text-transform:uppercase;letter-spacing:.18em;font-weight:700;margin-bottom:8px}
.newsletter h3{margin:0 0 8px;font-size:22px}.newsletter p{margin:0 0 16px;font-size:15px;color:#c9d1d9}
.nl-row{display:flex;gap:8px}.nl-row input{flex:1;padding:12px 14px;border-radius:8px;border:1px solid #30363d;background:#0d1117;color:#e6edf3;font-size:14px}
.nl-row button{padding:12px 22px;border-radius:8px;background:#238636;color:#fff;border:0;font-weight:600;cursor:pointer}
.nl-done{color:#58a6ff;font-weight:600}.nl-fine{color:#8b949e;font-size:12px;margin-top:8px}
.related{margin:40px 0 0;padding-top:32px;border-top:1px solid #21262d}
.related h3{font-size:12px;color:#8b949e;text-transform:uppercase;letter-spacing:.14em;margin-bottom:22px;font-weight:700}
.rp-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:22px}
.rp-card{display:block;text-decoration:none;color:inherit}
.rp-thumb{width:100%;aspect-ratio:16/10;border-radius:8px;position:relative;margin-bottom:12px;border:1px solid #21262d}
.rp-tag{position:absolute;bottom:10px;left:10px;background:#0d1117;color:#58a6ff;border:1px solid #58a6ff44;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:600}
.rp-card h4{margin:0 0 6px;font-size:17px;line-height:1.3;color:#e6edf3}.rp-meta{color:#8b949e;font-size:12px}
.comments{margin:40px 0 0;padding-top:32px;border-top:1px solid #21262d}.comments h3{font-size:17px;margin-bottom:20px}
.comment{display:flex;gap:12px;margin-bottom:18px;padding-bottom:18px;border-bottom:1px solid #21262d}
.c-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#58a6ff,#7c3aed);flex-shrink:0}
.c-head{font-size:13px;margin-bottom:4px}.c-head span{color:#8b949e;margin-left:6px;font-size:12px}
.comment p{font-size:15px;margin:0;color:#c9d1d9}.c-more{color:#58a6ff;font-size:13px;font-weight:600;margin-top:10px}
.site-foot{border-top:1px solid #21262d;padding:40px 24px 24px;background:#010409;color:#8b949e;margin-top:60px}
.sf-inner{max-width:980px;margin:0 auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:32px}
.sf-brand strong{color:#e6edf3;display:block;font-size:18px;margin-bottom:6px}.sf-brand div{font-size:13px;max-width:240px}
.sf-col h5{margin:0 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:.14em;color:#8b949e}
.sf-col a{display:block;color:#c9d1d9;text-decoration:none;font-size:14px;padding:3px 0}
.sf-legal{max-width:980px;margin:28px auto 0;padding-top:18px;border-top:1px solid #21262d;font-size:12px;text-align:center}.sf-legal a{color:#8b949e;margin:0 6px}
@media(max-width:720px){.rp-grid{grid-template-columns:1fr}.sf-inner{grid-template-columns:1fr 1fr;gap:24px}h1{font-size:30px}.subtitle{font-size:17px}}
</style></head>
<body>
<header class="site"><div class="logo">Tech<span>Weekly</span></div><nav><a href="#">Issues</a><a href="#">Topics</a><a href="#">Podcast</a><a href="#">Subscribe</a></nav></header>
<div class="crumbs"><a href="#">Home</a><span>/</span><a href="#">Culture</a><span>/</span>${escapeHtml(lead.title)}</div>
<main>
  <div class="kicker">Essay · Culture</div>
  <h1>${escapeHtml(lead.title)}</h1>
  <div class="subtitle">${escapeHtml(a.body.split(/\n\n/)[0].slice(0, 150))}…</div>
  <div class="byline"><span class="avatar"></span><div><div><strong>${escapeHtml(author.name)}</strong></div><div style="font-size:12px;color:#8b949e;margin-top:2px">${formatDate(iso)} · ${readMin} min read · Issue #${180 + Math.floor(Math.random() * 40)}</div></div></div>
  ${socialShareBar()}
  ${articleWithSubhead(lead.body, subheadFor(lead.title), { dropCap: false, leadClass: "lead" })}
  <div class="card"><h3>Key takeaway</h3><p>${escapeHtml(b.body.split(/\n\n/)[0])}</p></div>
  ${paragraphsHtml(c.body.split(/\n\n/).slice(0, 2).join("\n\n"))}
  <h2>Zoom out for a second</h2>
  ${paragraphsHtml(d.body.split(/\n\n/).slice(0, 2).join("\n\n"))}
  <blockquote>${escapeHtml(e.body.split(/\n\n/)[0])}</blockquote>
  <div class="tags">${tags.map((t) => `<a href="#">#${t}</a>`).join("")}</div>
  <div class="author-card"><div class="a-av"></div><div class="a-info"><h4>${escapeHtml(author.name)}</h4><div class="a-role">Senior writer · Tech Weekly</div><p>${escapeHtml(author.bio)}</p></div></div>
  ${newsletterCta("Tech Weekly", "One essay, five links, and a Friday reading list. Read by 78,000 engineers, PMs and curious humans.")}
  <section class="related"><h3>More from Tech Weekly</h3><div class="rp-grid">${relatedGrid([f, g, b, c], "#58a6ff")}</div></section>
  ${commentsBlock(120 + Math.floor(Math.random() * 260))}
</main>
${footerSitemap("Tech Weekly", year, [{ section: "Read", items: ["Latest", "Essays", "Interviews", "Archive"] }, { section: "Listen", items: ["Podcast", "Radio", "Talks", "RSS"] }, { section: "About", items: ["Team", "Advertise", "Jobs", "Contact"] }])}
</body></html>`;
}

function tmplWellnessMag(p: Snip[], year: number): string {
  const [lead, a, b, c, d, e, f, g] = p;
  const author = pickAuthor();
  const iso = recentIsoDate();
  const readMin = READ_MINS();
  return `<!doctype html><html lang="en"><head>${siteHead({ siteName: "Bloom & Be", siteHost: "bloomandbe.com", section: "Wellness", title: lead.title, description: lead.body.slice(0, 155).replace(/\n/g, " "), author: author.name, publishedIso: iso, themeColor: "#a87b5c", faviconEmoji: "🌿" })}
<style>*{box-sizing:border-box}body{margin:0;font-family:"Helvetica Neue",-apple-system,sans-serif;background:linear-gradient(180deg,#fef6f0,#fff 40%);color:#2d2438;line-height:1.75}
.brand{text-align:center;padding:26px 20px 6px;font-size:11px;letter-spacing:.55em;color:#a87b5c;font-weight:700}
.nav{text-align:center;font-size:13px;color:#a87b5c;padding-bottom:14px;border-bottom:1px solid #f0dfd0}
.nav a{color:#a87b5c;text-decoration:none;margin:0 14px}
.crumbs{max-width:680px;margin:0 auto;padding:20px 20px 0;font-size:12px;color:#a87b5c;text-align:center;letter-spacing:.05em}
.crumbs a{color:#a87b5c;text-decoration:none}
.kicker{text-align:center;color:#a87b5c;font-size:11px;letter-spacing:.35em;text-transform:uppercase;font-weight:700;margin:26px 0 10px}
h1{text-align:center;font-family:Georgia,serif;font-size:44px;font-weight:400;margin:8px 20px 10px;font-style:italic;color:#5c3a52;line-height:1.15}
.line{width:60px;height:2px;background:#d4a373;margin:16px auto 14px}
.meta-c{text-align:center;font-size:12px;color:#a87b5c;letter-spacing:.05em;margin-bottom:8px}
.share{display:flex;justify-content:center;gap:14px;padding:14px 0 18px;margin-bottom:22px;border-bottom:1px solid #f0dfd0;color:#a87b5c;font-size:13px;align-items:center}
.share a{width:32px;height:32px;border-radius:50%;border:1px solid #e8cfb8;display:inline-flex;align-items:center;justify-content:center;color:#a87b5c;text-decoration:none}
main{max-width:640px;margin:0 auto;padding:0 24px 40px}
p{margin:0 0 18px;font-size:17px}p.lead::first-letter{font-size:3.2em;float:left;line-height:.9;padding:6px 10px 0 0;color:#a87b5c;font-family:Georgia,serif}
h2{font-family:Georgia,serif;font-size:26px;color:#5c3a52;font-style:italic;font-weight:400;margin:32px 0 14px;text-align:center}
.quote{font-family:Georgia,serif;font-style:italic;color:#a87b5c;font-size:22px;text-align:center;margin:34px 0;padding:22px 20px;line-height:1.5;border-top:1px solid #f0dfd0;border-bottom:1px solid #f0dfd0}
.author-card{margin:36px 0;padding:24px;background:#fff;border:1px solid #f0dfd0;border-radius:14px;text-align:center}
.a-av{width:70px;height:70px;border-radius:50%;background:linear-gradient(135deg,#d4a373,#a87b5c);margin:0 auto 12px}
.a-info h4{margin:0 0 4px;color:#5c3a52;font-family:Georgia,serif;font-style:italic;font-size:20px}
.a-role{color:#a87b5c;font-size:12px;margin-bottom:10px;letter-spacing:.05em}
.a-info p{font-size:14px;margin:0;line-height:1.6}
.newsletter{background:#fdf1e4;border:1px solid #f0dfd0;border-radius:16px;padding:28px;margin:36px 0;text-align:center}
.nl-tag{color:#a87b5c;font-size:10px;text-transform:uppercase;letter-spacing:.3em;font-weight:700;margin-bottom:8px}
.newsletter h3{margin:0 0 8px;font-family:Georgia,serif;font-style:italic;color:#5c3a52;font-size:24px;font-weight:400}
.newsletter p{margin:0 0 16px;font-size:14px;color:#7a6a52}
.nl-row{display:flex;gap:8px;max-width:400px;margin:0 auto}
.nl-row input{flex:1;padding:12px 16px;border-radius:99px;border:1px solid #d4a373;background:#fff;font-size:14px;font-family:inherit}
.nl-row button{padding:12px 22px;border-radius:99px;background:#5c3a52;color:#fff;border:0;font-weight:600;cursor:pointer;font-family:inherit;letter-spacing:.05em;font-size:13px}
.nl-fine{color:#a87b5c;font-size:11px;margin-top:10px}
.related{margin:40px 0 0;padding-top:32px;border-top:1px solid #f0dfd0}
.related h3{font-size:11px;color:#a87b5c;text-transform:uppercase;letter-spacing:.3em;text-align:center;margin-bottom:22px;font-weight:700}
.rp-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:24px}
.rp-card{display:block;text-decoration:none;color:inherit;text-align:center}
.rp-thumb{width:100%;aspect-ratio:1;border-radius:50%;margin-bottom:12px}
.rp-tag{display:none}
.rp-card h4{margin:0 0 6px;font-family:Georgia,serif;font-style:italic;font-size:17px;color:#5c3a52;font-weight:400}.rp-meta{color:#a87b5c;font-size:11px;letter-spacing:.05em}
.comments{margin:40px 0 0;padding-top:32px;border-top:1px solid #f0dfd0}.comments h3{font-family:Georgia,serif;font-style:italic;font-size:22px;color:#5c3a52;margin-bottom:20px;text-align:center;font-weight:400}
.comment{display:flex;gap:12px;margin-bottom:18px;padding-bottom:16px;border-bottom:1px solid #f5e6d8}
.c-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#d4a373,#a87b5c);flex-shrink:0}
.c-head{font-size:13px;margin-bottom:4px;color:#5c3a52}.c-head span{color:#a87b5c;font-size:12px;margin-left:6px}
.comment p{font-size:14px;margin:0;line-height:1.55;color:#4a3a4a}.c-more{color:#a87b5c;font-size:12px;font-weight:600;margin-top:10px;text-align:center}
.site-foot{background:#fdf1e4;padding:40px 20px 24px;margin-top:50px;color:#7a6a52}
.sf-inner{max-width:900px;margin:0 auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:32px}
.sf-brand strong{color:#5c3a52;display:block;font-size:18px;margin-bottom:6px;font-family:Georgia,serif;font-style:italic;font-weight:400}
.sf-brand div{font-size:12px;max-width:220px}
.sf-col h5{margin:0 0 10px;font-size:11px;text-transform:uppercase;letter-spacing:.2em;color:#a87b5c}
.sf-col a{display:block;color:#5c3a52;text-decoration:none;font-size:13px;padding:3px 0}
.sf-legal{max-width:900px;margin:28px auto 0;padding-top:18px;border-top:1px solid #f0dfd0;font-size:11px;text-align:center;color:#a87b5c;letter-spacing:.05em}.sf-legal a{color:#a87b5c;margin:0 6px}
@media(max-width:720px){.rp-grid{grid-template-columns:1fr}.sf-inner{grid-template-columns:1fr 1fr}h1{font-size:32px}}
</style></head>
<body>
<div class="brand">BLOOM &nbsp; & &nbsp; BE</div>
<div class="nav"><a href="#">Wellness</a>·<a href="#">Ritual</a>·<a href="#">Home</a>·<a href="#">Journal</a>·<a href="#">Shop</a></div>
<div class="crumbs"><a href="#">Journal</a> · Slow Living</div>
<div class="kicker">Journal · Slow Living</div>
<h1>${escapeHtml(lead.title)}</h1>
<div class="line"></div>
<div class="meta-c">By <em>${escapeHtml(author.name)}</em> · ${formatDate(iso)} · ${readMin} min read</div>
${socialShareBar()}
<main>
  ${articleWithSubhead(lead.body, "A softer way to begin", { dropCap: true })}
  <div class="quote">"${escapeHtml(a.body.split(/\n\n/)[0])}"</div>
  ${paragraphsHtml(b.body.split(/\n\n/).slice(0, 2).join("\n\n"))}
  <h2>The ritual, simplified</h2>
  ${paragraphsHtml(c.body.split(/\n\n/).slice(0, 2).join("\n\n"))}
  <div class="author-card"><div class="a-av"></div><div class="a-info"><h4>${escapeHtml(author.name)}</h4><div class="a-role">Contributor · Bloom & Be</div><p>${escapeHtml(author.bio)}</p></div></div>
  ${newsletterCta("Bloom & Be", "Gentle Sunday letters on rest, ritual and rhythms. Never more than one email a week.")}
  <section class="related"><h3>Continue Reading</h3><div class="rp-grid">${relatedGrid([d, e, f, g], "#a87b5c")}</div></section>
  ${commentsBlock(32 + Math.floor(Math.random() * 140))}
</main>
${footerSitemap("Bloom & Be", year, [{ section: "Journal", items: ["Wellness", "Ritual", "Home", "Recipes"] }, { section: "Shop", items: ["New in", "Wellness", "Home", "Gifts"] }, { section: "About", items: ["Our story", "Contact", "Press", "Newsletter"] }])}
</body></html>`;
}

function tmplTravelLog(p: Snip[], year: number): string {
  const [lead, a, b, c, d, e, f, g] = p;
  const author = pickAuthor();
  const iso = recentIsoDate();
  const readMin = READ_MINS();
  return `<!doctype html><html lang="en"><head>${siteHead({ siteName: "Wanderlines", siteHost: "wanderlines.travel", section: "Travel", title: lead.title, description: lead.body.slice(0, 155).replace(/\n/g, " "), author: author.name, publishedIso: iso, themeColor: "#1f3a3d", faviconEmoji: "✈️" })}
<style>*{box-sizing:border-box}body{margin:0;font-family:Georgia,"Times New Roman",serif;background:#f5f1ea;color:#2a2a2a;line-height:1.75}
.top{background:#1f3a3d;color:#f5f1ea;padding:18px 26px;letter-spacing:.28em;font-size:12px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:10;font-family:"Helvetica Neue",sans-serif;font-weight:700}
.top .links{display:flex;gap:20px}.top .links a{color:#bca978;text-decoration:none;letter-spacing:.18em;font-size:11px}
.crumbs{max-width:720px;margin:0 auto;padding:22px 24px 0;font-size:12px;color:#7a6a52;letter-spacing:.08em;font-family:"Helvetica Neue",sans-serif}
.crumbs a{color:#7a6a52;text-decoration:none}
.hero{padding:60px 24px 44px;text-align:center;background:linear-gradient(180deg,#e8e0d2,#f5f1ea)}
.hero .kicker{font-family:"Helvetica Neue",sans-serif;font-size:11px;letter-spacing:.35em;color:#7a6a52;text-transform:uppercase;margin-bottom:14px;font-weight:700}
.hero h1{margin:0 0 12px;font-size:46px;line-height:1.1;font-weight:400;letter-spacing:-.015em}
.hero .sub{color:#7a6a52;font-style:italic;font-size:17px;max-width:540px;margin:0 auto}
main{max-width:720px;margin:0 auto;padding:36px 24px 40px}
.dateline{font-family:"Helvetica Neue",sans-serif;font-variant:small-caps;letter-spacing:.16em;color:#7a6a52;font-size:13px;margin-bottom:22px;text-align:center;padding-bottom:18px;border-bottom:1px solid #dfd6c4}
.share{display:flex;justify-content:center;gap:12px;padding:10px 0 22px;color:#7a6a52;font-size:13px;align-items:center;font-family:"Helvetica Neue",sans-serif}
.share a{width:32px;height:32px;border-radius:50%;border:1px solid #dfd6c4;display:inline-flex;align-items:center;justify-content:center;color:#1f3a3d;text-decoration:none;background:#fff}
p{margin:0 0 20px;font-size:18px}p.lead::first-letter{font-size:3.5em;float:left;line-height:.85;padding:6px 10px 0 0;color:#bca978;font-weight:700}
h2{font-size:26px;margin:36px 0 14px;color:#1f3a3d;line-height:1.25}
.divider{text-align:center;margin:36px 0;color:#bca978;letter-spacing:1em;font-size:14px}
.pull{background:#1f3a3d;color:#f5f1ea;padding:26px 28px;margin:32px -8px;border-radius:6px;font-style:italic;font-size:20px;line-height:1.5;position:relative}
.author-card{margin:38px 0;padding:24px;background:#fff;border:1px solid #dfd6c4;border-radius:12px;display:flex;gap:16px}
.a-av{width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#bca978,#1f3a3d);flex-shrink:0}
.a-info h4{margin:0 0 4px;color:#1f3a3d}.a-role{color:#7a6a52;font-size:13px;margin-bottom:8px;font-family:"Helvetica Neue",sans-serif;letter-spacing:.05em}
.a-info p{font-size:14px;margin:0;line-height:1.55}
.newsletter{background:#1f3a3d;color:#f5f1ea;border-radius:14px;padding:32px;margin:40px 0;text-align:center}
.nl-tag{color:#bca978;font-size:11px;text-transform:uppercase;letter-spacing:.28em;font-weight:700;margin-bottom:8px;font-family:"Helvetica Neue",sans-serif}
.newsletter h3{margin:0 0 8px;font-size:26px;color:#f5f1ea;font-weight:400}
.newsletter p{margin:0 0 18px;font-size:15px;color:#d9cfb8}
.nl-row{display:flex;gap:8px;max-width:420px;margin:0 auto}
.nl-row input{flex:1;padding:12px 16px;border-radius:4px;border:1px solid #4a6265;background:#f5f1ea;color:#1f3a3d;font-size:14px;font-family:inherit}
.nl-row button{padding:12px 22px;border-radius:4px;background:#bca978;color:#1f3a3d;border:0;font-weight:700;cursor:pointer;font-family:"Helvetica Neue",sans-serif;letter-spacing:.1em;font-size:12px}
.nl-fine{color:#bca978;font-size:11px;margin-top:10px}
.related{margin:44px 0 0;padding-top:32px;border-top:1px solid #dfd6c4}
.related h3{font-size:11px;color:#7a6a52;text-transform:uppercase;letter-spacing:.3em;text-align:center;margin-bottom:24px;font-weight:700;font-family:"Helvetica Neue",sans-serif}
.rp-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:24px}
.rp-card{display:block;text-decoration:none;color:inherit}
.rp-thumb{width:100%;aspect-ratio:4/3;border-radius:6px;margin-bottom:12px;position:relative}
.rp-tag{position:absolute;top:10px;left:10px;background:#1f3a3d;color:#bca978;padding:3px 10px;border-radius:2px;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;font-family:"Helvetica Neue",sans-serif}
.rp-card h4{margin:0 0 6px;font-size:18px;line-height:1.3;color:#1f3a3d;font-weight:400}
.rp-meta{color:#7a6a52;font-size:12px;font-family:"Helvetica Neue",sans-serif;letter-spacing:.05em}
.comments{margin:44px 0 0;padding-top:32px;border-top:1px solid #dfd6c4}
.comments h3{font-size:20px;margin-bottom:22px;color:#1f3a3d;font-weight:400}
.comment{display:flex;gap:12px;margin-bottom:20px;padding-bottom:18px;border-bottom:1px solid #ece3d0}
.c-avatar{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#bca978,#1f3a3d);flex-shrink:0}
.c-head{font-size:13px;margin-bottom:4px;color:#1f3a3d}.c-head span{color:#7a6a52;margin-left:6px;font-size:12px}
.comment p{font-size:15px;margin:0;line-height:1.55}
.c-more{color:#bca978;font-size:12px;font-weight:700;margin-top:12px;letter-spacing:.14em;text-transform:uppercase;font-family:"Helvetica Neue",sans-serif}
.site-foot{background:#1f3a3d;color:#bca978;padding:44px 24px 24px;margin-top:50px;font-family:"Helvetica Neue",sans-serif}
.sf-inner{max-width:960px;margin:0 auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:32px}
.sf-brand strong{color:#f5f1ea;display:block;font-size:16px;letter-spacing:.28em;margin-bottom:8px;font-weight:700}.sf-brand div{font-size:13px;max-width:240px}
.sf-col h5{margin:0 0 10px;font-size:11px;text-transform:uppercase;letter-spacing:.18em;color:#bca978}
.sf-col a{display:block;color:#d9cfb8;text-decoration:none;font-size:13px;padding:3px 0}
.sf-legal{max-width:960px;margin:28px auto 0;padding-top:18px;border-top:1px solid #4a6265;font-size:11px;text-align:center;letter-spacing:.1em}.sf-legal a{color:#bca978;margin:0 6px}
@media(max-width:720px){.rp-grid{grid-template-columns:1fr}.sf-inner{grid-template-columns:1fr 1fr}.hero h1{font-size:32px}}
</style></head>
<body>
<div class="top"><span>WANDERLINES</span><div class="links"><a href="#">FIELD NOTES</a><a href="#">ROUTES</a><a href="#">DISPATCHES</a><a href="#">ABOUT</a></div></div>
<div class="crumbs"><a href="#">Home</a> / <a href="#">Field Notes</a> / ${escapeHtml(lead.title)}</div>
<div class="hero">
  <div class="kicker">Field Notes · ${formatDate(iso)}</div>
  <h1>${escapeHtml(lead.title)}</h1>
  <div class="sub">${escapeHtml(a.body.split(/\n\n/)[0].slice(0, 160))}…</div>
</div>
<main>
  <div class="dateline">Entry no. ${100 + Math.floor(Math.random() * 200)} · By ${escapeHtml(author.name)} · ${readMin} min read</div>
  ${socialShareBar()}
  ${articleWithSubhead(lead.body, "The road slowed me down", { dropCap: true })}
  <div class="pull">${escapeHtml(a.body.split(/\n\n/)[0])}</div>
  ${paragraphsHtml(b.body.split(/\n\n/).slice(0, 2).join("\n\n"))}
  <div class="divider">· · ·</div>
  <h2>What I would tell someone going next</h2>
  ${paragraphsHtml(c.body.split(/\n\n/).slice(0, 2).join("\n\n"))}
  <div class="author-card"><div class="a-av"></div><div class="a-info"><h4>${escapeHtml(author.name)}</h4><div class="a-role">FIELD CORRESPONDENT · WANDERLINES</div><p>${escapeHtml(author.bio)}</p></div></div>
  ${newsletterCta("Wanderlines", "Monthly dispatches from the slow road. Long-form travel writing, no listicles, no sponsored posts.")}
  <section class="related"><h3>More Dispatches</h3><div class="rp-grid">${relatedGrid([d, e, f, g], "#bca978")}</div></section>
  ${commentsBlock(52 + Math.floor(Math.random() * 160))}
</main>
${footerSitemap("Wanderlines", year, [{ section: "Read", items: ["Field Notes", "Routes", "Interviews", "Archive"] }, { section: "Travel", items: ["Europe", "Asia", "Americas", "Africa"] }, { section: "About", items: ["Team", "Ethics", "Contact", "RSS"] }])}
</body></html>`;
}

export function renderSafeArticle(snippets: Snip[] = []): string {
  const picks = pickSnippets(snippets);
  const year = new Date().getFullYear();
  const templates = [tmplDailyReader, tmplKitchenJournal, tmplTechWeekly, tmplWellnessMag, tmplTravelLog];
  const pick = templates[Math.floor(Math.random() * templates.length)];
  return pick(picks, year);
}
