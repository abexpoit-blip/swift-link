import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Link2, Shield, BarChart3, Globe, Zap, Bot } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "Swift Link — Smart URL shortener with bot filtering" },
      {
        name: "description",
        content:
          "Short links built for performance marketing. Bot filtering, geo-targeting, prelanders, and real-time click analytics.",
      },
    ],
  }),
});

function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border/60 sticky top-0 z-40 glass">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary-gradient grid place-items-center shadow-glow">
              <Link2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold tracking-tight">
              Swift<span className="text-gradient">Link</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
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
                Get started <ArrowRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-hero pointer-events-none" />
        <div className="absolute inset-0 grid-pattern opacity-40 pointer-events-none" />
        <div className="container mx-auto px-6 py-24 md:py-32 relative">
          <div className="max-w-3xl mx-auto text-center space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary-glow font-medium">
              <Zap className="h-3 w-3" /> Built for performance marketers
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight leading-[1.05]">
              Short links that <span className="text-gradient">filter bots</span>,
              route traffic, and convert.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Advanced URL shortener with geo-targeting, bot filtering, prelanders,
              and real-time analytics — engineered for affiliate and ad traffic.
            </p>

            {/* Shorten form */}
            <form
              className="flex flex-col sm:flex-row gap-2 max-w-xl mx-auto pt-4"
              onSubmit={(e) => {
                e.preventDefault();
                window.location.href = "/signup";
              }}
            >
              <Input
                type="url"
                required
                placeholder="https://your-long-url.com/campaign?utm=..."
                className="h-12 text-base bg-card/60 border-border/60"
              />
              <Button
                type="submit"
                size="lg"
                className="h-12 px-6 bg-primary-gradient shadow-glow"
              >
                Shorten <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </form>

            <p className="text-xs text-muted-foreground">
              No credit card required · Free plan available
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-6 py-24">
        <div className="text-center mb-16 space-y-3">
          <h2 className="text-3xl md:text-4xl font-display font-semibold">
            Everything you need to <span className="text-gradient">control your traffic</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Stop wasting clicks on bots and unwanted geos. Route every visitor
            with surgical precision.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group relative rounded-xl border border-border/60 bg-card/50 p-6 hover:border-primary/40 hover:bg-card transition-all shadow-card"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary-glow grid place-items-center mb-4 group-hover:bg-primary/25 transition-colors">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-1.5">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-6 py-24">
        <div className="relative rounded-2xl border border-primary/30 bg-card/60 p-12 text-center overflow-hidden shadow-elegant">
          <div className="absolute inset-0 bg-hero opacity-60 pointer-events-none" />
          <div className="relative space-y-5">
            <h2 className="text-3xl md:text-4xl font-display font-semibold">
              Ready to ship <span className="text-gradient">smarter links</span>?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Create your first short link in under 30 seconds.
            </p>
            <Button size="lg" className="bg-primary-gradient shadow-glow h-12 px-7" asChild>
              <a href="/signup">
                Start free <ArrowRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div>© {new Date().getFullYear()} Swift Link. All rights reserved.</div>
          <div className="flex gap-5">
            <a href="/privacy" className="hover:text-foreground">Privacy</a>
            <a href="/terms" className="hover:text-foreground">Terms</a>
            <a href="/contact" className="hover:text-foreground">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

const FEATURES = [
  {
    icon: Bot,
    title: "Bot filtering",
    desc: "Block crawlers, datacenters, and known bot networks before they waste a click.",
  },
  {
    icon: Globe,
    title: "Geo & device targeting",
    desc: "Route by country, region, OS, browser, or referrer — different page per audience.",
  },
  {
    icon: BarChart3,
    title: "Real-time analytics",
    desc: "Live click feed, cohort retention, drill-down by link, country, and device.",
  },
  {
    icon: Shield,
    title: "Prelanders & safe pages",
    desc: "Built-in safe page pool to satisfy ad-network reviewers automatically.",
  },
  {
    icon: Zap,
    title: "Sub-100ms redirects",
    desc: "Edge-deployed redirect engine — fast everywhere, no cold starts.",
  },
  {
    icon: Link2,
    title: "Custom domains",
    desc: "Bring your own short domain with one-click SSL and health monitoring.",
  },
];
