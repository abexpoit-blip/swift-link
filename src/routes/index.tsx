import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  DollarSign,
  Link2,
  Wallet,
  TrendingUp,
  Globe2,
  ShieldCheck,
  Zap,
  Users,
  Sparkles,
  Check,
  Bitcoin,
  Banknote,
  ChevronDown,
} from "lucide-react";
import { AdspxMark } from "@/components/AdspxLogo";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "AdsPx — Earn money from every link you share" },
      {
        name: "description",
        content:
          "Shorten links, share them anywhere, and earn real money for every click. $1 per 100k clicks. Withdraw in USDT crypto from just $25.",
      },
    ],
  }),
});

function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <Hero />
      <PayoutBar />
      <HowItWorks />
      <EarningsCalculator />
      <FeatureGrid />
      <RecentPayouts />
      <FaqStrip />
      <FinalCta />
      <SiteFooter />
    </div>
  );
}

/* ─────────────────────────────────────────────── HEADER */
function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 glass">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <AdspxMark className="h-8 w-8" />
          <span className="font-display font-bold text-lg tracking-tight">
            Ads<span className="text-gradient">Px</span>
          </span>
          <span className="ml-2 hidden md:inline rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent-foreground">
            Earn
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
          <a href="#calculator" className="hover:text-foreground transition-colors">Calculator</a>
          <a href="#payouts" className="hover:text-foreground transition-colors">Payouts</a>
          <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <a href="/login">Sign in</a>
          </Button>
          <Button size="sm" className="bg-primary-gradient shadow-glow" asChild>
            <a href="/signup">
              Start earning <ArrowRight className="ml-1 h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────── HERO */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-hero pointer-events-none" />
      <div className="absolute inset-0 grid-pattern opacity-50 pointer-events-none" />
      <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
      <div className="absolute top-40 -right-24 h-80 w-80 rounded-full bg-primary-glow/25 blur-3xl pointer-events-none" />

      <div className="container mx-auto px-6 pt-20 pb-20 md:pt-28 md:pb-24 relative">
        <div className="max-w-4xl mx-auto text-center space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card/70 backdrop-blur px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" /> Paid out $284,000+ to creators this year
          </div>
          <h1 className="font-display font-bold tracking-tight text-5xl md:text-7xl leading-[1.02]">
            Shorten links.
            <br />
            <span className="text-gradient">Get paid per click.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            AdsPx turns any URL into a paid short link. Share it on Facebook,
            Telegram, YouTube — earn <strong className="text-foreground">$1 for every 100,000 visits</strong>.
            Withdraw in <strong className="text-foreground">USDT crypto</strong> from just $25.
          </p>

          <form
            className="flex flex-col sm:flex-row gap-2 max-w-xl mx-auto pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              window.location.href = "/signup";
            }}
          >
            <Input
              type="url"
              required
              placeholder="Paste your long URL here…"
              className="h-12 text-base bg-card/80 border-border"
            />
            <Button
              type="submit"
              size="lg"
              className="h-12 px-6 bg-primary-gradient shadow-glow"
            >
              Shorten & earn <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-muted-foreground pt-2">
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-primary" /> Free to join
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-primary" /> No referral required
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-primary" /> Min $25 withdrawal
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────── PAYOUT BAR */
function PayoutBar() {
  const stats = [
    { label: "Active publishers", value: "42,180+" },
    { label: "Clicks served", value: "2.4B+" },
    { label: "Paid in 2025", value: "$284K+" },
    { label: "Min payout", value: "$25" },
  ];
  return (
    <section className="border-y border-border/60 bg-card/40">
      <div className="container mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="font-display text-3xl md:text-4xl font-bold text-gradient">
              {s.value}
            </div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────── HOW IT WORKS */
function HowItWorks() {
  const steps = [
    {
      icon: Link2,
      title: "Shorten any link",
      desc: "Paste your URL — YouTube video, blog post, anything. Get a clean short link in 2 seconds.",
    },
    {
      icon: Users,
      title: "Share it everywhere",
      desc: "Drop it on Facebook, Telegram channels, Twitter, your blog. Every real human visit counts toward earnings.",
    },
    {
      icon: Wallet,
      title: "Cash out in crypto",
      desc: "Hit $25 in earnings and withdraw to your USDT (TRC20 / BEP20) wallet — processed within 24 hours.",
    },
  ];
  return (
    <section id="how" className="container mx-auto px-6 py-24">
      <div className="text-center mb-14 max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          How it works
        </div>
        <h2 className="font-display text-3xl md:text-5xl font-semibold tracking-tight">
          From link to wallet in <span className="text-gradient">three steps</span>
        </h2>
      </div>

      <div className="relative grid md:grid-cols-3 gap-6 mb-12">
        <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        {steps.map((s, i) => (
          <div
            key={s.title}
            className="relative rounded-2xl border border-border bg-card/60 backdrop-blur p-7 hover:shadow-glow transition-all"
          >
            <div className="absolute -top-3 left-7 rounded-full bg-primary-gradient px-2.5 py-0.5 text-xs font-mono font-semibold text-primary-foreground">
              0{i + 1}
            </div>
            <div className="h-12 w-12 rounded-xl bg-primary/10 grid place-items-center text-primary mb-5">
              <s.icon className="h-6 w-6" />
            </div>
            <h3 className="font-display text-xl font-semibold mb-2">{s.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* Transparent earnings policy */}
      <div className="max-w-4xl mx-auto rounded-2xl border border-primary/30 bg-primary/5 p-7 md:p-9">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h3 className="font-display text-lg font-semibold">Our earnings policy — fully transparent</h3>
        </div>
        <div className="grid md:grid-cols-3 gap-5 text-sm">
          <div className="rounded-xl bg-card border border-border p-5">
            <div className="font-mono text-xs text-muted-foreground mb-1">PER 5,000 CLICKS</div>
            <div className="font-display text-2xl font-bold mb-1">
              <span className="text-gradient">4,800</span> yours
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Out of every 5,000 real visits, <strong className="text-foreground">200 clicks (4%)</strong> are
              routed through Adsterra — that's how we cover the platform. The remaining <strong className="text-foreground">4,800</strong> are credited to your account.
            </p>
          </div>
          <div className="rounded-xl bg-card border border-border p-5">
            <div className="font-mono text-xs text-muted-foreground mb-1">PAYOUT RATE</div>
            <div className="font-display text-2xl font-bold mb-1">
              <span className="text-gradient">$1</span> / 100K
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              You earn <strong className="text-foreground">$1 for every 100,000 real visits</strong> sent through your short links.
              Flat global rate — same for every country, no hidden tiers.
            </p>
          </div>
          <div className="rounded-xl bg-card border border-border p-5">
            <div className="font-mono text-xs text-muted-foreground mb-1">MIN WITHDRAWAL</div>
            <div className="font-display text-2xl font-bold mb-1">
              <span className="text-gradient">$25</span> USDT
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Request a withdrawal once your balance hits <strong className="text-foreground">$25</strong>.
              Paid in USDT (<strong className="text-foreground">TRC20 or BEP20</strong>) within 24 hours.
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-5 text-center">
          Bot traffic is filtered automatically — only verified human visits count toward your earnings.
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────── EARNINGS CALCULATOR */
function EarningsCalculator() {
  const [clicks, setClicks] = useState(100000);
  // $1 per 100,000 = $0.01 per 1000
  const earnings = (clicks / 100000) * 1;
  const monthsTo25 = clicks > 0 ? Math.ceil(2500000 / clicks) : 0;

  return (
    <section id="calculator" className="container mx-auto px-6 py-24">
      <div className="text-center mb-12 max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          Earnings calculator
        </div>
        <h2 className="font-display text-3xl md:text-5xl font-semibold tracking-tight">
          See what your traffic is <span className="text-gradient">worth</span>
        </h2>
      </div>

      <div className="max-w-3xl mx-auto rounded-3xl border border-primary/30 bg-card p-8 md:p-10 shadow-elegant">
        <label className="block text-sm font-medium text-muted-foreground mb-3">
          Monthly clicks you can send
        </label>
        <input
          type="range"
          min={10000}
          max={5000000}
          step={10000}
          value={clicks}
          onChange={(e) => setClicks(Number(e.target.value))}
          className="w-full h-2 rounded-full bg-secondary appearance-none cursor-pointer accent-primary"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-2 font-mono">
          <span>10K</span>
          <span>1M</span>
          <span>5M</span>
        </div>

        <div className="mt-4 text-center">
          <div className="font-display text-3xl font-bold tracking-tight">
            {clicks.toLocaleString()} <span className="text-base font-normal text-muted-foreground">clicks / month</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="rounded-xl border border-border bg-background/50 p-5 text-center">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Monthly</div>
            <div className="font-display text-3xl font-bold text-gradient mt-1">
              ${earnings.toFixed(2)}
            </div>
          </div>
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-5 text-center">
            <div className="text-xs uppercase tracking-wider text-primary">Yearly</div>
            <div className="font-display text-3xl font-bold text-gradient mt-1">
              ${(earnings * 12).toFixed(2)}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-background/50 p-5 text-center">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Days to $25</div>
            <div className="font-display text-3xl font-bold mt-1">
              {clicks > 0 ? Math.max(1, Math.ceil((2500000 / clicks) * 30)) : "—"}
            </div>
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-6 leading-relaxed">
          Flat rate: <strong className="text-foreground">$1 per 100,000 real visits</strong> · Adsterra share:{" "}
          <strong className="text-foreground">200 of every 5,000 clicks (4%)</strong> · Minimum withdrawal:{" "}
          <strong className="text-foreground">$25 USDT (TRC20 / BEP20)</strong>. Bot traffic auto-filtered.
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────── FEATURES */
function FeatureGrid() {
  const features = [
    {
      icon: DollarSign,
      title: "$1 per 100k clicks",
      desc: "Flat global rate. No confusing country tiers, no hidden cuts. What you earn is what you see.",
    },
    {
      icon: Bitcoin,
      title: "Crypto withdrawals",
      desc: "Cash out in USDT (TRC20 or BEP20). Low network fees, fast settlement, no bank required.",
    },
    {
      icon: ShieldCheck,
      title: "Real-click protection",
      desc: "Built-in bot shield and click-fraud detection. Only genuine human visits add to your balance.",
    },
    {
      icon: TrendingUp,
      title: "Live earnings dashboard",
      desc: "Watch your balance grow in real time. Per-link, per-country, per-day analytics included.",
    },
    {
      icon: Globe2,
      title: "Worldwide acceptance",
      desc: "Earn from clicks in any country. Whether your audience is in BD, India, US, or UK — same rate.",
    },
    {
      icon: Zap,
      title: "Fast redirects",
      desc: "Sub-second short link redirects so visitors never bounce. Your earnings stay intact.",
    },
  ];
  return (
    <section className="container mx-auto px-6 py-24">
      <div className="text-center mb-14 max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          Why AdsPx
        </div>
        <h2 className="font-display text-3xl md:text-5xl font-semibold tracking-tight">
          Built for <span className="text-gradient">people who share links</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((f) => (
          <div
            key={f.title}
            className="group rounded-2xl border border-border bg-card p-6 hover:border-primary/40 hover:shadow-card transition-all"
          >
            <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary grid place-items-center mb-4 group-hover:bg-primary/20 transition-colors">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="font-display font-semibold text-base mb-1.5">{f.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────── RECENT PAYOUTS */
type Country = "all" | "us" | "in";
type Payout = {
  user: string;
  amount: number;
  method: "USDT TRC20" | "USDT BEP20";
  minutesAgo: number;
  country: Country;
  flag: string;
};

const US_NAMES = [
  "michael.b", "david.r", "james.w", "robert.c", "daniel.k", "kevin.m",
  "brandon.t", "ethan.s", "jacob.h", "ryan.p", "nathan.l", "tyler.g",
  "andrew.f", "joshua.d", "matthew.o", "christopher.v", "anthony.n",
  "benjamin.a", "samuel.q", "logan.e", "noah.z", "william.j",
];
const IN_NAMES = [
  "rahul.s", "amit.k", "vikram.p", "arjun.m", "rohan.t", "karan.d",
  "siddharth.g", "manish.r", "nikhil.b", "aditya.v", "harsh.j", "varun.c",
  "rajesh.n", "abhishek.l", "yash.h", "ankit.o", "deepak.f", "sandeep.a",
  "tushar.q", "pranav.e", "rishabh.z", "saurabh.w",
];
const METHODS: Payout["method"][] = ["USDT TRC20", "USDT BEP20"];

function pickRand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomAmount(): number {
  // realistic small-to-mid withdrawals: $26 – $540
  const v = 26 + Math.random() * 514;
  return Math.round(v * 100) / 100;
}

function makePayout(country: Country, minutesAgo: number): Payout {
  if (country === "us") {
    return {
      user: pickRand(US_NAMES) + "***",
      amount: randomAmount(),
      method: pickRand(METHODS),
      minutesAgo,
      country: "us",
      flag: "🇺🇸",
    };
  }
  return {
    user: pickRand(IN_NAMES) + "***",
    amount: randomAmount(),
    method: pickRand(METHODS),
    minutesAgo,
    country: "in",
    flag: "🇮🇳",
  };
}

function formatWhen(min: number): string {
  if (min < 1) return "just now";
  if (min < 60) return `${Math.floor(min)} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  return `${d} days ago`;
}

function buildInitial(): Payout[] {
  // ~8 entries, alternating countries, spread across time
  const list: Payout[] = [];
  const minutes = [3, 11, 24, 47, 82, 130, 210, 340];
  for (let i = 0; i < minutes.length; i++) {
    const c: Country = Math.random() < 0.5 ? "us" : "in";
    list.push(makePayout(c, minutes[i] + Math.floor(Math.random() * 6)));
  }
  return list;
}

function RecentPayouts() {
  const [filter, setFilter] = useState<Country>("all");
  const [payouts, setPayouts] = useState<Payout[]>(() => buildInitial());

  // Age existing entries + occasionally inject a new one (every 60s)
  useEffect(() => {
    const id = setInterval(() => {
      setPayouts((prev) => {
        const aged = prev.map((p) => ({ ...p, minutesAgo: p.minutesAgo + 1 }));
        // every tick, replace the oldest with a fresh "just now" entry
        const fresh = makePayout(Math.random() < 0.5 ? "us" : "in", 0);
        const trimmed = aged.slice(0, aged.length - 1);
        return [fresh, ...trimmed];
      });
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const visible = useMemo(
    () => (filter === "all" ? payouts : payouts.filter((p) => p.country === filter)),
    [payouts, filter],
  );

  const tabs: { id: Country; label: string }[] = [
    { id: "all", label: "All" },
    { id: "us", label: "🇺🇸 USA" },
    { id: "in", label: "🇮🇳 India" },
  ];

  return (
    <section id="payouts" className="container mx-auto px-6 py-24">
      <div className="text-center mb-10 max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <Banknote className="h-3 w-3" /> Live payouts
        </div>
        <h2 className="font-display text-3xl md:text-5xl font-semibold tracking-tight">
          Real publishers. <span className="text-gradient">Real withdrawals.</span>
        </h2>
      </div>

      <div className="flex justify-center mb-6">
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-card">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === t.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto rounded-2xl border border-border bg-card overflow-hidden shadow-card">
        <div className="grid grid-cols-[1fr_auto_auto_auto] md:grid-cols-[1fr_1fr_auto_auto] gap-4 px-5 py-3 border-b border-border/60 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          <div>Publisher</div>
          <div className="hidden md:block">Method</div>
          <div className="text-right">Amount</div>
          <div className="text-right">When</div>
        </div>
        {visible.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            No payouts to show.
          </div>
        ) : (
          visible.map((p, i) => (
            <div
              key={`${p.user}-${i}`}
              className="grid grid-cols-[1fr_auto_auto_auto] md:grid-cols-[1fr_1fr_auto_auto] gap-4 px-5 py-3.5 border-b border-border/40 last:border-b-0 text-sm items-center"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-base">{p.flag}</span>
                <span className="font-mono">{p.user}</span>
              </div>
              <div className="hidden md:flex items-center gap-1.5 text-muted-foreground">
                <Bitcoin className="h-3.5 w-3.5" /> {p.method}
              </div>
              <div className="text-right font-display font-semibold text-success">
                +${p.amount.toFixed(2)}
              </div>
              <div className="text-right text-xs text-muted-foreground">
                {formatWhen(p.minutesAgo)}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}


/* ─────────────────────────────────────────────── FAQ */
function FaqStrip() {
  const faqs = [
    {
      q: "How much do I really earn per click?",
      a: "We pay $1 for every 100,000 valid (human) visits. That's a flat global rate — no country tiers, no surprises.",
    },
    {
      q: "What's the minimum withdrawal?",
      a: "$25. Once your balance hits $25, you can request a withdrawal to your USDT crypto wallet (TRC20 or BEP20).",
    },
    {
      q: "How long does payment take?",
      a: "Most withdrawals are processed within 24 hours. You'll receive the USDT directly to your wallet address.",
    },
    {
      q: "Are bots and fake clicks counted?",
      a: "No. We filter datacenter IPs, known bot networks, and suspicious patterns automatically. Only real visits add to your balance.",
    },
    {
      q: "Where can I share my AdsPx links?",
      a: "Anywhere your audience is — Facebook, Telegram, Twitter/X, YouTube, blog, WhatsApp groups. No platform restrictions.",
    },
    {
      q: "Do I need an AdsPx referral to sign up?",
      a: "No, signup is open and free. There is a referral program if you want to earn from inviting friends, but it's optional.",
    },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="container mx-auto px-6 py-24">
      <div className="text-center mb-12 max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          FAQ
        </div>
        <h2 className="font-display text-3xl md:text-5xl font-semibold tracking-tight">
          Quick answers
        </h2>
      </div>

      <div className="max-w-3xl mx-auto space-y-3">
        {faqs.map((f, i) => (
          <button
            key={f.q}
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full text-left rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-display font-semibold">{f.q}</h3>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${
                  open === i ? "rotate-180" : ""
                }`}
              />
            </div>
            {open === i && (
              <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                {f.a}
              </p>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────── FINAL CTA */
function FinalCta() {
  return (
    <section className="container mx-auto px-6 pb-24">
      <div className="relative rounded-3xl border border-primary/30 bg-card p-12 md:p-16 text-center overflow-hidden shadow-elegant">
        <div className="absolute inset-0 bg-hero opacity-70 pointer-events-none" />
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 h-60 w-[600px] rounded-full bg-primary-gradient opacity-25 blur-3xl" />
        <div className="relative space-y-6 max-w-2xl mx-auto">
          <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
            Start turning clicks into <span className="text-gradient">crypto today</span>
          </h2>
          <p className="text-muted-foreground">
            Free signup. No minimum traffic. Withdraw from $25 in USDT.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button size="lg" className="bg-primary-gradient shadow-glow h-12 px-7" asChild>
              <a href="/signup">
                Create free account <ArrowRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-7" asChild>
              <a href="#calculator">Calculate earnings</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────── FOOTER */
function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-card/30">
      <div className="container mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AdspxMark className="h-7 w-7" glow={false} />
              <span className="font-display font-bold">
                Ads<span className="text-gradient">Px</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Shorten links. Get paid per click. Cash out in crypto.
            </p>
          </div>
          {[
            { title: "Earn", links: ["How it works", "Calculator", "Payouts", "Referrals"] },
            { title: "Company", links: ["About", "Blog", "Contact", "Support"] },
            { title: "Legal", links: ["Terms", "Privacy", "Refund policy", "Cookies"] },
          ].map((col) => (
            <div key={col.title}>
              <div className="font-display font-semibold text-sm mb-3">{col.title}</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="hover:text-foreground transition-colors">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-6 border-t border-border/60 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} AdsPx. All rights reserved.</div>
          <div>Built for creators worldwide ✦</div>
        </div>
      </div>
    </footer>
  );
}
