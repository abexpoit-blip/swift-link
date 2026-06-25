import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  Sparkles,
  Target,
  LineChart,
  Layers,
  Cpu,
  ShieldCheck,
  Check,
  Star,
  MousePointerClick,
  Rocket,
  Wand2,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "Linkly — Turn one link into a smart traffic engine" },
      {
        name: "description",
        content:
          "Linkly is the modern link platform for growth teams. Route every click by geo, device, and intent — and watch conversions in real time.",
      },
    ],
  }),
});

function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <Hero />
      <LogoStrip />
      <HowItWorks />
      <FeatureBento />
      <StatsBand />
      <Testimonial />
      <PricingTeaser />
      <FaqStrip />
      <FinalCta />
      <SiteFooter />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── HEADER */
function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 glass">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="relative h-8 w-8 rounded-xl bg-primary-gradient grid place-items-center shadow-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold text-lg tracking-tight">
            Link<span className="text-gradient">ly</span>
          </span>
          <span className="ml-2 hidden md:inline rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent-foreground">
            Beta
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <a href="/login">Sign in</a>
          </Button>
          <Button size="sm" className="bg-primary-gradient shadow-glow" asChild>
            <a href="/signup">
              Try free <ArrowRight className="ml-1 h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ────────────────────────────────────────────────────────────── HERO */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-hero pointer-events-none" />
      <div className="absolute inset-0 grid-pattern opacity-50 pointer-events-none" />

      {/* Floating orbs */}
      <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
      <div className="absolute top-40 -right-24 h-80 w-80 rounded-full bg-primary-glow/25 blur-3xl pointer-events-none" />

      <div className="container mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32 relative">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
          {/* LEFT — copy */}
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card/70 backdrop-blur px-3 py-1 text-xs font-medium text-primary">
              <Wand2 className="h-3 w-3" /> New · AI-assisted link rules
            </div>
            <h1 className="font-display font-bold tracking-tight text-5xl md:text-6xl lg:text-7xl leading-[1.02]">
              One link.
              <br />
              <span className="text-gradient">Infinite destinations.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
              Linkly sits between your audience and your offers — sending every
              visitor to the right page based on country, device, time, or any
              custom signal. No code, no plugins.
            </p>

            <form
              className="flex flex-col sm:flex-row gap-2 max-w-lg"
              onSubmit={(e) => {
                e.preventDefault();
                window.location.href = "/signup";
              }}
            >
              <Input
                type="url"
                required
                placeholder="Paste your link to shorten…"
                className="h-12 text-base bg-card/80 border-border"
              />
              <Button
                type="submit"
                size="lg"
                className="h-12 px-6 bg-primary-gradient shadow-glow"
              >
                Shorten <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </form>

            <div className="flex flex-wrap items-center gap-5 text-xs text-muted-foreground pt-2">
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-primary" /> Free forever plan
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-primary" /> No credit card
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-primary" /> Setup in 30s
              </span>
            </div>
          </div>

          {/* RIGHT — mock dashboard card */}
          <div className="relative">
            <div className="absolute -inset-6 bg-primary-gradient opacity-30 blur-3xl rounded-3xl" />
            <div className="relative rounded-2xl border border-border bg-card/90 backdrop-blur-xl shadow-elegant overflow-hidden">
              {/* card header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  linkly.io/spring-sale
                </span>
                <span className="text-xs font-medium text-success">● live</span>
              </div>

              {/* stat row */}
              <div className="grid grid-cols-3 divide-x divide-border/60">
                {[
                  { label: "Clicks today", value: "14,209" },
                  { label: "Unique users", value: "9,142" },
                  { label: "Conv. rate", value: "7.8%" },
                ].map((s) => (
                  <div key={s.label} className="p-4">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {s.label}
                    </div>
                    <div className="font-display text-xl font-semibold mt-1">
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* fake chart */}
              <div className="px-5 pt-3 pb-5">
                <div className="flex items-end gap-1.5 h-32">
                  {[40, 62, 38, 75, 55, 88, 72, 95, 68, 82, 90, 76, 100, 84, 92].map(
                    (h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t-md bg-primary-gradient opacity-80 hover:opacity-100 transition-opacity"
                        style={{ height: `${h}%` }}
                      />
                    ),
                  )}
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-2 font-mono">
                  <span>00:00</span>
                  <span>06:00</span>
                  <span>12:00</span>
                  <span>18:00</span>
                  <span>now</span>
                </div>
              </div>

              {/* routing chips */}
              <div className="px-5 pb-5 flex flex-wrap gap-2">
                {["🇺🇸 US → Sale page", "🇬🇧 UK → VAT page", "📱 Mobile → App", "🤖 Bots → Decoy"].map(
                  (chip) => (
                    <span
                      key={chip}
                      className="text-xs rounded-full bg-secondary/70 px-2.5 py-1 border border-border/60"
                    >
                      {chip}
                    </span>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────── LOGO STRIP */
function LogoStrip() {
  const brands = ["Northwind", "Acme Co.", "Lumen", "Pinecrest", "Voltic", "Helio Labs"];
  return (
    <section className="border-y border-border/60 bg-card/30">
      <div className="container mx-auto px-6 py-8">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground mb-5">
          Trusted by 12,000+ growth teams
        </p>
        <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-3">
          {brands.map((b) => (
            <span
              key={b}
              className="font-display text-lg font-semibold text-muted-foreground/70 hover:text-foreground transition-colors"
            >
              {b}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────── HOW IT WORKS */
function HowItWorks() {
  const steps = [
    {
      icon: MousePointerClick,
      title: "Paste your link",
      desc: "Drop in any URL — affiliate, landing page, app store. We give you a short, brandable link instantly.",
    },
    {
      icon: Target,
      title: "Add smart rules",
      desc: "Route by country, device, OS, referrer, or time of day. Mix conditions, set fallback pages.",
    },
    {
      icon: Rocket,
      title: "Ship & measure",
      desc: "Real-time analytics show what's converting. Tweak rules without changing the link.",
    },
  ];
  return (
    <section id="how" className="container mx-auto px-6 py-24">
      <div className="text-center mb-14 max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          How it works
        </div>
        <h2 className="font-display text-3xl md:text-5xl font-semibold tracking-tight">
          From link to launch in <span className="text-gradient">three steps</span>
        </h2>
      </div>

      <div className="relative grid md:grid-cols-3 gap-6">
        {/* connecting line */}
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
    </section>
  );
}

/* ────────────────────────────────────────────────────────────── FEATURE BENTO */
function FeatureBento() {
  return (
    <section id="features" className="container mx-auto px-6 py-24">
      <div className="text-center mb-14 max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          What's inside
        </div>
        <h2 className="font-display text-3xl md:text-5xl font-semibold tracking-tight">
          Everything a serious <span className="text-gradient">link platform</span> should be
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* big card */}
        <div className="md:col-span-2 md:row-span-2 rounded-2xl border border-border bg-card p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-hero opacity-60 pointer-events-none" />
          <div className="relative">
            <LineChart className="h-9 w-9 text-primary mb-5" />
            <h3 className="font-display text-2xl font-semibold mb-2">
              Real-time analytics that don't lag
            </h3>
            <p className="text-muted-foreground max-w-md leading-relaxed mb-6">
              Every click streams into your dashboard within a second. Filter by
              country, device, source, UTM — zero spreadsheet exports.
            </p>
            <div className="rounded-xl border border-border bg-background/60 backdrop-blur p-4">
              <div className="flex items-end gap-1 h-24">
                {[30, 55, 42, 68, 50, 75, 60, 85, 70, 92, 78, 95].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t bg-primary-gradient opacity-80"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <FeatureCard
          icon={Target}
          title="Geo & device routing"
          desc="Send a US visitor to one page, a UK visitor to another, mobile users to your app store."
        />
        <FeatureCard
          icon={ShieldCheck}
          title="Bot shield"
          desc="Auto-filter crawlers, datacenter IPs, and click-fraud networks before they pollute your stats."
        />
        <FeatureCard
          icon={Layers}
          title="Custom domains"
          desc="Use your own short domain with one-click SSL and uptime monitoring built in."
        />
        <FeatureCard
          icon={Cpu}
          title="Sub-100ms edge"
          desc="Redirects served from 280+ cities. Your users feel native-app speed."
        />
        <FeatureCard
          icon={Wand2}
          title="AI rule suggestions"
          desc="Linkly studies your traffic and proposes routing rules that lift conversions."
        />
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof Target;
  title: string;
  desc: string;
}) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-6 hover:border-primary/40 hover:shadow-card transition-all">
      <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center mb-4 group-hover:bg-primary/20 transition-colors">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-display font-semibold text-base mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── STATS BAND */
function StatsBand() {
  const stats = [
    { value: "2.4B+", label: "Clicks routed" },
    { value: "180+", label: "Countries served" },
    { value: "99.99%", label: "Uptime SLA" },
    { value: "<60ms", label: "Median redirect" },
  ];
  return (
    <section className="border-y border-border/60 bg-card/40">
      <div className="container mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
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

/* ────────────────────────────────────────────────────────────── TESTIMONIAL */
function Testimonial() {
  return (
    <section className="container mx-auto px-6 py-24">
      <div className="max-w-3xl mx-auto rounded-3xl border border-border bg-card p-10 md:p-14 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative">
          <div className="flex gap-1 mb-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className="h-4 w-4 fill-warning text-warning"
              />
            ))}
          </div>
          <p className="font-display text-2xl md:text-3xl leading-snug tracking-tight">
            "We replaced two SaaS tools with Linkly. Click quality went up 38%,
            and our paid spend finally has clean attribution."
          </p>
          <div className="mt-6 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary-gradient grid place-items-center text-primary-foreground font-semibold">
              MR
            </div>
            <div>
              <div className="font-semibold text-sm">Maya Roy</div>
              <div className="text-xs text-muted-foreground">
                Head of Growth · Northwind
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────── PRICING TEASER */
function PricingTeaser() {
  const tiers = [
    {
      name: "Starter",
      price: "$0",
      sub: "for life",
      features: ["500 clicks/mo", "5 short links", "Basic analytics", "Linkly domain"],
      cta: "Start free",
      highlight: false,
    },
    {
      name: "Growth",
      price: "$19",
      sub: "/month",
      features: [
        "100k clicks/mo",
        "Unlimited links",
        "Geo + device routing",
        "1 custom domain",
        "Bot shield",
      ],
      cta: "Start 14-day trial",
      highlight: true,
    },
    {
      name: "Scale",
      price: "$79",
      sub: "/month",
      features: [
        "1M clicks/mo",
        "5 custom domains",
        "AI rule suggestions",
        "Team seats",
        "Priority support",
      ],
      cta: "Talk to sales",
      highlight: false,
    },
  ];
  return (
    <section id="pricing" className="container mx-auto px-6 py-24">
      <div className="text-center mb-14 max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          Pricing
        </div>
        <h2 className="font-display text-3xl md:text-5xl font-semibold tracking-tight">
          Simple plans. <span className="text-gradient">Scale when you want.</span>
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`rounded-2xl border p-7 flex flex-col ${
              t.highlight
                ? "border-primary/50 bg-card shadow-glow relative"
                : "border-border bg-card/60"
            }`}
          >
            {t.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary-gradient px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                Most popular
              </span>
            )}
            <div className="mb-5">
              <div className="font-display font-semibold text-lg">{t.name}</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold">{t.price}</span>
                <span className="text-sm text-muted-foreground">{t.sub}</span>
              </div>
            </div>
            <ul className="space-y-2.5 text-sm mb-7 flex-1">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>
            <Button
              className={t.highlight ? "bg-primary-gradient shadow-glow" : ""}
              variant={t.highlight ? "default" : "outline"}
              asChild
            >
              <a href="/signup">{t.cta}</a>
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────── FAQ */
function FaqStrip() {
  const faqs = [
    {
      q: "Do I need to install anything?",
      a: "No. Linkly is fully cloud-based — paste a URL, get a short link, share it anywhere.",
    },
    {
      q: "Can I use my own domain?",
      a: "Yes. Bring your own short domain on Growth and above. We handle DNS and SSL automatically.",
    },
    {
      q: "What happens when I hit my click limit?",
      a: "Links keep working — we just pause analytics tracking until the next cycle or an upgrade.",
    },
    {
      q: "How does bot filtering work?",
      a: "We maintain an updated database of known bot signatures, datacenter IPs, and click-fraud patterns. Every click is checked in <5ms.",
    },
  ];
  return (
    <section id="faq" className="container mx-auto px-6 py-24">
      <div className="text-center mb-14 max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          FAQ
        </div>
        <h2 className="font-display text-3xl md:text-5xl font-semibold tracking-tight">
          Quick answers
        </h2>
      </div>

      <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
        {faqs.map((f) => (
          <div
            key={f.q}
            className="rounded-2xl border border-border bg-card p-6 hover:border-primary/40 transition-colors"
          >
            <h3 className="font-display font-semibold mb-2">{f.q}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{f.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────── FINAL CTA */
function FinalCta() {
  return (
    <section className="container mx-auto px-6 pb-24">
      <div className="relative rounded-3xl border border-primary/30 bg-card p-12 md:p-16 text-center overflow-hidden shadow-elegant">
        <div className="absolute inset-0 bg-hero opacity-70 pointer-events-none" />
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 h-60 w-[600px] rounded-full bg-primary-gradient opacity-25 blur-3xl" />
        <div className="relative space-y-6 max-w-2xl mx-auto">
          <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
            Start sending traffic <span className="text-gradient">where it converts</span>
          </h2>
          <p className="text-muted-foreground">
            Free forever plan. Upgrade only when you outgrow it.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button size="lg" className="bg-primary-gradient shadow-glow h-12 px-7" asChild>
              <a href="/signup">
                Create your first link <ArrowRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-7" asChild>
              <a href="#how">See how it works</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────── FOOTER */
function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-card/30">
      <div className="container mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-lg bg-primary-gradient grid place-items-center">
                <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="font-display font-semibold">
                Link<span className="text-gradient">ly</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              The modern link platform for growth teams.
            </p>
          </div>
          {[
            { title: "Product", links: ["Features", "Pricing", "Changelog", "Roadmap"] },
            { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
            { title: "Legal", links: ["Privacy", "Terms", "Security", "DPA"] },
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
          <div>© {new Date().getFullYear()} Linkly. All rights reserved.</div>
          <div>Made with ✦ for marketers who care.</div>
        </div>
      </div>
    </footer>
  );
}
