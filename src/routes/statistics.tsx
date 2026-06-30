import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Activity, Globe2, MousePointerClick, ShieldCheck, Users, Zap, TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { AdspxMark } from "@/components/AdspxLogo";

export const Route = createFileRoute("/statistics")({
  component: StatisticsPage,
  head: () => ({
    meta: [
      { title: "Network Statistics — AdsPx" },
      {
        name: "description",
        content:
          "Live traffic statistics across the AdsPx publisher network: country flag breakdown, verified humans vs bots, daily traffic and payouts.",
      },
    ],
  }),
});

/* ----------------------------- mock data ----------------------------- */
// Deterministic mock data so the page is stable across SSR + hydrate.

type Row = { code: string; name: string; clicks: number; earnings: number };

const COUNTRY_ROWS: Row[] = [
  { code: "us", name: "United States",  clicks: 184_220, earnings: 1842.20 },
  { code: "in", name: "India",          clicks: 142_905, earnings:  714.52 },
  { code: "bd", name: "Bangladesh",     clicks: 121_440, earnings:  607.20 },
  { code: "id", name: "Indonesia",      clicks:  98_310, earnings:  393.24 },
  { code: "br", name: "Brazil",         clicks:  86_540, earnings:  432.70 },
  { code: "pk", name: "Pakistan",       clicks:  74_220, earnings:  297.00 },
  { code: "ph", name: "Philippines",    clicks:  62_180, earnings:  248.72 },
  { code: "ng", name: "Nigeria",        clicks:  54_005, earnings:  216.02 },
  { code: "eg", name: "Egypt",          clicks:  49_870, earnings:  199.48 },
  { code: "mx", name: "Mexico",         clicks:  41_120, earnings:  205.60 },
  { code: "gb", name: "United Kingdom", clicks:  38_660, earnings:  386.60 },
  { code: "de", name: "Germany",        clicks:  31_410, earnings:  314.10 },
  { code: "tr", name: "Turkey",         clicks:  28_780, earnings:  143.90 },
  { code: "vn", name: "Vietnam",        clicks:  25_640, earnings:  102.56 },
  { code: "fr", name: "France",         clicks:  22_115, earnings:  221.15 },
];

const TRAFFIC_30D = Array.from({ length: 30 }, (_, i) => {
  const base = 28_000 + i * 850;
  const noise = ((i * 73) % 11) * 600;
  return {
    day: `D${i + 1}`,
    humans: base + noise,
    bots: Math.round((base + noise) * 0.12 + ((i * 17) % 7) * 90),
  };
});

const SOURCE_SPLIT = [
  { name: "Facebook",   value: 62, color: "#1877F2" },
  { name: "Telegram",   value: 14, color: "#26A5E4" },
  { name: "YouTube",    value: 11, color: "#FF0000" },
  { name: "WhatsApp",   value:  8, color: "#25D366" },
  { name: "Other",      value:  5, color: "#9CA3AF" },
];

const flagUrl = (code: string) => `https://flagcdn.com/${code}.svg`;

/* ----------------------------- page ----------------------------- */

function StatisticsPage() {
  const totalClicks   = useMemo(() => COUNTRY_ROWS.reduce((a, r) => a + r.clicks, 0), []);
  const totalEarnings = useMemo(() => COUNTRY_ROWS.reduce((a, r) => a + r.earnings, 0), []);
  const humans24h     = TRAFFIC_30D.at(-1)!.humans;
  const bots24h       = TRAFFIC_30D.at(-1)!.bots;
  const humanPct      = ((humans24h / (humans24h + bots24h)) * 100).toFixed(1);

  return (
    <div className="min-h-screen text-foreground">
      {/* header */}
      <header className="glass sticky top-0 z-40 border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <AdspxMark className="h-8 w-8" />
            <span className="font-display font-bold text-lg tracking-tight">
              Ads<span className="text-gradient">Px</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <Link to="/leaderboard" className="hover:text-foreground">Leaderboard</Link>
            <Link to="/statistics" className="text-primary font-medium">Statistics</Link>
            <Link to="/dashboard" className="hover:text-foreground">Console</Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-7xl space-y-10">
        {/* hero */}
        <section className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 glass-card px-3.5 py-1.5 text-xs font-medium text-primary">
            <Activity className="h-3 w-3" /> Live network statistics
          </div>
          <h1 className="font-display font-bold tracking-tight text-4xl md:text-6xl">
            The whole network, <span className="text-gradient">in real time</span>
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Every click that flows through AdsPx — broken down by country, source, and
            bot-detection verdict. Updated continuously across all publishers.
          </p>
        </section>

        {/* KPI cards */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi icon={MousePointerClick} label="Clicks (30d)" value={totalClicks.toLocaleString()} sub="across all publishers" />
          <Kpi icon={ShieldCheck}       label="Verified humans" value={`${humanPct}%`} sub={`${humans24h.toLocaleString()} in last 24h`} accent />
          <Kpi icon={Users}             label="Active countries" value={`${COUNTRY_ROWS.length}+`} sub="every continent" />
          <Kpi icon={TrendingUp}        label="Paid out (30d)" value={`$${totalEarnings.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} sub="to publishers" />
        </section>

        {/* traffic chart */}
        <section className="rounded-2xl glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-xl font-semibold">Daily traffic (30 days)</h2>
              <p className="text-xs text-muted-foreground">Humans vs bots — verified by our AI detection layer.</p>
            </div>
            <div className="hidden md:flex items-center gap-4 text-xs">
              <Legend2 color="hsl(var(--primary))" label="Humans" />
              <Legend2 color="#FF3D71" label="Bots blocked" />
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TRAFFIC_30D}>
                <defs>
                  <linearGradient id="h-g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="b-g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF3D71" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#FF3D71" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                />
                <Area type="monotone" dataKey="humans" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#h-g)" />
                <Area type="monotone" dataKey="bots"   stroke="#FF3D71"            strokeWidth={2} fill="url(#b-g)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* country + sources */}
        <section className="grid lg:grid-cols-[1fr_360px] gap-6">
          {/* countries */}
          <div className="rounded-2xl glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe2 className="h-5 w-5 text-primary" />
              <h2 className="font-display text-xl font-semibold">Traffic by country</h2>
            </div>
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2.5">Country</th>
                    <th className="text-right px-4 py-2.5">Clicks (30d)</th>
                    <th className="text-right px-4 py-2.5">Share</th>
                    <th className="text-right px-4 py-2.5">Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {COUNTRY_ROWS.map((r) => {
                    const pct = (r.clicks / totalClicks) * 100;
                    return (
                      <tr key={r.code} className="border-t border-border hover:bg-muted/30">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <img
                              src={flagUrl(r.code)}
                              alt={r.name}
                              loading="lazy"
                              className="h-4 w-6 rounded-sm border border-border object-cover"
                            />
                            <span className="font-medium">{r.name}</span>
                            <span className="text-[10px] font-mono text-muted-foreground uppercase">{r.code}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">{r.clicks.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="inline-flex items-center gap-2">
                            <div className="hidden md:block w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full bg-primary-gradient" style={{ width: `${Math.min(100, pct * 4)}%` }} />
                            </div>
                            <span className="font-mono text-xs text-muted-foreground tabular-nums">{pct.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-primary">${r.earnings.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* sources */}
          <div className="rounded-2xl glass-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <h2 className="font-display text-xl font-semibold">Traffic sources</h2>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={SOURCE_SPLIT} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {SOURCE_SPLIT.map((s) => <Cell key={s.name} fill={s.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-1.5 text-sm">
              {SOURCE_SPLIT.map((s) => (
                <li key={s.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                    {s.name}
                  </span>
                  <span className="font-mono text-muted-foreground">{s.value}%</span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-muted-foreground pt-2 border-t border-border">
              Facebook leads — AdsPx is purpose-built to cloak Facebook traffic for Adsterra and
              other ad-network offers.
            </p>
          </div>
        </section>

        {/* bot detection bar chart */}
        <section className="rounded-2xl glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-semibold">Bot detection — last 30 days</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={TRAFFIC_30D}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="bots" fill="#FF3D71" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <p className="text-center text-xs text-muted-foreground">
          Aggregated demo data — your individual link stats live in your{" "}
          <Link to="/dashboard" className="text-primary hover:underline">Console</Link>.
        </p>
      </main>
    </div>
  );
}

/* ----------------------------- bits ----------------------------- */

function Kpi({
  icon: Icon, label, value, sub, accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; sub?: string; accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl glass-card p-5 ${accent ? "ring-cyan" : ""}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className={`font-display font-bold ${accent ? "text-gradient text-3xl" : "text-2xl"}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function Legend2({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
