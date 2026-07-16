import { AppShell } from "@/components/AppShell";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Link2, Loader2, Plus, Copy, Trash2, ExternalLink, DollarSign,
  MousePointerClick, Wallet, LogOut, TrendingUp, ShieldCheck, Bot,
  Settings2, Inbox as InboxIcon, Activity, Globe2,
} from "lucide-react";
import { AdspxMark } from "@/components/AdspxLogo";

export const Route = createFileRoute("/dashboard")({
  component: () => (<AppShell><DashboardPage /></AppShell>),
  head: () => ({ meta: [{ title: "Dashboard — AdsPx" }] }),
});

type LinkRow = {
  id: string; short_code: string; title: string | null;
  adsterra_url: string; clicks_count: number; bot_clicks_count: number;
  is_active: boolean; created_at: string;
};
type EarningRow = {
  link_id: string | null; total_clicks: number;
  adsterra_clicks: number; user_clicks: number; earnings_usd: number;
};
type CloakSettings = {
  link_id: string;
  campaign_launch_mode: boolean;
  launch_window_hours: number;
  launched_at: string | null;
  block_desktop: boolean;
  allowed_countries: string[];
  safe_page_pool: string[];
  coherence_threshold: number;
  fbclid_max_hits: number;
};
type TrafficLog = {
  id: string; decision: string; reasons: string[]; coherence_score: number | null;
  country: string | null; is_mobile: boolean | null; created_at: string;
  fbclid: string | null;
};

function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [balance, setBalance] = useState(0);
  const [withdrawn, setWithdrawn] = useState(0);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [earningsByLink, setEarningsByLink] = useState<Record<string, EarningRow>>({});
  const [logs, setLogs] = useState<TrafficLog[]>([]);
  const [expandedLink, setExpandedLink] = useState<string | null>(null);
  const [cloakByLink, setCloakByLink] = useState<Record<string, CloakSettings>>({});
  const [monitorMode, setMonitorMode] = useState<{ on: boolean; until: string | null }>({ on: false, until: null });
  const [liveStats, setLiveStats] = useState<{ total: number; humans: number; bots: number; windowMin: number }>({ total: 0, humans: 0, bots: 0, windowMin: 2880 });
  const deletedLinkIdsRef = useRef(new Set<string>());
  async function loadAll(uid: string, options: { includeLogs?: boolean } = {}) {
    const includeLogs = options.includeLogs ?? true;
    const [profileRes, linksRes, earningsRes] = await Promise.all([
      supabase.from("profiles").select("balance_available, balance_withdrawn").eq("id", uid).maybeSingle(),
      supabase.from("links").select("id, short_code, title, adsterra_url, clicks_count, bot_clicks_count, is_active, created_at").eq("user_id", uid).eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("earnings_ledger").select("link_id, total_clicks, adsterra_clicks, user_clicks, earnings_usd").eq("user_id", uid),
    ]);
    setBalance(Number(profileRes.data?.balance_available ?? 0));
    setWithdrawn(Number(profileRes.data?.balance_withdrawn ?? 0));
    const lks = ((linksRes.data as LinkRow[] | null) ?? []).filter((link) => !deletedLinkIdsRef.current.has(link.id));
    setLinks(lks);
    const agg: Record<string, EarningRow> = {};
    for (const e of (earningsRes.data as EarningRow[] | null) ?? []) {
      const k = e.link_id ?? "_";
      if (!agg[k]) agg[k] = { link_id: e.link_id, total_clicks: 0, adsterra_clicks: 0, user_clicks: 0, earnings_usd: 0 };
      agg[k].total_clicks += Number(e.total_clicks);
      agg[k].adsterra_clicks += Number(e.adsterra_clicks);
      agg[k].user_clicks += Number(e.user_clicks);
      agg[k].earnings_usd += Number(e.earnings_usd);
    }
    setEarningsByLink(agg);
    if (!includeLogs) return;
    const logsRes = await supabase
      .from("traffic_logs")
      .select("id, decision, reasons, coherence_score, country, is_mobile, created_at, fbclid")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(300);
    setLogs((logsRes.data as TrafficLog[] | null) ?? []);
  }

  useEffect(() => {
    (async () => {
      // fast path: read cached session from localStorage (no network roundtrip)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/login" }); return; }
      setUserId(session.user.id);
      setLoading(false);
      // fire-and-forget: record activity for inactive-user purge
      supabase.rpc("touch_last_login").then(() => {});
      // check ban status
      const { data: prof } = await supabase
        .from("profiles")
        .select("banned, banned_reason")
        .eq("id", session.user.id)
        .maybeSingle();
      if (prof?.banned) {
        await supabase.auth.signOut();
        toast.error(`Account suspended${prof.banned_reason ? ": " + prof.banned_reason : ""}`);
        navigate({ to: "/login" });
        return;
      }
      // check admin role (fire-and-forget, non-blocking)
      supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" })
        .then(({ data }) => setIsAdmin(!!data));
      loadAll(session.user.id, { includeLogs: false })
        .then(() =>
          supabase
            .from("traffic_logs")
            .select("id, decision, reasons, coherence_score, country, is_mobile, created_at, fbclid")
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: false })
            .limit(300),
        )
        .then(({ data }) => setLogs((data as TrafficLog[] | null) ?? []))
        .catch((error) => toast.error(error.message));
      // fire-and-forget: fetch monitor-mode banner status
      supabase.from("app_settings").select("monitor_mode, monitor_mode_until").maybeSingle()
        .then(({ data }) => data && setMonitorMode({ on: !!(data as any).monitor_mode, until: (data as any).monitor_mode_until }));
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Traffic widget: last 48h (covers yesterday + today) via HEAD counts + refresh on focus/visibility
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    async function refresh() {
      const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const [totalRes, humansRes] = await Promise.all([
        supabase.from("traffic_logs").select("id", { count: "exact", head: true })
          .eq("user_id", userId!).gte("created_at", since),
        supabase.from("traffic_logs").select("id", { count: "exact", head: true })
          .eq("user_id", userId!).eq("decision", "money").gte("created_at", since),
      ]);
      if (cancelled) return;
      const total = Number(totalRes.count ?? 0);
      const humans = Number(humansRes.count ?? 0);
      setLiveStats({ total, humans, bots: total - humans, windowMin: 2880 });
    }
    async function refreshAll() {
      if (!userId) return;
      await Promise.all([refresh(), loadAll(userId)]);
    }
    refresh();
    const t = setInterval(refresh, 15000);
    const onFocus = () => { refreshAll(); };
    const onVis = () => { if (document.visibilityState === "visible") refreshAll(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [userId]);


  async function loadCloak(linkId: string) {
    const { data } = await supabase.from("cloaking_settings").select("*").eq("link_id", linkId).maybeSingle();
    if (data) {
      setCloakByLink((p) => ({ ...p, [linkId]: data as CloakSettings }));
    } else {
      const defaults: CloakSettings = {
        link_id: linkId, campaign_launch_mode: false, launch_window_hours: 24,
        launched_at: null, block_desktop: false, allowed_countries: [],
        safe_page_pool: [], coherence_threshold: 35, fbclid_max_hits: 2,
      };
      await supabase.from("cloaking_settings").insert(defaults);
      setCloakByLink((p) => ({ ...p, [linkId]: defaults }));
    }
  }

  async function updateCloak(linkId: string, patch: Partial<CloakSettings>) {
    const current = cloakByLink[linkId];
    const next = { ...current, ...patch };
    setCloakByLink((p) => ({ ...p, [linkId]: next }));
    const { error } = await supabase.from("cloaking_settings").update(patch).eq("link_id", linkId);
    if (error) toast.error(error.message);
  }

  async function deleteLink(id: string) {
    if (!userId || !confirm("Delete this link?")) return;
    const previousLinks = links;
    setLinks((current) => current.filter((link) => link.id !== id));
    deletedLinkIdsRef.current.add(id);
    const { error } = await (supabase as any).rpc("delete_user_link_fast", { _link_id: id });
    const fallback = error ? await supabase.from("links").update({ is_active: false }).eq("id", id).eq("user_id", userId) : { error: null };
    if (fallback.error) { deletedLinkIdsRef.current.delete(id); setLinks(previousLinks); toast.error(fallback.error.message); return; }
    toast.success("Deleted");
    loadAll(userId).catch((err) => toast.error(err.message));
  }

  function copyShort(code: string) {
    navigator.clipboard.writeText(`${window.location.origin}/r/${code}`);
    toast.success("Copied");
  }

  async function signOut() {
    setLoading(true);
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  const totalTrackedClicks = links.reduce((s, link) => s + Number(link.clicks_count || 0) + Number(link.bot_clicks_count || 0), 0);
  const totalHumanClicks = links.reduce((s, link) => s + Number(link.clicks_count || 0), 0);
  const totalFilteredClicks = links.reduce((s, link) => s + Number(link.bot_clicks_count || 0), 0);
  const monetizedClicks = Object.values(earningsByLink).reduce((s, e) => s + e.total_clicks, 0);
  const totalEarned = Object.values(earningsByLink).reduce((s, e) => s + e.earnings_usd, 0);
  const humansCount = logs.filter((l) => l.decision === "money").length;
  const botsCount = logs.length - humansCount;
  const humanPct = logs.length ? ((humansCount / logs.length) * 100) : 0;

  if (loading) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="text-foreground">


      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-7xl space-y-5 sm:space-y-7">
        {/* Hero metrics — formal summary */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard icon={Link2} label="Active Links" value={links.filter((l) => l.is_active).length.toString()} sub={`${links.length} total`} />
          <MetricCard icon={MousePointerClick} label="Total Traffic" value={totalTrackedClicks.toLocaleString()} sub={`${totalHumanClicks.toLocaleString()} human · ${totalFilteredClicks.toLocaleString()} filtered`} />
          <MetricCard icon={ShieldCheck} label="Verified Humans" value={`${humanPct.toFixed(1)}%`} sub={`${humansCount} / ${logs.length || 0} recent · ${monetizedClicks.toLocaleString()} paid`} accent="cyan" />
          <MetricCard icon={DollarSign} label="Lifetime Earned" value={`$${totalEarned.toFixed(2)}`} sub={`$${balance.toFixed(2)} available`} accent="magenta" />
        </section>

        {/* Monitor-mode banner (7-day observation window) */}
        {monitorMode.on && (
          <section className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-3 flex items-center gap-3 text-sm">
            <Activity className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <div className="flex-1">
              <span className="font-semibold text-amber-700 dark:text-amber-400">Monitor Mode active</span>
              <span className="text-muted-foreground ml-2">
                All traffic is passing through to the money page while detection accuracy is validated.
                {monitorMode.until ? ` Ends ${new Date(monitorMode.until).toLocaleString()}.` : ""}
              </span>
            </div>
          </section>
        )}

        {/* Real-time validation widget (last 48h: yesterday + today) */}
        <section className="rounded-2xl glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-display text-sm font-semibold flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" /> Real-Time Traffic Validation
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Last 48 hours (yesterday + today) · auto-refresh 15s</p>
            </div>
            <div className="text-right">
              <div className="font-display text-2xl font-bold text-gradient">
                {liveStats.total ? ((liveStats.humans / liveStats.total) * 100).toFixed(1) : "0.0"}%
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Human</div>
            </div>
          </div>
          <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-cyan-500 transition-all"
              style={{ width: `${liveStats.total ? (liveStats.humans / liveStats.total) * 100 : 0}%` }}
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
            <Mini label="Total" value={liveStats.total.toLocaleString()} />
            <Mini label="Humans" value={liveStats.humans.toLocaleString()} sub="passed" />
            <Mini label="Bots filtered" value={liveStats.bots.toLocaleString()} sub={`${liveStats.total ? ((liveStats.bots / liveStats.total) * 100).toFixed(1) : "0.0"}%`} />
          </div>
        </section>

        {/* Quick actions */}
        <section className="grid sm:grid-cols-3 gap-3">
          <Link to="/create-link" className="group rounded-2xl glass-card p-5 hover:shadow-glow transition-all">
            <Link2 className="h-6 w-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
            <div className="font-display font-semibold">Create Link</div>
            <div className="text-xs text-muted-foreground mt-0.5">Generate a new smart short link</div>
          </Link>
          <Link to="/statistics" className="group rounded-2xl glass-card p-5 hover:shadow-glow transition-all">
            <TrendingUp className="h-6 w-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
            <div className="font-display font-semibold">Full Analytics</div>
            <div className="text-xs text-muted-foreground mt-0.5">Deep dive: country, device, timeline</div>
          </Link>
          <Link to="/withdraw" className="group rounded-2xl glass-card p-5 hover:shadow-glow transition-all">
            <Wallet className="h-6 w-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
            <div className="font-display font-semibold">Withdraw</div>
            <div className="text-xs text-muted-foreground mt-0.5">Cash out via USDT (min $10)</div>
          </Link>
        </section>

        {/* Performance Meters */}
        <MetersPanel
          humanPct={humanPct}
          balance={balance}
          earningClicks={monetizedClicks}
          totalEarned={totalEarned}
          withdrawn={withdrawn}
        />

        {/* AI Protection showcase */}
        <AIProtectionPanel humans={humansCount} bots={botsCount} />

        {/* Withdraw CTA */}
        <section className="rounded-2xl glass-card p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ring-cyan">
          <div>
            <div className="font-display text-lg font-semibold">Ready to cash out?</div>
            <p className="text-sm text-muted-foreground">Minimum $10 · USDT TRC20 / BEP20 · 24h payout</p>
          </div>
          <Button asChild className="bg-primary-gradient shadow-glow text-primary-foreground"><Link to="/withdraw">Withdraw <Wallet className="h-4 w-4 ml-1" /></Link></Button>
        </section>


        {/* Recent links summary + Live traffic feed */}
        <section className="grid lg:grid-cols-[1fr_360px] gap-6">
          <div className="rounded-2xl glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">Recent Links</h2>
              <Button size="sm" variant="outline" asChild><Link to="/create-link"><Plus className="h-3.5 w-3.5 mr-1" />Manage</Link></Button>
            </div>
            {links.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">
                No links yet. <Link to="/create-link" className="text-primary underline">Create your first link →</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {links.slice(0, 5).map((l) => {
                  const e = earningsByLink[l.id];
                  const tracked = Number(l.clicks_count || 0) + Number(l.bot_clicks_count || 0);
                  return (
                    <div key={l.id} className="flex items-center justify-between gap-3 rounded-lg surface-soft px-3 py-2.5">
                      <div className="min-w-0">
                        <div className="font-display font-semibold text-sm truncate">{l.title || l.short_code}</div>
                        <div className="font-mono text-[11px] text-primary truncate">/r/{l.short_code}</div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-xs">
                        <span className="text-muted-foreground">{tracked.toLocaleString()} traffic</span>
                        <span className="text-muted-foreground">{Number(l.bot_clicks_count || 0).toLocaleString()} filtered</span>
                        <span className="font-display font-bold text-gradient">${(e?.earnings_usd ?? 0).toFixed(3)}</span>
                      </div>
                    </div>
                  );
                })}
                {links.length > 5 && (
                  <div className="text-center pt-2">
                    <Link to="/create-link" className="text-xs text-primary hover:underline">View all {links.length} links →</Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Live traffic feed */}
          <aside className="rounded-2xl glass-card p-5 h-fit lg:sticky lg:top-24">
            <h3 className="font-display text-sm font-semibold mb-3 flex items-center gap-2"><Activity className="h-4 w-4 text-primary" />Live Traffic</h3>
            {logs.length === 0 ? (
              <div className="text-xs text-muted-foreground py-6 text-center">Waiting for clicks…</div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {logs.slice(0, 20).map((row) => (
                  <div key={row.id} className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${row.decision === "money" ? "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30" : "bg-rose-500/15 text-rose-700 ring-1 ring-rose-500/30"}`}>
                        {row.decision === "money" ? "HUMAN" : "BLOCKED"}
                      </span>
                      <span className="text-muted-foreground">{new Date(row.created_at).toLocaleTimeString()}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-muted-foreground">
                      <Globe2 className="h-3 w-3" /><span>{row.country || "??"}</span>
                      <span>· {row.is_mobile ? "📱" : "🖥️"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-border">
              <Link to="/statistics" className="text-xs text-primary hover:underline">See full analytics →</Link>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub, accent }: { icon: typeof DollarSign; label: string; value: string; sub?: string; accent?: "cyan" | "magenta"; }) {
  return (
    <div className={`rounded-2xl glass-card p-5 ${accent === "cyan" ? "ring-cyan glow-cyan" : accent === "magenta" ? "ring-magenta glow-magenta" : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${accent === "cyan" ? "text-primary" : accent === "magenta" ? "text-pink-400" : "text-muted-foreground"}`} />
      </div>
      <div className={`font-display text-2xl md:text-3xl font-bold ${accent ? "text-gradient" : ""}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function Mini({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg bg-muted/40 border border-border/60 px-3 py-2">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-display font-bold ${highlight ? "text-gradient text-base" : "text-sm"}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground font-mono">{sub}</div>}
    </div>
  );
}

function CloakPanel({ cloak, onUpdate }: { cloak: CloakSettings; onUpdate: (p: Partial<CloakSettings>) => void }) {
  const [countriesInput, setCountriesInput] = useState(cloak.allowed_countries.join(", "));
  const [poolInput, setPoolInput] = useState(cloak.safe_page_pool.join("\n"));

  return (
    <div className="mt-4 border-t border-border pt-4 space-y-4">
      <div className="text-[10px] uppercase tracking-wider text-primary font-semibold">Traffic Rules</div>

      <div className="grid md:grid-cols-2 gap-3">
        <label className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2.5 cursor-pointer">
          <div>
            <div className="text-sm font-medium">🚀 Campaign Launch Mode</div>
            <div className="text-[11px] text-muted-foreground">Route ALL traffic to safe page for {cloak.launch_window_hours}h after launch</div>
          </div>
          <Switch checked={cloak.campaign_launch_mode} onCheckedChange={(v) => onUpdate({ campaign_launch_mode: v, launched_at: v ? new Date().toISOString() : cloak.launched_at })} />
        </label>

        <label className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2.5 cursor-pointer">
          <div>
            <div className="text-sm font-medium">🖥️ Block Desktop</div>
            <div className="text-[11px] text-muted-foreground">Only mobile traffic reaches the money page</div>
          </div>
          <Switch checked={cloak.block_desktop} onCheckedChange={(v) => onUpdate({ block_desktop: v })} />
        </label>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Launch window (hours)</Label>
          <Input type="number" min={1} max={72} value={cloak.launch_window_hours} onChange={(e) => onUpdate({ launch_window_hours: Math.max(1, Math.min(72, Number(e.target.value))) })} className="mt-1 bg-muted/40" />
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Coherence threshold (0-100)</Label>
          <Input type="number" min={0} max={100} value={cloak.coherence_threshold} onChange={(e) => onUpdate({ coherence_threshold: Math.max(0, Math.min(100, Number(e.target.value))) })} className="mt-1 bg-muted/40" />
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">fbclid max reuse</Label>
          <Input type="number" min={1} max={10} value={cloak.fbclid_max_hits} onChange={(e) => onUpdate({ fbclid_max_hits: Math.max(1, Math.min(10, Number(e.target.value))) })} className="mt-1 bg-muted/40" />
        </div>
      </div>

      <div>
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Allowed countries (ISO codes, comma separated; empty = all)</Label>
        <Input value={countriesInput} onChange={(e) => setCountriesInput(e.target.value)} onBlur={() => onUpdate({ allowed_countries: countriesInput.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean) })} placeholder="US, BD, IN" className="mt-1 bg-muted/40 font-mono text-sm" />
      </div>

      <div>
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Safe page pool (one URL per line, up to 5; empty = built-in article)</Label>
        <textarea value={poolInput} onChange={(e) => setPoolInput(e.target.value)} onBlur={() => onUpdate({ safe_page_pool: poolInput.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 5) })} rows={3} placeholder="https://example.com/safe-article-1" className="mt-1 w-full rounded-md bg-muted/40 border border-border px-3 py-2 text-sm font-mono" />
      </div>
    </div>
  );
}

/* ---------------- AI Protection System (showcase) ---------------- */
function AIProtectionPanel({ humans, bots }: { humans: number; bots: number }) {
  const layers = [
    { label: "mod-fp9 :: coherence",     status: "OK" },
    { label: "mod-asn :: net-class",     status: "OK" },
    { label: "mod-fbq :: token-lock",    status: "OK" },
    { label: "mod-bh4 :: interaction",   status: "OK" },
    { label: "mod-geo :: velocity",      status: "OK" },
    { label: "mod-hdr :: client-hints",  status: "OK" },
    { label: "mod-ipx :: rolling-list",  status: "OK" },
    { label: "mod-lws :: launch-window", status: "OK" },
  ];
  return (
    <section className="relative overflow-hidden rounded-2xl glass-card p-6 ring-cyan">
      <div className="absolute inset-0 grid-pattern opacity-30 pointer-events-none" />
      <div className="relative grid md:grid-cols-[1fr_auto] gap-6 items-center">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary uppercase tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            Protection layer — engaged
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
            A <span className="text-gradient">multi-stage filter</span> guards every link you create
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Each click runs through our proprietary stack tuned specifically for{" "}
            <strong className="text-foreground">Facebook → Adsterra</strong> and other ad-network campaigns.
            Reviewers, scrapers and bots get filtered out automatically — only verified humans reach your money URL,
            so your offer never gets flagged.
          </p>
          <div className="flex flex-wrap gap-4 text-xs pt-1">
            <div><span className="text-muted-foreground">Humans this session: </span><span className="font-mono text-primary">{humans}</span></div>
            <div><span className="text-muted-foreground">Filtered: </span><span className="font-mono text-[#FF3D71]">{bots}</span></div>
            <div><span className="text-muted-foreground">Added latency: </span><span className="font-mono">~12ms</span></div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background/60 p-4 font-mono text-[11px] min-w-[280px]">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">/ sys-q9 · pulse</div>
          <ul className="space-y-1.5">
            {layers.map((l) => (
              <li key={l.label} className="flex items-center justify-between gap-3">
                <span className="text-foreground/80">▸ {l.label}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">
                  {l.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Performance Meters (gauges) ---------------- */
function Gauge({
  label,
  value,
  display,
  sub,
  color = "#6366f1",
}: {
  label: string;
  value: number; // 0..100
  display: string;
  sub?: string;
  color?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const size = 140;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const gid = `g-${label.replace(/\s+/g, "-")}`;

  return (
    <div className="rounded-2xl glass-card p-5 flex flex-col items-center text-center
      shadow-[0_10px_30px_-12px_rgba(15,23,42,0.15)]">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90 drop-shadow-[0_4px_8px_rgba(99,102,241,0.15)]">
          <defs>
            <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2} cy={size / 2} r={r}
            stroke="rgba(148,163,184,0.20)" strokeWidth={stroke} fill="none"
          />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            stroke={`url(#${gid})`} strokeWidth={stroke} fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 800ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="font-display text-2xl font-bold tracking-tight">{display}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
              {pct.toFixed(0)}%
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 font-display font-semibold text-sm">{label}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function MetersPanel({
  humanPct,
  balance,
  earningClicks,
  totalEarned,
  withdrawn,
}: {
  humanPct: number;
  balance: number;
  earningClicks: number;
  totalEarned: number;
  withdrawn: number;
}) {
  const MIN_PAYOUT = 10;
  const payoutPct = Math.min(100, (balance / MIN_PAYOUT) * 100);
  // Next earning tier — $1 per 50k. Progress toward the next full dollar.
  const perDollarClicks = 50_000;
  const nextTierPct = ((earningClicks % perDollarClicks) / perDollarClicks) * 100;
  const lifetime = totalEarned + withdrawn;

  return (
    <section className="rounded-2xl glass-card p-5 sm:p-6">
      <div className="flex items-end justify-between mb-4 gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Performance Meters</h2>
          <p className="text-xs text-muted-foreground">Live gauges — traffic quality, payout progress & earning velocity.</p>
        </div>
        <div className="hidden sm:block text-[11px] text-muted-foreground font-mono">
          lifetime ${lifetime.toFixed(2)}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Gauge
          label="Traffic Quality"
          value={humanPct}
          display={`${humanPct.toFixed(0)}%`}
          sub="Verified human share"
          color="#06b6d4"
        />
        <Gauge
          label="Payout Progress"
          value={payoutPct}
          display={`$${balance.toFixed(2)}`}
          sub={`of $${MIN_PAYOUT} min withdrawal`}
          color="#6366f1"
        />
        <Gauge
          label="Next $1 Tier"
          value={nextTierPct}
          display={`${(earningClicks % perDollarClicks).toLocaleString()}`}
          sub={`clicks toward next $1 (per ${perDollarClicks.toLocaleString()})`}
          color="#ec4899"
        />
      </div>
    </section>
  );
}


