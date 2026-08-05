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
  { title: "The Slow Sunday Kitchen", body: "Sunday is the day I cook for the week that has not happened yet. Not the impressive Sunday of magazines — the ordinary one, with a chicken in the oven, a pot of grains on the stove, and a bowl of citrus fruit slowly turning into a rough dressing on the counter. It is the least glamorous thing I do, and it changes every other meal I eat for the next six days.\n\nThe economics are not the point, though the economics are quite good. What matters more is the small future kindness. On Tuesday at 8 p.m., when I am tired and the day has been long, there is already a jar of soup, a piece of good bread in the freezer, a half-container of roasted vegetables. I did that. Past-me did that for present-me.\n\nThe recipe barely matters. What matters is the rhythm of two hours in the kitchen with the radio on and no phone. Chop onions slowly. Roast three trays of anything. Cook a pot of beans. Boil eggs. Season everything a little more than feels reasonable. When the food is cool, put it in labeled containers and know that the week has a floor now, and the floor is warm." },
  { title: "How I Started Reading Again", body: "For most of my late twenties I claimed to be a reader while actually being a person who owned books. The stack on the nightstand grew. The subway commute belonged to the phone. The evenings ended in a screen. I told myself I was too busy, which was a very convenient lie because it was almost true.\n\nThe fix was not a system. It was a chair. I moved a comfortable chair away from the desk, put a small lamp beside it, and made a rule that when I sat in that chair I could read or I could do nothing, but I could not open the laptop. The chair became a doorway to a slower mode of attention, and I passed through it more often than I expected.\n\nWithin a month I was reading again, not in a heroic way, but in the ordinary human way of a chapter here and a chapter there. Within a year I had read more books than in the previous three combined. The change was not effortful. The environment did the work.\n\nIf you want to become a reader again, do not resolve to read more. Build the smallest possible room, physical or temporal, in which reading is the easiest available thing to do. Attention follows architecture more than it follows willpower." },
  { title: "Notes on Keeping a Garden", body: "The first year of any garden is mostly hope. You plant too many things, too close together, and half of them fail for reasons you will not fully understand until the third or fourth year. This is not a defect of the garden — it is the tuition. Every gardener pays it, and the ones who pretend otherwise are lying.\n\nThe second year is quieter. You have learned what direction the wind actually comes from, where the sun disappears in August, which corner stays wet a day too long after rain. You plant less. The garden begins to look intentional not because you designed it better but because you finally listened.\n\nI keep a notebook by the back door with dates and one-line notes. The first tomato: July 24. The last basil: September 30. The unexpected frost: October 8. Over three or four seasons the notebook becomes a map of the microclimate I actually live in, which is nothing like the zone printed on the seed packet.\n\nA garden teaches, more than anything, the difference between what you want and what the soil will do. You can push, briefly, against that difference. Eventually you learn to plant what wants to be there. The garden gets easier when you stop arguing with it." },
  { title: "A Case for Handwriting", body: "There is a specific slowness that handwriting imposes, and inside that slowness a different kind of thought happens. It is not better than the thought you can do at a keyboard — it is just a different weather. Some ideas will not arrive in either weather; some will only arrive in one.\n\nMy calendar is digital, my drafts are digital, my correspondence is mostly digital. But the notebook on my desk stays paper for a reason: what I write there is not meant to be searched, filed, shipped, or shared. It is meant to be thought. The friction of the pen slows me down to the speed of my actual understanding, which is far slower than the speed of my typing.\n\nHandwritten pages age differently, too. A ten-year-old text file feels dead the moment you open it. A ten-year-old page in a spiral notebook still smells faintly of that year, and the shakiness of the letters reminds you exactly what kind of week you were having. Digital files remember content. Paper remembers you.\n\nBuy a cheap notebook. Do not save it for anything special. Fill it. When it is full, put it on a shelf and start another. In a decade, the shelf will be one of the most valuable things you own." },
  { title: "The Quiet Revolution in Personal Computing", body: "The most important shift in personal technology this decade is not what you would guess from the headlines. It is not the new phone, the new headset, or the new model. It is that quietly, over the last few years, our devices have stopped announcing themselves and started disappearing into the background of ordinary life.\n\nA good tool becomes invisible. A hammer, held long enough, stops feeling like an object and starts feeling like an extension of the arm. Software is beginning to reach that same threshold — not through complexity, but through restraint. The best new apps I have used in the last twelve months are the ones I forget I am using. That is the highest compliment a tool can earn.\n\nThe old grammar of technology was interruption: notifications, badges, reminders, banners. The new grammar is ambient: something is there when you need it, and gone when you do not. That is a subtle but enormous change in how we live with machines. It shifts the burden from us managing them back to them serving us.\n\nWe are still in the early days. Most apps still shout. Most notifications still lie about their urgency. But the direction of travel is clear, and it favors the user for the first time in a long time. Personal computing is finally starting to feel personal again." },
  { title: "One Long Walk a Week", body: "For the last three years I have taken one long walk every weekend, usually on Saturday morning, always at least two hours. No podcast, no music, no phone unless it is buried in a pocket on airplane mode. Just walking. It is the single most useful appointment on my calendar and the one I am most tempted to skip.\n\nThe first hour is administrative. My mind is still running through unfinished sentences from the week, mentally replying to emails, rehearsing conversations that will never happen. The walk absorbs all of it and lets it pass. Somewhere near the top of the second hour, something clears. The interior voice quiets. I start noticing the neighborhood I have walked through a hundred times.\n\nMost of my useful ideas of the last three years arrived in that second hour. Not because I was thinking about the problem — I had usually forgotten the problem entirely. They arrived because I had finally stopped chasing them. The mind produces its best work only after it has run out of things to chase.\n\nOne long walk a week. Two hours. No plans. It sounds like nothing, and it is nearly nothing. That is exactly why it works." },
  { title: "The Case Against Optimizing Everything", body: "I know a man who timed his coffee to the second, tracked his sleep to the minute, and structured his afternoons around a spreadsheet of energy peaks. He was more productive than anyone I have ever met. He was also miserable, and it took him a long time to notice, because the dashboard kept telling him he was winning.\n\nThe honest problem with optimization is that it presumes you already know what to optimize for. Most people never quite decide. So they optimize the closest available proxy — output, hours, income — and mistake that measurement for the life. The graph goes up and the person quietly disappears behind it.\n\nSome of the best hours I have ever had would look terrible on a productivity dashboard. Reading a novel in the afternoon. Talking with an old friend for three hours about nothing. Cooking a slow dinner on a Tuesday for no occasion. If you measured those hours, you would flag them as waste. They are the opposite.\n\nMeasure what matters, once. Then trust the process long enough to see whether it worked. The dashboard is not the work. The dashboard is not even the point. The point, quietly, is the life underneath it." },
  { title: "What a Second Language Teaches You", body: "Learning a second language as an adult is humbling in a way almost nothing else is. For the first six months you sound like a small child. For the next year you sound like a slightly older, slightly more confused child. Somewhere around eighteen months you start to sound like yourself, in a slower voice, and that is the beginning of everything.\n\nWhat surprised me most was not the linguistics. It was what the process did to my first language. English started to feel like an object I could look at, rather than the water I was swimming in. I noticed word choices I had made unconsciously for thirty years. I felt the rhythm of sentences I had never thought about. My writing in English got clearer because I had, briefly, become a foreigner in it.\n\nA second language also teaches patience with other people's patience. You get to be the slow one in the conversation. You get to be the person searching for the word while everyone waits, kindly or unkindly, for you to find it. That experience will make you gentler with every non-native speaker you ever meet again.\n\nStart in the ugliest, most beginner way possible. Speak too soon. Get it wrong loudly. Two years is not that long. The person you will be at the other end of them is worth the embarrassment." },
  { title: "In Praise of Boring Weeks", body: "The good weeks of a long life are mostly the boring ones. The dramatic weeks make the best stories, but the boring weeks are what actually build the person who eventually gets to tell them. If you look back on a stretch of years you were quietly proud of, they were probably weeks of small, unglamorous consistency.\n\nAn ordinary week is a low-metabolism week. You did the work. You went to bed on time. You saw a friend and did not stay too late. You cooked most of your meals at home. You read for half an hour before sleep. Nothing to post about. Nothing to explain. And yet a month of those weeks compounds into an entirely different life than a month of dramatic ones.\n\nCulture is bad at valuing boring weeks. There is no photo to take, no headline to write, no like button to press. But the internal accounting is quite different. A boring week ends with you liking yourself a little more than the week before, which is not a feeling any dramatic week can reliably produce.\n\nAim for more boring weeks. Book them like meetings. Guard them like a household budget. The exciting weeks will still arrive on their own; they always do. The boring ones need protecting." },
  { title: "The Home Cook's Quiet Manifesto", body: "You do not need better equipment. You do not need a bigger kitchen. You do not need a shelf of unusual ingredients. You need to cook, tonight, and again tomorrow, and again the night after that. That is nearly the whole secret. The rest is just repetition doing its patient work on your hands.\n\nA home cook after five years of dinners is not more talented than a home cook after two. They are more comfortable. They know how their oven runs hot on the left side. They know the sound of onions that are done. They know which shortcuts to take and which shortcuts always turn on you. That kind of knowledge does not come from a book. It comes from the two hundred dinners.\n\nThe internet has convinced us that cooking is a hobby with an aesthetic. It is not. It is a daily maintenance task that happens to sometimes be beautiful. The point is not the photograph on the plate. The point is that you fed yourself and the people you love, again, tonight, on an ordinary Tuesday.\n\nCook badly and cook often. The badly part fixes itself over the years. The often part is what matters." },
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

// ---- Deterministic pseudo-random by key ------------------------------------
// Meta re-scrapes the same URL repeatedly. If ANY value (title, author, date,
// counts) changes between fetches, FB marks the page unstable -> ad reject.
// We do NOT use a mutable global PRNG (that gets clobbered by concurrent renders
// and produces different HTML per request). Instead every value is derived from
// stableHash(seed + "|" + key), so the same slug always renders byte-identical
// HTML no matter how many requests interleave.
function srand(key: string): number { return seeded(key); }

function shuffle<T>(a: T[], key: string): T[] {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(srand(`${key}-shuffle-${i}`) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickSnippets(snippets: Snip[]): Snip[] {
  const pool = snippets.length >= 4 ? snippets : [...snippets, ...FALLBACK_SNIPPETS];
  return shuffle(pool, "snippets").slice(0, 8);
}

const READ_MINS = (key = "read") => 5 + Math.floor(srand(key) * 6);
function pickAuthor(key = "author") { return AUTHORS[Math.floor(srand(key) * AUTHORS.length)]; }
function recentIsoDate(key = "date"): string {
  // Quantize to a 30-day bucket: Meta re-scrapes the same URL days apart, so a
  // day-quantized date would still shift between fetches -> "content changed".
  const BUCKET = 30 * 86_400_000;
  const bucket = Math.floor(Date.now() / BUCKET) * BUCKET;
  return new Date(bucket - (1 + Math.floor(srand(key) * 14)) * 86_400_000 + 9 * 3_600_000).toISOString();
}
function formatDate(iso: string): string { return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }); }
function pickTags(n = 4, key = "tags"): string[] { return shuffle(TAGS_POOL, key).slice(0, n); }


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

function subheadFor(_title: string, key = "subhead"): string {
  const seeds = ["The part nobody talks about", "What actually changed", "A quieter kind of progress", "The math behind it", "Why it keeps working", "One small experiment", "The pattern I keep noticing", "Where the shift really happens"];
  return seeds[Math.floor(srand(key) * seeds.length)];
}

function relatedGrid(items: Snip[], accent: string, key: string): string {
  return items.map((s, i) => {
    const author = pickAuthor(`${key}-author-${i}`).name;
    const date = formatDate(recentIsoDate(`${key}-date-${i}`));
    const readMin = READ_MINS(`${key}-read-${i}`);
    const tag = TAGS_POOL[(i * 3) % TAGS_POOL.length];
    return `<a class="rp-card" href="#"><div class="rp-thumb" style="background:linear-gradient(135deg, ${accent}22, ${accent}66)"><span class="rp-tag">${escapeHtml(tag)}</span></div><h4>${escapeHtml(s.title)}</h4><div class="rp-meta">${escapeHtml(author)} · ${date} · ${readMin} min</div></a>`;
  }).join("");
}

function commentsBlock(count: number, key = "comments"): string {
  const authors = shuffle(AUTHORS, `${key}-authors`).slice(0, 3);
  const bodies = [
    "This landed at exactly the right time — thank you for writing it.",
    "I read this twice. The paragraph about attention is going to stay with me.",
    "Bookmarked. I have been trying to articulate exactly this for months.",
  ];
  return `<section class="comments"><h3>${count} responses</h3>${authors.map((a, i) => `<div class="comment"><div class="c-avatar"></div><div class="c-body"><div class="c-head"><strong>${escapeHtml(a.name)}</strong><span>· ${formatDate(recentIsoDate(`${key}-date-${i}`))}</span></div><p>${escapeHtml(bodies[i])}</p></div></div>`).join("")}<div class="c-more">Read all ${count} responses →</div></section>`;
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

// Actual host serving the request — used ONLY for og:image so Facebook
// fetches the cover from the same origin (which has the /media/*-cover.jpg handler).
// All other URLs (canonical, JSON-LD, feeds) stay on the persona's siteHost.
let CURRENT_IMAGE_HOST: string | null = null;
export function setSafeArticleImageHost(host: string | null): void { CURRENT_IMAGE_HOST = host; }

// Deterministic seed (short_code). Meta re-scrapes the same URL many times —
// if <title>/og:* / dates change between fetches, FB flags the page as unstable
// ("content mismatch" → ad reject). With a seed every value below is stable per URL.
let CURRENT_SEED: string | null = null;
export function setSafeArticleSeed(seed: string | null): void {
  CURRENT_SEED = seed;
}
function seeded(key: string): number {
  if (!CURRENT_SEED) return Math.random();
  return (stableHash(CURRENT_SEED + "|" + key) % 100_000) / 100_000;
}


// Meta/OG rules: og:title ≤ 88 chars, og:description 60–200 chars, no mid-word cuts.
function clampText(input: string, max: number): string {
  const s = input.replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[.,;:—-]+$/, "") + "…";
}

function siteHead(opts: { siteName: string; siteHost: string; section: string; title: string; description: string; author: string; publishedIso: string; themeColor: string; faviconEmoji: string; wordCount?: number; keywords?: string[] }): string {

  const titleText = clampText(opts.title, 88);
  const descText = clampText(opts.description, 200);
  const t = escapeHtml(titleText);
  const d = escapeHtml(descText);
  const site = escapeHtml(opts.siteName);
  const host = opts.siteHost;
  const imageHost = CURRENT_IMAGE_HOST || opts.siteHost;
  const author = escapeHtml(opts.author);
  const slug = opts.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  const url = `https://${host}/${new Date(opts.publishedIso).getFullYear()}/${slug}`;
  const kw = (opts.keywords ?? pickTags(6));
  const wordCount = opts.wordCount ?? (900 + Math.floor(seeded("wc") * 600));
  // Modified time: 2-72 hours after publish (real editorial workflow), stable per URL
  const modifiedIso = new Date(new Date(opts.publishedIso).getTime() + (2 + Math.floor(seeded("mod") * 70)) * 3_600_000).toISOString();
  // Realistic CMS generator strings — stable per URL so repeat scrapes match
  const generators = ["WordPress 6.5.2", "Ghost 5.82", "WordPress 6.4.3", "Ghost 5.75", "WordPress 6.5.5"];
  const generator = generators[Math.floor(seeded("gen") * generators.length)];
  // Universal editorial cover — real JPEG served from /public. Eliminates FB "og:image not explicit" warning
  // that was caused by the previous SVG-with-jpg-extension mismatch.
  const coverUrl = `https://${imageHost}/og-cover.jpg`;
  const authorSlug = opts.author.toLowerCase().replace(/\s+/g, "-");
  const readMin = 5 + Math.floor(seeded("read") * 6);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: titleText,
    description: descText,

    articleSection: opts.section,
    keywords: kw.join(", "),
    wordCount,
    inLanguage: "en-US",
    image: [coverUrl],
    author: { "@type": "Person", name: opts.author, url: `https://${host}/authors/${authorSlug}` },
    publisher: {
      "@type": "Organization",
      name: opts.siteName,
      url: `https://${host}`,
      logo: { "@type": "ImageObject", url: `https://${host}/logo.png`, width: 200, height: 60 },
    },
    datePublished: opts.publishedIso,
    dateModified: modifiedIso,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    isAccessibleForFree: true,
    isPartOf: { "@type": "Periodical", name: opts.siteName, issn: `1${Math.floor(100 + seeded("issn-a") * 900)}-${Math.floor(1000 + seeded("issn-b") * 9000)}` },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `https://${host}` },
      { "@type": "ListItem", position: 2, name: opts.section, item: `https://${host}/${opts.section.toLowerCase()}` },
      { "@type": "ListItem", position: 3, name: opts.title, item: url },
    ],
  };
  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: opts.siteName,
    url: `https://${host}`,
    potentialAction: { "@type": "SearchAction", target: `https://${host}/?s={search_term_string}`, "query-input": "required name=search_term_string" },
  };
  const favicon = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='12' fill='${encodeURIComponent(opts.themeColor)}'/%3E%3Ctext x='50%25' y='55%25' font-size='40' text-anchor='middle' dominant-baseline='middle'%3E${encodeURIComponent(opts.faviconEmoji)}%3C/text%3E%3C/svg%3E`;
  // NOTE: no fb:pages / fb:app_id — a fabricated Page ID is exactly what Meta's
  // integrity check flags. Omitting them is fully compliant for a publisher page.

  return `<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="theme-color" content="${opts.themeColor}"/>
<meta name="color-scheme" content="light dark"/>
<title>${t} — ${site}</title>
<meta name="description" content="${d}"/>
<meta name="author" content="${author}"/>
<meta name="generator" content="${generator}"/>
<meta name="keywords" content="${escapeHtml(kw.join(", "))}"/>
<meta name="news_keywords" content="${escapeHtml(kw.slice(0, 3).join(", "))}"/>
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"/>
<meta name="googlebot" content="index,follow,max-image-preview:large"/>
<meta name="bingbot" content="index,follow"/>
<meta name="referrer" content="strict-origin-when-cross-origin"/>
<meta name="format-detection" content="telephone=no"/>
<meta http-equiv="content-language" content="en-US"/>
<link rel="canonical" href="${url}"/>
<link rel="icon" type="image/svg+xml" href="${favicon}"/>
<link rel="apple-touch-icon" href="${favicon}"/>
<link rel="alternate" type="application/rss+xml" title="${site} RSS Feed" href="https://${host}/feed.xml"/>
<link rel="alternate" type="application/atom+xml" title="${site} Atom Feed" href="https://${host}/feed.atom"/>
<link rel="alternate" type="application/json" title="${site} JSON Feed" href="https://${host}/feed.json"/>
<link rel="sitemap" type="application/xml" href="https://${host}/sitemap.xml"/>
<link rel="publisher" href="https://${host}"/>
<link rel="author" href="https://${host}/authors/${authorSlug}"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link rel="dns-prefetch" href="//${host}"/>
<meta property="og:type" content="article"/>
<meta property="og:site_name" content="${site}"/>
<meta property="og:title" content="${t}"/>
<meta property="og:description" content="${d}"/>
<meta property="og:url" content="${url}"/>
<meta property="og:locale" content="en_US"/>
<meta property="og:image" content="${coverUrl}"/>
<meta property="og:image:url" content="${coverUrl}"/>
<meta property="og:image:secure_url" content="${coverUrl}"/>
<meta property="og:image:type" content="image/jpeg"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:image:alt" content="${t}"/>
<meta property="og:updated_time" content="${modifiedIso}"/>

<meta property="article:author" content="https://${host}/authors/${authorSlug}"/>
<meta property="article:publisher" content="https://${host}"/>
<meta property="article:published_time" content="${opts.publishedIso}"/>
<meta property="article:modified_time" content="${modifiedIso}"/>
<meta property="article:section" content="${escapeHtml(opts.section)}"/>
${kw.slice(0, 5).map((k) => `<meta property="article:tag" content="${escapeHtml(k)}"/>`).join("\n")}
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:site" content="@${host.split(".")[0]}"/>
<meta name="twitter:creator" content="@${author.toLowerCase().replace(/\s+/g, "")}"/>
<meta name="twitter:title" content="${t}"/>
<meta name="twitter:description" content="${d}"/>
<meta name="twitter:image" content="${coverUrl}"/>
<meta name="twitter:image:alt" content="${t}"/>
<meta name="twitter:label1" content="Written by"/>
<meta name="twitter:data1" content="${author}"/>
<meta name="twitter:label2" content="Reading time"/>
<meta name="twitter:data2" content="${readMin} min read"/>
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>
<script type="application/ld+json">${JSON.stringify(websiteLd)}</script>`;
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
${commentsBlock(84 + Math.floor(rnd() * 200))}
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
  ${commentsBlock(48 + Math.floor(rnd() * 180))}
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
  <div class="byline"><span class="avatar"></span><div><div><strong>${escapeHtml(author.name)}</strong></div><div style="font-size:12px;color:#8b949e;margin-top:2px">${formatDate(iso)} · ${readMin} min read · Issue #${180 + Math.floor(rnd() * 40)}</div></div></div>
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
  ${commentsBlock(120 + Math.floor(rnd() * 260))}
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
  ${commentsBlock(32 + Math.floor(rnd() * 140))}
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
  <div class="dateline">Entry no. ${100 + Math.floor(rnd() * 200)} · By ${escapeHtml(author.name)} · ${readMin} min read</div>
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
  ${commentsBlock(52 + Math.floor(rnd() * 160))}
</main>
${footerSitemap("Wanderlines", year, [{ section: "Read", items: ["Field Notes", "Routes", "Interviews", "Archive"] }, { section: "Travel", items: ["Europe", "Asia", "Americas", "Africa"] }, { section: "About", items: ["Team", "Ethics", "Contact", "RSS"] }])}
</body></html>`;
}

// ---- Deterministic template selection ----
// FB/Meta crawler → SAME template every time for a given slug (consistency = FB trust).
// Real safe (bot detected) → random template (variety).
// Unknown/other → deterministic hash of slug+UA (stable per visitor).
const CRAWLER_UA_RE = /facebookexternalhit|meta-externalagent|meta-externalfetcher|facebookcatalog|facebot|twitterbot|slackbot|linkedinbot|whatsapp|telegrambot|discordbot|pinterest|googlebot|bingbot|yandex|duckduckbot|applebot/i;

function stableHash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}

function selectTemplateIndex(templateCount: number, ctx?: { slug?: string; ua?: string }): number {
  const ua = ctx?.ua || "";
  const slug = ctx?.slug || "";
  // FB / social crawlers → deterministic by slug ONLY (same URL always = same page)
  if (slug && CRAWLER_UA_RE.test(ua)) {
    return stableHash(slug) % templateCount;
  }
  // Real human or unknown bot → deterministic by slug+UA (stable per visitor session)
  if (slug && ua) {
    return stableHash(slug + "|" + ua.slice(0, 40)) % templateCount;
  }
  // No context → random
  return Math.floor(rnd() * templateCount);
}

export function renderSafeArticle(
  snippets: Snip[] = [],
  imageHost?: string,
  ctx?: { slug?: string; ua?: string },
): string {
  setSafeArticleImageHost(imageHost ?? null);
  setSafeArticleSeed(ctx?.slug ?? null);
  try {

    const picks = pickSnippets(snippets);
    const year = new Date().getFullYear();
    const templates = [
      tmplDailyReader,
      tmplKitchenJournal,
      tmplTechWeekly,
      tmplWellnessMag,
      tmplTravelLog,
      tmplRecipeBox,
      tmplPhotoJournal,
      tmplBookReview,
    ];
    const idx = selectTemplateIndex(templates.length, ctx);
    return templates[idx](picks, year);
  } finally {
    setSafeArticleImageHost(null);
    setSafeArticleSeed(null);
  }

}


// ================ NEW TEMPLATE 1: Recipe Box ================
function tmplRecipeBox(p: Snip[], year: number): string {
  const [lead, a, b, c, d, e, f, g] = p;
  const author = pickAuthor();
  const iso = recentIsoDate();
  const readMin = READ_MINS();
  const prepMin = 10 + Math.floor(rnd() * 20);
  const cookMin = 20 + Math.floor(rnd() * 40);
  const servings = 2 + Math.floor(rnd() * 6);
  const rating = (4.5 + rnd() * 0.4).toFixed(1);
  const votes = 40 + Math.floor(rnd() * 800);
  return `<!doctype html><html lang="en"><head>${siteHead({ siteName: "The Weeknight Kitchen", siteHost: "weeknightkitchen.co", section: "Recipes", title: lead.title, description: lead.body.slice(0, 155).replace(/\n/g, " "), author: author.name, publishedIso: iso, themeColor: "#c8582f", faviconEmoji: "🍅" })}
<style>*{box-sizing:border-box}body{margin:0;font-family:"Nunito Sans",-apple-system,system-ui,sans-serif;background:#fdfaf5;color:#2b2320;line-height:1.7}
header.site{background:#fff;border-bottom:1px solid #f0e6d6;padding:16px 26px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:10}
header.site .brand{font-family:Georgia,serif;font-size:22px;font-weight:700;color:#c8582f}
header.site nav a{color:#5a4b42;text-decoration:none;margin-left:22px;font-size:14px;font-weight:600}
.crumbs{max-width:760px;margin:0 auto;padding:20px 24px 0;font-size:13px;color:#8b7c70}.crumbs a{color:#8b7c70;text-decoration:none}
main{max-width:760px;margin:0 auto;padding:24px 24px 40px}
.kicker{color:#c8582f;font-size:12px;text-transform:uppercase;letter-spacing:.16em;font-weight:800;margin-bottom:12px}
h1{font-family:Georgia,serif;font-size:42px;line-height:1.15;margin:0 0 14px;color:#2b2320}
.byline{display:flex;gap:14px;align-items:center;padding:16px 0;border-top:1px solid #f0e6d6;border-bottom:1px solid #f0e6d6;margin:22px 0;font-size:14px;color:#5a4b42}
.byline .avatar{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#e8a87c,#c8582f)}
.stars{color:#e0a020;margin-left:auto;font-size:14px;letter-spacing:1px}.stars b{color:#2b2320;margin-left:6px}
.recipe-meta{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;background:#fff;border:1px solid #f0e6d6;border-radius:14px;padding:18px;margin:20px 0}
.rm-item{text-align:center;padding:8px}.rm-item .lbl{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#8b7c70;margin-bottom:4px;font-weight:700}
.rm-item .val{font-family:Georgia,serif;font-size:22px;font-weight:700;color:#c8582f}
.pill{background:#fff5ea;color:#c8582f;padding:5px 12px;border-radius:99px;font-size:12px;font-weight:700;display:inline-block;margin-right:6px;margin-bottom:6px}
p{font-size:17px;margin:0 0 18px}p.lead{font-size:19px;color:#5a4b42;font-style:italic}
h2{font-family:Georgia,serif;font-size:26px;margin:36px 0 14px;color:#2b2320;border-left:4px solid #c8582f;padding-left:14px}
.ingredients{background:#fff;border:2px solid #c8582f;border-radius:14px;padding:24px;margin:26px 0}
.ingredients h3{margin:0 0 14px;color:#c8582f;font-family:Georgia,serif;font-size:22px}
.ingredients ul{list-style:none;padding:0;margin:0;columns:2;column-gap:32px}
.ingredients li{padding:6px 0;font-size:15px;break-inside:avoid;position:relative;padding-left:22px}
.ingredients li::before{content:"✓";color:#c8582f;font-weight:700;position:absolute;left:0}
.steps ol{padding-left:0;list-style:none;counter-reset:step}
.steps li{counter-increment:step;padding:14px 0 14px 46px;position:relative;border-bottom:1px solid #f5edd8;font-size:16px}
.steps li::before{content:counter(step);position:absolute;left:0;top:12px;background:#c8582f;color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px}
.pro-tip{background:linear-gradient(135deg,#fff5ea,#ffe8d1);border-left:5px solid #c8582f;padding:18px 22px;margin:28px 0;border-radius:0 12px 12px 0;font-size:15px}
.pro-tip strong{color:#c8582f;text-transform:uppercase;letter-spacing:.1em;font-size:12px;display:block;margin-bottom:6px}
.share{display:flex;gap:12px;padding:16px 0;color:#8b7c70;font-size:13px;align-items:center}
.share a{width:32px;height:32px;border-radius:50%;background:#fff5ea;color:#c8582f;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}
.author-card{margin:36px 0;padding:22px;background:#fff;border:1px solid #f0e6d6;border-radius:14px;display:flex;gap:16px}
.a-av{width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#e8a87c,#c8582f)}
.a-info h4{margin:0 0 4px}.a-role{color:#8b7c70;font-size:13px;margin-bottom:8px}
.a-info p{font-size:14px;margin:0}
.newsletter{background:linear-gradient(135deg,#c8582f,#a8451f);color:#fff;border-radius:16px;padding:30px;margin:36px 0;text-align:center}
.nl-tag{font-size:12px;letter-spacing:.2em;text-transform:uppercase;font-weight:800;margin-bottom:10px;color:#fff5ea}
.newsletter h3{margin:0 0 8px;font-size:24px;font-family:Georgia,serif}.newsletter p{margin:0 0 18px;font-size:14px;color:#fce6d1}
.nl-row{display:flex;gap:8px;max-width:420px;margin:0 auto}.nl-row input{flex:1;padding:12px 14px;border-radius:99px;border:0;font-size:14px}
.nl-row button{padding:12px 22px;border-radius:99px;background:#2b2320;color:#fff;border:0;font-weight:700;cursor:pointer}
.nl-fine{color:#fce6d1;font-size:11px;margin-top:10px}
.related{margin:44px 0 0;padding-top:32px;border-top:2px solid #f0e6d6}
.related h3{font-family:Georgia,serif;font-size:22px;margin-bottom:20px;color:#c8582f}
.rp-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}
.rp-card{display:block;text-decoration:none;color:inherit;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #f0e6d6}
.rp-thumb{width:100%;aspect-ratio:4/3;position:relative}
.rp-tag{position:absolute;top:10px;left:10px;background:#fff;color:#c8582f;padding:4px 10px;border-radius:99px;font-size:11px;font-weight:700}
.rp-card h4{margin:12px 14px 4px;font-family:Georgia,serif;font-size:16px;line-height:1.3}
.rp-meta{color:#8b7c70;font-size:12px;margin:0 14px 14px}
.comments{margin:44px 0 0;padding-top:32px;border-top:2px solid #f0e6d6}
.comments h3{font-family:Georgia,serif;font-size:22px;margin-bottom:20px}
.comment{display:flex;gap:12px;margin-bottom:18px;padding-bottom:18px;border-bottom:1px solid #f5edd8}
.c-avatar{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#e8a87c,#c8582f)}
.c-head{font-size:13px;margin-bottom:4px}.c-head span{color:#8b7c70;margin-left:6px;font-size:12px}
.comment p{font-size:14px;margin:0}
.c-more{color:#c8582f;font-weight:700;font-size:13px;margin-top:10px}
.site-foot{background:#2b2320;color:#d9c9b8;padding:40px 24px 24px;margin-top:50px}
.sf-inner{max-width:960px;margin:0 auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:32px}
.sf-brand strong{color:#c8582f;display:block;font-family:Georgia,serif;font-size:20px;margin-bottom:6px}.sf-brand div{font-size:13px;max-width:250px}
.sf-col h5{margin:0 0 10px;font-size:11px;text-transform:uppercase;letter-spacing:.16em;color:#c8582f;font-weight:800}
.sf-col a{display:block;color:#d9c9b8;text-decoration:none;font-size:13px;padding:3px 0}
.sf-legal{max-width:960px;margin:28px auto 0;padding-top:18px;border-top:1px solid #4a3d34;font-size:12px;text-align:center;color:#8b7c70}
@media(max-width:720px){.rp-grid,.recipe-meta{grid-template-columns:1fr}.ingredients ul{columns:1}.sf-inner{grid-template-columns:1fr 1fr}h1{font-size:32px}}
</style></head>
<body>
<header class="site"><div class="brand">The Weeknight Kitchen 🍅</div><nav><a href="#">Recipes</a><a href="#">Meal Plans</a><a href="#">Techniques</a><a href="#">About</a></nav></header>
<div class="crumbs"><a href="#">Home</a> / <a href="#">Recipes</a> / <a href="#">Weeknight</a> / ${escapeHtml(lead.title)}</div>
<main>
  <div class="kicker">Weeknight Dinner · Under an Hour</div>
  <h1>${escapeHtml(lead.title)}</h1>
  <div class="byline"><span class="avatar"></span><div><div>By <strong>${escapeHtml(author.name)}</strong></div><div style="font-size:12px;color:#8b7c70">Updated ${formatDate(iso)} · ${readMin} min read</div></div><div class="stars">★★★★★ <b>${rating}</b> <span style="color:#8b7c70;font-weight:400">(${votes})</span></div></div>
  <div>${["Vegetarian friendly","Quick","One pot","Family favorite","Batch cook"].slice(0, 3 + Math.floor(rnd() * 2)).map(t => `<span class="pill">${t}</span>`).join("")}</div>
  <div class="recipe-meta">
    <div class="rm-item"><div class="lbl">Prep</div><div class="val">${prepMin} min</div></div>
    <div class="rm-item"><div class="lbl">Cook</div><div class="val">${cookMin} min</div></div>
    <div class="rm-item"><div class="lbl">Total</div><div class="val">${prepMin + cookMin} min</div></div>
    <div class="rm-item"><div class="lbl">Serves</div><div class="val">${servings}</div></div>
  </div>
  ${socialShareBar()}
  ${paragraphsHtml(lead.body.split(/\n\n/).slice(0, 2).join("\n\n"), { dropCap: false, leadClass: "lead" })}
  <div class="ingredients">
    <h3>What you'll need</h3>
    <ul>
      <li>2 tbsp good olive oil</li><li>1 large yellow onion, sliced thin</li><li>3 cloves garlic, smashed</li><li>1 tsp kosher salt, plus more to taste</li>
      <li>½ tsp black pepper, freshly ground</li><li>1 cup dry short-grain rice</li><li>2 ½ cups vegetable broth, warm</li><li>1 bay leaf</li>
      <li>Zest of 1 lemon</li><li>2 tbsp unsalted butter</li><li>Small handful fresh parsley, chopped</li><li>Parmesan, to finish</li>
    </ul>
  </div>
  <h2>How to make it</h2>
  <div class="steps"><ol>
    <li>Warm the olive oil in a wide, heavy pan over medium heat. Add the onion with a pinch of salt and cook until soft and translucent, about 6–8 minutes. Do not rush this — the sweetness of the onion is the base of everything.</li>
    <li>Add the garlic and stir for 30 seconds until fragrant. Pour in the rice and stir to coat every grain in the fat. Toast for 2 minutes.</li>
    <li>Add the warm broth, one ladle at a time, stirring often. Wait for each addition to absorb before adding the next. This takes about 18 minutes and cannot be hurried.</li>
    <li>When the rice is tender but still has a slight bite, remove from the heat. Stir in the butter, lemon zest, and half the parsley. Taste and adjust salt.</li>
    <li>Serve immediately in warm bowls with parmesan grated over the top and the remaining parsley scattered.</li>
  </ol></div>
  <div class="pro-tip"><strong>Chef's tip</strong>${escapeHtml(a.body.split(/\n\n/)[0].slice(0, 200))}</div>
  <h2>Why this recipe works</h2>
  ${paragraphsHtml(b.body.split(/\n\n/).slice(0, 2).join("\n\n"))}
  <h2>Make it your own</h2>
  ${paragraphsHtml(c.body.split(/\n\n/).slice(0, 2).join("\n\n"))}
  <div class="author-card"><div class="a-av"></div><div class="a-info"><h4>${escapeHtml(author.name)}</h4><div class="a-role">Recipe developer · The Weeknight Kitchen</div><p>${escapeHtml(author.bio)}</p></div></div>
  ${newsletterCta("The Weeknight Kitchen", "One tested weeknight recipe every Sunday. Real food for real weekday nights.")}
  <section class="related"><h3>You might also like</h3><div class="rp-grid">${relatedGrid([d, e, f, g], "#c8582f")}</div></section>
  ${commentsBlock(38 + Math.floor(rnd() * 220))}
</main>
${footerSitemap("The Weeknight Kitchen", year, [{ section: "Recipes", items: ["Weeknight", "One Pot", "Vegetarian", "30-Minute"] }, { section: "Learn", items: ["Techniques", "Meal Prep", "Substitutions", "Equipment"] }, { section: "About", items: ["Our story", "Contact", "Press", "RSS"] }])}
</body></html>`;
}

// ================ NEW TEMPLATE 2: Photo Journal ================
function tmplPhotoJournal(p: Snip[], year: number): string {
  const [lead, a, b, c, d, e, f, g] = p;
  const author = pickAuthor();
  const iso = recentIsoDate();
  const readMin = READ_MINS();
  return `<!doctype html><html lang="en"><head>${siteHead({ siteName: "Frame & Field", siteHost: "frameandfield.co", section: "Photography", title: lead.title, description: lead.body.slice(0, 155).replace(/\n/g, " "), author: author.name, publishedIso: iso, themeColor: "#0f1614", faviconEmoji: "📷" })}
<style>*{box-sizing:border-box}body{margin:0;font-family:"Inter",-apple-system,system-ui,sans-serif;background:#0f1614;color:#e8e6df;line-height:1.7}
header.site{padding:20px 30px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #1e2a26;position:sticky;top:0;background:rgba(15,22,20,.95);z-index:10;backdrop-filter:blur(8px)}
header.site .brand{font-family:"Playfair Display",Georgia,serif;font-size:24px;letter-spacing:.02em}
header.site nav a{color:#a4b0ab;text-decoration:none;margin-left:22px;font-size:13px;text-transform:uppercase;letter-spacing:.15em}
.crumbs{max-width:820px;margin:0 auto;padding:22px 24px 0;font-size:12px;color:#6b7772;letter-spacing:.1em;text-transform:uppercase}.crumbs a{color:#6b7772;text-decoration:none}
.hero-img{width:100%;height:420px;background:linear-gradient(135deg,#243530 0%,#3a5148 50%,#1e2a26 100%);position:relative;margin-top:20px}
.hero-img::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 30% 40%,rgba(200,180,140,.15),transparent 60%)}
.caption{max-width:820px;margin:12px auto 0;padding:0 24px;font-size:12px;color:#6b7772;font-style:italic;letter-spacing:.02em}
main{max-width:720px;margin:0 auto;padding:36px 24px 40px}
.kicker{color:#c8a870;font-size:11px;text-transform:uppercase;letter-spacing:.28em;font-weight:600;margin-bottom:16px}
h1{font-family:"Playfair Display",Georgia,serif;font-size:44px;line-height:1.15;margin:0 0 14px;font-weight:500;color:#f5f2e8}
.subtitle{font-size:18px;color:#a4b0ab;font-style:italic;line-height:1.55;margin-bottom:26px}
.byline{display:flex;gap:14px;align-items:center;padding:18px 0;border-top:1px solid #1e2a26;border-bottom:1px solid #1e2a26;margin:22px 0;font-size:14px;color:#a4b0ab}
.byline .avatar{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#c8a870,#8b7040)}
.byline strong{color:#f5f2e8}
.share{display:flex;gap:12px;padding:14px 0 26px;color:#6b7772;font-size:12px;align-items:center;letter-spacing:.1em;text-transform:uppercase}
.share a{width:34px;height:34px;border-radius:50%;background:#1e2a26;color:#c8a870;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;font-size:14px}
p{font-size:17px;margin:0 0 20px;color:#d5d3cb}
p.lead::first-letter{font-family:"Playfair Display",Georgia,serif;font-size:4.5em;float:left;line-height:.85;padding:6px 12px 0 0;color:#c8a870}
h2{font-family:"Playfair Display",Georgia,serif;font-size:28px;margin:40px 0 16px;color:#f5f2e8;font-weight:500}
.photo-frame{margin:36px -20px;background:#1a2320;border:1px solid #2a3833;border-radius:4px;overflow:hidden}
.photo-frame .img{width:100%;height:340px;background:linear-gradient(160deg,#3a5148,#243530 60%,#0f1614);position:relative}
.photo-frame .img::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 70% 30%,rgba(200,168,112,.2),transparent 65%)}
.photo-frame .cap{padding:14px 20px;background:#0f1614;border-top:1px solid #2a3833;font-size:12px;color:#6b7772;font-style:italic;display:flex;justify-content:space-between}
.photo-frame .cap b{color:#c8a870;font-style:normal;font-weight:600;letter-spacing:.08em;text-transform:uppercase;font-size:11px}
.gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:32px 0}
.gallery .thumb{aspect-ratio:1;border-radius:2px;background:linear-gradient(135deg,#243530,#3a5148)}
.gallery .thumb:nth-child(2){background:linear-gradient(135deg,#3a5148,#5c6b60)}
.gallery .thumb:nth-child(3){background:linear-gradient(135deg,#5c6b60,#243530)}
.gallery .thumb:nth-child(4){background:linear-gradient(135deg,#c8a870,#8b7040)}
.gallery .thumb:nth-child(5){background:linear-gradient(135deg,#8b7040,#3a5148)}
.gallery .thumb:nth-child(6){background:linear-gradient(135deg,#243530,#0f1614)}
blockquote{font-family:"Playfair Display",Georgia,serif;font-size:24px;line-height:1.4;color:#c8a870;font-style:italic;border-left:2px solid #c8a870;padding-left:24px;margin:32px 0;font-weight:400}
.author-card{margin:40px 0;padding:26px;background:#1a2320;border:1px solid #2a3833;border-radius:6px;display:flex;gap:18px}
.a-av{width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#c8a870,#8b7040)}
.a-info h4{margin:0 0 4px;color:#f5f2e8;font-family:"Playfair Display",serif;font-size:18px}
.a-role{color:#c8a870;font-size:11px;letter-spacing:.15em;text-transform:uppercase;margin-bottom:8px}
.a-info p{font-size:14px;margin:0;color:#a4b0ab}
.newsletter{background:linear-gradient(180deg,#1a2320,#0f1614);border:1px solid #2a3833;border-radius:8px;padding:30px;margin:40px 0;text-align:center}
.nl-tag{color:#c8a870;font-size:11px;text-transform:uppercase;letter-spacing:.28em;font-weight:600;margin-bottom:10px}
.newsletter h3{margin:0 0 8px;font-size:24px;font-family:"Playfair Display",serif;color:#f5f2e8;font-weight:500}
.newsletter p{margin:0 0 18px;font-size:14px;color:#a4b0ab}
.nl-row{display:flex;gap:8px;max-width:400px;margin:0 auto}
.nl-row input{flex:1;padding:12px 14px;border-radius:2px;border:1px solid #2a3833;background:#0f1614;color:#f5f2e8;font-size:14px}
.nl-row button{padding:12px 22px;border-radius:2px;background:#c8a870;color:#0f1614;border:0;font-weight:700;cursor:pointer;letter-spacing:.1em;text-transform:uppercase;font-size:12px}
.nl-fine{color:#6b7772;font-size:11px;margin-top:10px}
.related{margin:48px 0 0;padding-top:36px;border-top:1px solid #1e2a26}
.related h3{font-size:11px;letter-spacing:.28em;color:#c8a870;text-transform:uppercase;margin-bottom:22px;font-weight:600}
.rp-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}
.rp-card{display:block;text-decoration:none;color:inherit}
.rp-thumb{width:100%;aspect-ratio:3/2;position:relative;margin-bottom:12px}
.rp-tag{position:absolute;bottom:10px;left:10px;background:rgba(15,22,20,.9);color:#c8a870;padding:3px 10px;font-size:10px;font-weight:600;letter-spacing:.15em;text-transform:uppercase}
.rp-card h4{margin:0 0 6px;font-family:"Playfair Display",serif;font-size:17px;line-height:1.3;color:#f5f2e8;font-weight:500}
.rp-meta{color:#6b7772;font-size:11px;letter-spacing:.08em}
.comments{margin:44px 0 0;padding-top:32px;border-top:1px solid #1e2a26}
.comments h3{font-size:18px;margin-bottom:20px;font-family:"Playfair Display",serif;color:#f5f2e8;font-weight:500}
.comment{display:flex;gap:12px;margin-bottom:18px;padding-bottom:18px;border-bottom:1px solid #1e2a26}
.c-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#c8a870,#8b7040)}
.c-head{font-size:13px;color:#f5f2e8}.c-head span{color:#6b7772;margin-left:6px;font-size:12px}
.comment p{font-size:14px;margin:0;color:#a4b0ab}
.c-more{color:#c8a870;font-weight:600;font-size:12px;margin-top:12px;letter-spacing:.14em;text-transform:uppercase}
.site-foot{background:#0a0f0d;border-top:1px solid #1e2a26;padding:40px 24px 24px;margin-top:60px}
.sf-inner{max-width:960px;margin:0 auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:32px}
.sf-brand strong{display:block;font-family:"Playfair Display",serif;font-size:20px;color:#f5f2e8;margin-bottom:6px}.sf-brand div{color:#6b7772;font-size:13px;max-width:250px}
.sf-col h5{margin:0 0 12px;font-size:11px;letter-spacing:.18em;color:#c8a870;text-transform:uppercase;font-weight:600}
.sf-col a{display:block;color:#a4b0ab;text-decoration:none;font-size:13px;padding:3px 0}
.sf-legal{max-width:960px;margin:28px auto 0;padding-top:18px;border-top:1px solid #1e2a26;color:#6b7772;font-size:11px;text-align:center;letter-spacing:.08em}
@media(max-width:720px){.gallery{grid-template-columns:1fr 1fr}.rp-grid{grid-template-columns:1fr}.sf-inner{grid-template-columns:1fr 1fr}.hero-img{height:280px}h1{font-size:32px}}
</style></head>
<body>
<header class="site"><div class="brand">Frame & Field</div><nav><a href="#">Essays</a><a href="#">Portfolios</a><a href="#">Interviews</a><a href="#">Print</a></nav></header>
<div class="crumbs"><a href="#">Home</a> · <a href="#">Essays</a> · Field Study</div>
<div class="hero-img"></div>
<div class="caption">Cover photograph · ${escapeHtml(author.name)}, ${new Date(iso).getFullYear()}</div>
<main>
  <div class="kicker">Field Study · Vol. ${8 + Math.floor(rnd() * 30)}</div>
  <h1>${escapeHtml(lead.title)}</h1>
  <div class="subtitle">${escapeHtml(a.body.split(/\n\n/)[0].slice(0, 150))}…</div>
  <div class="byline"><span class="avatar"></span><div>By <strong>${escapeHtml(author.name)}</strong> · ${formatDate(iso)} · ${readMin} min read</div></div>
  ${socialShareBar()}
  ${paragraphsHtml(lead.body.split(/\n\n/).slice(0, 2).join("\n\n"), { dropCap: true, leadClass: "lead" })}
  <div class="photo-frame"><div class="img"></div><div class="cap"><span>Untitled study, 2024. Silver gelatin print.</span><b>Plate I</b></div></div>
  ${paragraphsHtml(a.body.split(/\n\n/).slice(0, 2).join("\n\n"))}
  <blockquote>${escapeHtml(b.body.split(/\n\n/)[0].slice(0, 180))}</blockquote>
  ${paragraphsHtml(c.body.split(/\n\n/).slice(0, 2).join("\n\n"))}
  <h2>Selected frames</h2>
  <div class="gallery"><div class="thumb"></div><div class="thumb"></div><div class="thumb"></div><div class="thumb"></div><div class="thumb"></div><div class="thumb"></div></div>
  <p style="text-align:center;color:#6b7772;font-size:12px;font-style:italic;margin-top:-8px">Six frames from the ongoing series. Prints available in the studio.</p>
  <h2>On making the work</h2>
  ${paragraphsHtml(d.body.split(/\n\n/).slice(0, 2).join("\n\n"))}
  <div class="author-card"><div class="a-av"></div><div class="a-info"><h4>${escapeHtml(author.name)}</h4><div class="a-role">Photographer · Contributor</div><p>${escapeHtml(author.bio)}</p></div></div>
  ${newsletterCta("Frame & Field", "A monthly letter on making pictures. New essays, portfolio updates, print releases.")}
  <section class="related"><h3>Further Reading</h3><div class="rp-grid">${relatedGrid([e, f, g, b], "#c8a870")}</div></section>
  ${commentsBlock(24 + Math.floor(rnd() * 130))}
</main>
${footerSitemap("Frame & Field", year, [{ section: "Read", items: ["Essays", "Portfolios", "Interviews", "Archive"] }, { section: "Shop", items: ["Prints", "Books", "Zines", "Editions"] }, { section: "About", items: ["Studio", "Contact", "Press", "Newsletter"] }])}
</body></html>`;
}

// ================ NEW TEMPLATE 3: Book Review (The Margin) ================
function tmplBookReview(p: Snip[], year: number): string {
  const [lead, a, b, c, d, e, f, g] = p;
  const author = pickAuthor();
  const iso = recentIsoDate();
  const readMin = READ_MINS();
  const rating = 3 + Math.floor(rnd() * 3);
  const bookTitle = lead.title;
  return `<!doctype html><html lang="en"><head>${siteHead({ siteName: "The Margin", siteHost: "themargin.press", section: "Reviews", title: `Review: ${bookTitle}`, description: lead.body.slice(0, 155).replace(/\n/g, " "), author: author.name, publishedIso: iso, themeColor: "#5c1f1f", faviconEmoji: "📚" })}
<style>*{box-sizing:border-box}body{margin:0;font-family:"Lora","Iowan Old Style",Georgia,serif;background:#f7f2ea;color:#2a1e1e;line-height:1.8}
header.site{background:#5c1f1f;color:#f7f2ea;padding:16px 30px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:10}
header.site .brand{font-family:"Playfair Display",Georgia,serif;font-size:24px;font-style:italic;font-weight:600}
header.site nav a{color:#e8d8b8;text-decoration:none;margin-left:22px;font-size:13px;letter-spacing:.06em;text-transform:uppercase}
.crumbs{max-width:800px;margin:0 auto;padding:22px 24px 0;font-size:12px;color:#8b6060;letter-spacing:.06em;text-transform:uppercase;font-family:"Inter",sans-serif}.crumbs a{color:#8b6060;text-decoration:none}
.hero{max-width:800px;margin:0 auto;padding:32px 24px 12px;display:grid;grid-template-columns:180px 1fr;gap:36px;align-items:center}
.book-cover{aspect-ratio:2/3;background:linear-gradient(135deg,#8b3030,#5c1f1f);border-radius:2px;box-shadow:0 12px 32px rgba(92,31,31,.25);position:relative;display:flex;align-items:center;justify-content:center;padding:20px;text-align:center}
.book-cover::before{content:"";position:absolute;left:6px;top:6px;bottom:6px;width:2px;background:rgba(255,255,255,.15)}
.book-cover .bc-inner{color:#e8d8b8;font-family:"Playfair Display",serif;font-size:20px;line-height:1.2;font-style:italic}
.book-cover .bc-author{position:absolute;bottom:16px;left:0;right:0;font-size:11px;letter-spacing:.2em;text-transform:uppercase;font-style:normal;color:#c8a870;font-family:"Inter",sans-serif}
.hero-meta .kicker{font-family:"Inter",sans-serif;color:#5c1f1f;font-size:11px;letter-spacing:.24em;text-transform:uppercase;font-weight:700;margin-bottom:12px}
.hero-meta h1{font-family:"Playfair Display",Georgia,serif;font-size:38px;line-height:1.15;margin:0 0 12px;font-weight:500;letter-spacing:-.01em}
.hero-meta .book-info{color:#6b4a4a;font-size:14px;line-height:1.6;margin-bottom:14px}
.hero-meta .book-info b{color:#2a1e1e}
.rating{display:flex;gap:6px;align-items:center;margin-bottom:8px}
.rating .stars{color:#c89020;font-size:20px;letter-spacing:2px}.rating .txt{font-family:"Inter",sans-serif;font-size:12px;color:#6b4a4a;letter-spacing:.06em;text-transform:uppercase;font-weight:600}
main{max-width:720px;margin:0 auto;padding:20px 24px 40px}
.byline{display:flex;gap:14px;align-items:center;padding:20px 0;border-top:1px solid #e5d8c4;border-bottom:1px solid #e5d8c4;margin:22px 0;font-size:14px;color:#6b4a4a}
.byline .avatar{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#c89020,#5c1f1f)}
.byline strong{color:#2a1e1e}
.share{display:flex;gap:12px;padding:14px 0 22px;color:#8b6060;font-size:12px;align-items:center;letter-spacing:.08em;text-transform:uppercase;font-family:"Inter",sans-serif}
.share a{width:34px;height:34px;border-radius:50%;background:#efe4d0;color:#5c1f1f;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;font-size:14px}
p{font-size:18px;margin:0 0 22px}
p.lead{font-size:22px;color:#4a3838;font-style:italic;line-height:1.55}
p.lead::first-letter{font-family:"Playfair Display",serif;font-size:5em;float:left;line-height:.85;padding:8px 14px 0 0;color:#5c1f1f;font-style:normal}
h2{font-family:"Playfair Display",Georgia,serif;font-size:28px;margin:44px 0 16px;color:#2a1e1e;font-weight:500;font-style:italic}
h2::before{content:"§ ";color:#c89020;font-style:normal}
blockquote{font-family:"Playfair Display",Georgia,serif;font-size:22px;line-height:1.5;color:#5c1f1f;font-style:italic;padding:20px 28px;margin:32px -8px;background:#efe4d0;border-radius:2px;position:relative}
blockquote::before{content:"“";position:absolute;left:8px;top:-14px;font-size:64px;color:#c89020;font-family:Georgia,serif}
.verdict{background:linear-gradient(135deg,#5c1f1f,#8b3030);color:#f7f2ea;border-radius:4px;padding:24px 28px;margin:36px 0}
.verdict .lbl{font-family:"Inter",sans-serif;font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:#c89020;font-weight:700;margin-bottom:10px}
.verdict p{font-family:"Playfair Display",serif;font-size:20px;font-style:italic;margin:0;line-height:1.45}
.pros-cons{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:32px 0}
.pc-col{padding:20px;border-radius:4px;background:#fff;border:1px solid #e5d8c4}
.pc-col h4{margin:0 0 10px;font-family:"Inter",sans-serif;font-size:11px;letter-spacing:.2em;text-transform:uppercase;font-weight:700}
.pc-col.pro h4{color:#4a7040}.pc-col.con h4{color:#8b3030}
.pc-col ul{padding-left:18px;margin:0;font-size:14px;line-height:1.6}.pc-col li{margin-bottom:6px}
.author-card{margin:40px 0;padding:24px;background:#fff;border:1px solid #e5d8c4;border-radius:4px;display:flex;gap:18px}
.a-av{width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#c89020,#5c1f1f)}
.a-info h4{margin:0 0 4px;font-family:"Playfair Display",serif;font-size:20px}
.a-role{color:#8b6060;font-size:11px;letter-spacing:.18em;text-transform:uppercase;font-family:"Inter",sans-serif;margin-bottom:8px}
.a-info p{font-size:14px;margin:0;color:#6b4a4a}
.newsletter{background:#2a1e1e;color:#f7f2ea;border-radius:4px;padding:32px;margin:40px 0;text-align:center}
.nl-tag{color:#c89020;font-size:11px;letter-spacing:.28em;text-transform:uppercase;font-weight:700;margin-bottom:10px;font-family:"Inter",sans-serif}
.newsletter h3{margin:0 0 8px;font-family:"Playfair Display",serif;font-size:26px;font-style:italic;color:#f7f2ea;font-weight:500}
.newsletter p{margin:0 0 18px;font-size:14px;color:#c8a880}
.nl-row{display:flex;gap:8px;max-width:400px;margin:0 auto}
.nl-row input{flex:1;padding:12px 14px;border:0;background:#f7f2ea;color:#2a1e1e;font-size:14px;font-family:inherit}
.nl-row button{padding:12px 22px;background:#c89020;color:#2a1e1e;border:0;font-weight:700;cursor:pointer;letter-spacing:.1em;text-transform:uppercase;font-size:12px;font-family:"Inter",sans-serif}
.nl-fine{color:#8b6060;font-size:11px;margin-top:10px;font-family:"Inter",sans-serif}
.related{margin:48px 0 0;padding-top:36px;border-top:2px solid #e5d8c4}
.related h3{font-family:"Playfair Display",serif;font-size:22px;font-style:italic;margin-bottom:20px;color:#5c1f1f}
.rp-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}
.rp-card{display:block;text-decoration:none;color:inherit;padding:16px;border:1px solid #e5d8c4;border-radius:4px;background:#fff}
.rp-thumb{width:60px;height:88px;background:linear-gradient(135deg,#8b3030,#5c1f1f);border-radius:2px;float:left;margin-right:12px;position:relative}
.rp-tag{position:absolute;bottom:-6px;left:0;background:#c89020;color:#2a1e1e;padding:2px 6px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}
.rp-card h4{margin:0 0 6px;font-family:"Playfair Display",serif;font-size:16px;line-height:1.3}
.rp-meta{color:#8b6060;font-size:12px;font-family:"Inter",sans-serif}
.comments{margin:44px 0 0;padding-top:32px;border-top:2px solid #e5d8c4}
.comments h3{font-family:"Playfair Display",serif;font-size:22px;font-style:italic;margin-bottom:20px}
.comment{display:flex;gap:12px;margin-bottom:18px;padding-bottom:18px;border-bottom:1px solid #e5d8c4}
.c-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#c89020,#5c1f1f)}
.c-head{font-size:13px}.c-head span{color:#8b6060;margin-left:6px;font-size:12px}
.comment p{font-size:15px;margin:0;font-family:"Lora",Georgia,serif}
.c-more{color:#5c1f1f;font-weight:700;font-size:12px;margin-top:12px;letter-spacing:.14em;text-transform:uppercase;font-family:"Inter",sans-serif}
.site-foot{background:#2a1e1e;color:#c8a880;padding:40px 24px 24px;margin-top:60px;font-family:"Inter",sans-serif}
.sf-inner{max-width:960px;margin:0 auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:32px}
.sf-brand strong{display:block;font-family:"Playfair Display",serif;font-size:22px;color:#c89020;margin-bottom:6px;font-style:italic;font-weight:500}.sf-brand div{color:#8b6060;font-size:13px;max-width:250px;font-family:"Lora",serif}
.sf-col h5{margin:0 0 12px;font-size:11px;letter-spacing:.18em;color:#c89020;text-transform:uppercase;font-weight:700}
.sf-col a{display:block;color:#c8a880;text-decoration:none;font-size:13px;padding:3px 0}
.sf-legal{max-width:960px;margin:28px auto 0;padding-top:18px;border-top:1px solid #4a3838;color:#8b6060;font-size:11px;text-align:center;letter-spacing:.08em}
@media(max-width:720px){.hero{grid-template-columns:120px 1fr;gap:20px}.pros-cons,.rp-grid{grid-template-columns:1fr}.sf-inner{grid-template-columns:1fr 1fr}.hero-meta h1{font-size:28px}}
</style></head>
<body>
<header class="site"><div class="brand">The Margin</div><nav><a href="#">Reviews</a><a href="#">Essays</a><a href="#">Interviews</a><a href="#">Archive</a></nav></header>
<div class="crumbs"><a href="#">Home</a> · <a href="#">Reviews</a> · <a href="#">Non-fiction</a></div>
<div class="hero">
  <div class="book-cover"><div class="bc-inner">${escapeHtml(bookTitle.slice(0, 40))}</div><div class="bc-author">${escapeHtml(pickAuthor().name)}</div></div>
  <div class="hero-meta">
    <div class="kicker">Book Review · Non-fiction</div>
    <h1>${escapeHtml(bookTitle)}</h1>
    <div class="book-info"><b>By ${escapeHtml(pickAuthor().name)}</b> · Independent Press · ${240 + Math.floor(rnd() * 200)} pages · £${12 + Math.floor(rnd() * 8)}.99</div>
    <div class="rating"><span class="stars">${"★".repeat(rating)}${"☆".repeat(5 - rating)}</span><span class="txt">${rating}/5 · Highly recommended</span></div>
  </div>
</div>
<main>
  <div class="byline"><span class="avatar"></span><div>Reviewed by <strong>${escapeHtml(author.name)}</strong> · ${formatDate(iso)} · ${readMin} min read</div></div>
  ${socialShareBar()}
  ${paragraphsHtml(lead.body.split(/\n\n/).slice(0, 1).join("\n\n"), { dropCap: false, leadClass: "lead" })}
  ${paragraphsHtml(a.body.split(/\n\n/).slice(0, 2).join("\n\n"))}
  <blockquote>${escapeHtml(b.body.split(/\n\n/)[0].slice(0, 170))}</blockquote>
  <h2>What works</h2>
  ${paragraphsHtml(b.body.split(/\n\n/).slice(1, 3).join("\n\n") || c.body.split(/\n\n/).slice(0, 2).join("\n\n"))}
  <h2>Where it stumbles</h2>
  ${paragraphsHtml(c.body.split(/\n\n/).slice(0, 2).join("\n\n"))}
  <div class="pros-cons">
    <div class="pc-col pro"><h4>Strengths</h4><ul><li>Clear-eyed prose without decoration</li><li>Structural discipline throughout</li><li>Rare emotional restraint on a big subject</li></ul></div>
    <div class="pc-col con"><h4>Weaknesses</h4><ul><li>Middle chapters lose some momentum</li><li>A few arguments feel underdeveloped</li></ul></div>
  </div>
  <h2>The verdict</h2>
  ${paragraphsHtml(d.body.split(/\n\n/).slice(0, 2).join("\n\n"))}
  <div class="verdict"><div class="lbl">The Margin says</div><p>“A patient, quietly ambitious book that rewards the reader who slows down. Among the best non-fiction of the year.”</p></div>
  <div class="author-card"><div class="a-av"></div><div class="a-info"><h4>${escapeHtml(author.name)}</h4><div class="a-role">Senior Reviewer · The Margin</div><p>${escapeHtml(author.bio)}</p></div></div>
  ${newsletterCta("The Margin", "A weekly review letter. One book, unhurried. Read by 24,000 patient readers.")}
  <section class="related"><h3>More reviews</h3><div class="rp-grid">${relatedGrid([e, f, g, b], "#5c1f1f")}</div></section>
  ${commentsBlock(28 + Math.floor(rnd() * 140))}
</main>
${footerSitemap("The Margin", year, [{ section: "Read", items: ["Reviews", "Essays", "Interviews", "Longreads"] }, { section: "Subjects", items: ["Non-fiction", "Fiction", "Poetry", "Criticism"] }, { section: "About", items: ["Editors", "Contact", "Submissions", "Newsletter"] }])}
</body></html>`;
}
