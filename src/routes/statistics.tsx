import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity, Globe2, MousePointerClick, ShieldCheck, Users, Zap, TrendingUp, Loader2,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import { AdspxMark } from "@/components/AdspxLogo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/statistics")({
  component: StatisticsPage,
  head: () => ({
    meta: [
      { title: "Statistics — AdsPx" },
      { name: "description", content: "Real-time statistics for your AdsPx links: traffic, bot detection, country breakdown, and payouts." },
    ],
  }),
});

/* ────────────────────────── types ────────────────────────── */
type TLog = { decision: string; country: string | null; created_at: string };
type ClickRow = { country: string | null; referer_host: string | null; is_bot: boolean; created_at: string };

type DayPoint = { day: string; humans: number; bots: number; date: string };
type CountryRow = { code: string; name: string; clicks: number; humans: number; bots: number };
type SourceRow = { name: string; value: number; color: string };

/* ────────────────────────── helpers ────────────────────────── */
const COUNTRY_DISPLAY = (() => {
  try { return new Intl.DisplayNames(["en"], { type: "region" }); } catch { return null; }
})();

function countryName(code: string) {
  if (!code) return "Unknown";
  try { return COUNTRY_DISPLAY?.of(code.toUpperCase()) ?? code.toUpperCase(); }
  catch { return code.toUpperCase(); }
}
const flagUrl = (code: string) => `https://flagcdn.com/${code.toLowerCase()}.svg`;

function bucketSource(host: string | null): string {
  if (!host) return "Direct";
  const h = host.toLowerCase();
  if (h.includes("facebook") || h.includes("fb.") || h.includes("l.facebook")) return "Facebook";
  if (h.includes("instagram")) return "Instagram";
  if (h.includes("t.me") || h.includes("telegram")) return "Telegram";
  if (h.includes("youtu")) return "YouTube";
  if (h.includes("whatsapp") || h.includes("wa.me")) return "WhatsApp";
  if (h.includes("twitter") || h.includes("x.com")) return "X / Twitter";
  if (h.includes("tiktok")) return "TikTok";
  if (h.includes("google")) return "Google";
  return "Other";
}
const SRC_COLORS: Record<string, string> = {
  Facebook: "#1877F2", Instagram: "#E4405F", Telegram: "#26A5E4", YouTube: "#FF0000",
  WhatsApp: "#25D366", "X / Twitter": "#000000", TikTok: "#FE2C55", Google: "#4285F4",
  Direct: "#6B7280", Other: "#9CA3AF",
};

function lastNDays(n: number) {
  const out: { key: string; label: string }[] = [];
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today); d.setUTCDate(today.getUTCDate() - i);
    out.push({
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    });
  }
  return out;
}

/* ────────────────────────── page ────────────────────────── */
function StatisticsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  const [tlogs, setTlogs] = useState<TLog[]>([]);
  const [clicks, setClicks] = useState<ClickRow[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [linkClicks, setLinkClicks] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); setSignedIn(false); return; }
      setSignedIn(true);
      const userId = session.user.id;
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString();

      const [traffic, click, earnings, links] = await Promise.all([
        supabase.from("traffic_logs")
          .select("decision, country, created_at")
          .eq("user_id", userId)
          .gte("created_at", since)
          .order("created_at", { ascending: true })
          .limit(5000),
        supabase.from("clicks")
          .select("country, referer_host, is_bot, created_at, links!inner(user_id)")
          .eq("links.user_id", userId)
          .gte("created_at", since)
          .order("created_at", { ascending: true })
          .limit(5000),
        supabase.from("earnings_ledger")
          .select("earnings_usd")
          .eq("user_id", userId),
        supabase.from("links")
          .select("clicks_count, bot_clicks_count")
          .eq("user_id", userId),
      ]);

      setTlogs((traffic.data ?? []) as TLog[]);
      setClicks((click.data ?? []) as unknown as ClickRow[]);
      setTotalEarnings((earnings.data ?? []).reduce((a, r: any) => a + Number(r.earnings_usd || 0), 0));
      setLinkClicks((links.data ?? []).reduce((a, r: any) => a + Number(r.clicks_count || 0) + Number(r.bot_clicks_count || 0), 0));
      setLoading(false);
    })();
  }, []);

  /* ── aggregations ── */
  const trafficSeries = useMemo<DayPoint[]>(() => {
    const days = lastNDays(30);
    const idx = new Map(days.map((d, i) => [d.key, i]));
    const out: DayPoint[] = days.map((d) => ({ day: d.label, date: d.key, humans: 0, bots: 0 }));
    for (const t of tlogs) {
      const k = t.created_at.slice(0, 10);
      const i = idx.get(k); if (i === undefined) continue;
      if (t.decision === "money") out[i].humans++; else out[i].bots++;
    }
    return out;
  }, [tlogs]);

  const countries = useMemo<CountryRow[]>(() => {
    const m = new Map<string, { humans: number; bots: number }>();
    for (const t of tlogs) {
      const c = (t.country || "").toUpperCase();
      if (!c) continue;
      const row = m.get(c) ?? { humans: 0, bots: 0 };
      if (t.decision === "money") row.humans++; else row.bots++;
      m.set(c, row);
    }
    return [...m.entries()]
      .map(([code, v]) => ({ code, name: countryName(code) || code, clicks: v.humans + v.bots, humans: v.humans, bots: v.bots }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 20);
  }, [tlogs]);

  const sources = useMemo<SourceRow[]>(() => {
    const m = new Map<string, number>();
    for (const c of clicks) {
      const bucket = bucketSource(c.referer_host);
      m.set(bucket, (m.get(bucket) ?? 0) + 1);
    }
    const total = [...m.values()].reduce((a, n) => a + n, 0) || 1;
    return [...m.entries()]
      .map(([name, n]) => ({ name, value: Math.round((n / total) * 1000) / 10, color: SRC_COLORS[name] ?? "#9CA3AF" }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [clicks]);

  const totalClicks = tlogs.length || linkClicks;
  const totalCountries = countries.length;
  const totalHumans = tlogs.reduce((a, t) => a + (t.decision === "money" ? 1 : 0), 0);
  const totalBots   = tlogs.length - totalHumans;
  const humanPct    = tlogs.length ? ((totalHumans / tlogs.length) * 100).toFixed(1) : "—";

  /* ────────────────────────── render ────────────────────────── */

  if (loading) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen text-foreground">
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
        <section className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 glass-card px-3.5 py-1.5 text-xs font-medium text-primary">
            <Activity className="h-3 w-3" /> Your real-time statistics
          </div>
          <h1 className="font-display font-bold tracking-tight text-4xl md:text-6xl">
            Every click, <span className="text-gradient">measured</span>
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            All numbers below come straight from your tracking pipeline — last 30 days of verified humans vs bots,
            broken down by country and traffic source.
          </p>
        </section>

        {!signedIn ? (
          <EmptyState
            title="Sign in to see your statistics"
            body="Your AI-shield results and per-country breakdown are scoped to your account."
            cta={<button onClick={() => navigate({ to: "/login" })} className="rounded-md bg-primary-gradient text-primary-foreground px-4 py-2 text-sm font-medium">Sign in</button>}
          />
        ) : tlogs.length === 0 && clicks.length === 0 ? (
          <EmptyState
            title="No traffic yet"
            body="Create a cloaked link and start sending visitors — this page will fill in automatically as clicks come in."
            cta={<Link to="/dashboard" className="rounded-md bg-primary-gradient text-primary-foreground px-4 py-2 text-sm font-medium">Open Console</Link>}
          />
        ) : (
          <>
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Kpi icon={MousePointerClick} label="Clicks (30d)" value={totalClicks.toLocaleString()} sub={`${tlogs.length} evaluated`} />
              <Kpi icon={ShieldCheck} label="Verified humans" value={typeof humanPct === "string" && humanPct.endsWith("—") ? humanPct : `${humanPct}%`} sub={`${totalHumans} humans · ${totalBots} bots`} accent />
              <Kpi icon={Users} label="Countries seen" value={totalCountries.toString()} sub={totalCountries ? "across your traffic" : "none yet"} />
              <Kpi icon={TrendingUp} label="Earnings (lifetime)" value={`$${totalEarnings.toFixed(4)}`} sub="from earnings ledger" />
            </section>

            <section className="rounded-2xl glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-display text-xl font-semibold">Daily traffic (30 days)</h2>
                  <p className="text-xs text-muted-foreground">Verified humans vs bots — straight from <code className="font-mono">traffic_logs</code>.</p>
                </div>
                <div className="hidden md:flex items-center gap-4 text-xs">
                  <Legend2 color="hsl(var(--primary))" label="Humans" />
                  <Legend2 color="#FF3D71" label="Bots blocked" />
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trafficSeries}>
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
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="humans" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#h-g)" />
                    <Area type="monotone" dataKey="bots"   stroke="#FF3D71"            strokeWidth={2} fill="url(#b-g)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="grid lg:grid-cols-[1fr_360px] gap-6">
              <div className="rounded-2xl glass-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Globe2 className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-xl font-semibold">Traffic by country</h2>
                </div>
                {countries.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No geolocated clicks in the last 30 days.</p>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="text-left px-4 py-2.5">Country</th>
                          <th className="text-right px-4 py-2.5">Clicks</th>
                          <th className="text-right px-4 py-2.5">Humans / Bots</th>
                          <th className="text-right px-4 py-2.5">Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {countries.map((r) => {
                          const tot = countries.reduce((a, c) => a + c.clicks, 0) || 1;
                          const pct = (r.clicks / tot) * 100;
                          return (
                            <tr key={r.code} className="border-t border-border hover:bg-muted/30">
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={flagUrl(r.code)} alt={r.name} loading="lazy"
                                    className="h-4 w-6 rounded-sm border border-border object-cover"
                                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
                                  />
                                  <span className="font-medium">{r.name}</span>
                                  <span className="text-[10px] font-mono text-muted-foreground uppercase">{r.code}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono">{r.clicks.toLocaleString()}</td>
                              <td className="px-4 py-2.5 text-right text-xs">
                                <span className="text-primary font-mono">{r.humans}</span>
                                <span className="text-muted-foreground"> / </span>
                                <span className="text-[#FF3D71] font-mono">{r.bots}</span>
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <div className="inline-flex items-center gap-2">
                                  <div className="hidden md:block w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div className="h-full bg-primary-gradient" style={{ width: `${Math.min(100, pct)}%` }} />
                                  </div>
                                  <span className="font-mono text-xs text-muted-foreground tabular-nums">{pct.toFixed(1)}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="rounded-2xl glass-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-xl font-semibold">Traffic sources</h2>
                </div>
                {sources.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No referer data yet.</p>
                ) : (
                  <>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={sources} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={2}>
                            {sources.map((s) => <Cell key={s.name} fill={s.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="space-y-1.5 text-sm">
                      {sources.map((s) => (
                        <li key={s.name} className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                            {s.name}
                          </span>
                          <span className="font-mono text-muted-foreground">{s.value}%</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </section>

            <section className="rounded-2xl glass-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h2 className="font-display text-xl font-semibold">Bots blocked — last 30 days</h2>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trafficSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="bots" fill="#FF3D71" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Numbers update live as new clicks land — refresh to recompute. Manage links in your{" "}
          <Link to="/dashboard" className="text-primary hover:underline">Console</Link>.
        </p>
      </main>
    </div>
  );
}

/* ────────────────────────── bits ────────────────────────── */

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

function EmptyState({ title, body, cta }: { title: string; body: string; cta: React.ReactNode }) {
  return (
    <section className="rounded-2xl glass-card p-12 text-center space-y-3 max-w-xl mx-auto">
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{body}</p>
      <div className="pt-2">{cta}</div>
    </section>
  );
}
