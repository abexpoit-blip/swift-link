import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  component: DashboardPage,
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
  const [email, setEmail] = useState<string>("");
  const [balance, setBalance] = useState(0);
  const [withdrawn, setWithdrawn] = useState(0);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [earningsByLink, setEarningsByLink] = useState<Record<string, EarningRow>>({});
  const [logs, setLogs] = useState<TrafficLog[]>([]);
  const [expandedLink, setExpandedLink] = useState<string | null>(null);
  const [cloakByLink, setCloakByLink] = useState<Record<string, CloakSettings>>({});

  const [destUrl, setDestUrl] = useState("");
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadAll(uid: string) {
    const [profileRes, linksRes, earningsRes, logsRes] = await Promise.all([
      supabase.from("profiles").select("balance_available, balance_withdrawn, email").eq("id", uid).maybeSingle(),
      supabase.from("links").select("id, short_code, title, adsterra_url, clicks_count, bot_clicks_count, is_active, created_at").eq("user_id", uid).order("created_at", { ascending: false }),
      supabase.from("earnings_ledger").select("link_id, total_clicks, adsterra_clicks, user_clicks, earnings_usd").eq("user_id", uid),
      supabase.from("traffic_logs").select("id, decision, reasons, coherence_score, country, is_mobile, created_at, fbclid").eq("user_id", uid).order("created_at", { ascending: false }).limit(50),
    ]);
    setBalance(Number(profileRes.data?.balance_available ?? 0));
    setWithdrawn(Number(profileRes.data?.balance_withdrawn ?? 0));
    if (profileRes.data?.email) setEmail(profileRes.data.email);
    const lks = (linksRes.data as LinkRow[] | null) ?? [];
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
    setLogs((logsRes.data as TrafficLog[] | null) ?? []);
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { navigate({ to: "/login" }); return; }
      setUserId(data.user.id);
      setEmail(data.user.email ?? "");
      await loadAll(data.user.id);
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadCloak(linkId: string) {
    const { data } = await supabase.from("cloaking_settings").select("*").eq("link_id", linkId).maybeSingle();
    if (data) {
      setCloakByLink((p) => ({ ...p, [linkId]: data as CloakSettings }));
    } else {
      const defaults: CloakSettings = {
        link_id: linkId, campaign_launch_mode: false, launch_window_hours: 24,
        launched_at: null, block_desktop: false, allowed_countries: [],
        safe_page_pool: [], coherence_threshold: 80, fbclid_max_hits: 2,
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

  function genCode(len = 7) {
    const chars = "abcdefghijkmnpqrstuvwxyz23456789";
    let out = ""; for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  async function createLink(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    try {
      const u = new URL(destUrl.trim());
      if (!["http:", "https:"].includes(u.protocol)) throw new Error();
    } catch { toast.error("Enter a valid https URL"); return; }
    setCreating(true);
    const { error } = await supabase.from("links").insert({
      user_id: userId, short_code: genCode(),
      title: title.trim() || null, adsterra_url: destUrl.trim(), safe_url: undefined,
    });
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Short link created");
    setDestUrl(""); setTitle("");
    await loadAll(userId);
  }

  async function deleteLink(id: string) {
    if (!userId || !confirm("Delete this link?")) return;
    const { error } = await supabase.from("links").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    await loadAll(userId);
  }

  function copyShort(code: string) {
    navigator.clipboard.writeText(`${window.location.origin}/r/${code}`);
    toast.success("Copied");
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  const totalClicks = Object.values(earningsByLink).reduce((s, e) => s + e.total_clicks, 0);
  const totalEarned = Object.values(earningsByLink).reduce((s, e) => s + e.earnings_usd, 0);
  const humansCount = logs.filter((l) => l.decision === "money").length;
  const botsCount = logs.length - humansCount;
  const humanPct = logs.length ? ((humansCount / logs.length) * 100) : 0;

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
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link to="/dashboard" className="font-medium text-primary">Console</Link>
            <Link to="/inbox" className="text-muted-foreground hover:text-foreground flex items-center gap-1.5"><InboxIcon className="h-3.5 w-3.5" />Inbox</Link>
            <Link to="/withdraw" className="text-muted-foreground hover:text-foreground">Withdraw</Link>
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden md:inline text-xs text-muted-foreground">{email}</span>
            <Button size="sm" variant="ghost" onClick={signOut}><LogOut className="h-4 w-4 mr-1" />Sign out</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10 max-w-7xl space-y-8">
        {/* Hero metrics */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard icon={ShieldCheck} label="Verified Humans" value={`${humanPct.toFixed(1)}%`} sub={`${humansCount} / ${logs.length || 0} recent`} accent="cyan" />
          <MetricCard icon={Bot} label="Crawlers Contained" value={logs.length ? "100%" : "—"} sub={`${botsCount} blocked`} accent="magenta" />
          <MetricCard icon={MousePointerClick} label="Total Clicks" value={totalClicks.toLocaleString()} />
          <MetricCard icon={DollarSign} label="Lifetime Earned" value={`$${totalEarned.toFixed(4)}`} sub={`$${balance.toFixed(2)} available`} />
        </section>

        {/* Withdraw CTA */}
        <section className="rounded-2xl glass-card p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ring-cyan">
          <div>
            <div className="font-display text-lg font-semibold">Ready to cash out?</div>
            <p className="text-sm text-muted-foreground">Minimum $25 · USDT TRC20 / BEP20 · 24h payout</p>
          </div>
          <Button asChild className="bg-primary-gradient shadow-glow text-primary-foreground"><Link to="/withdraw">Withdraw <Wallet className="h-4 w-4 ml-1" /></Link></Button>
        </section>

        {/* Create + List grid */}
        <section className="grid lg:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-6">
            <div className="rounded-2xl glass-card p-6">
              <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2"><Plus className="h-5 w-5 text-primary" /> Create cloaked link</h2>
              <form onSubmit={createLink} className="grid md:grid-cols-[1fr_200px_auto] gap-3">
                <div>
                  <Label htmlFor="dest" className="text-xs uppercase tracking-wider text-muted-foreground">Money URL (ad partner)</Label>
                  <Input id="dest" type="url" required placeholder="https://offer.adsterra.com/..." value={destUrl} onChange={(e) => setDestUrl(e.target.value)} maxLength={2000} className="mt-1.5 bg-muted/40" />
                </div>
                <div>
                  <Label htmlFor="title" className="text-xs uppercase tracking-wider text-muted-foreground">Label</Label>
                  <Input id="title" placeholder="Campaign name" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="mt-1.5 bg-muted/40" />
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="bg-primary-gradient shadow-glow text-primary-foreground" disabled={creating}>
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                  </Button>
                </div>
              </form>
            </div>

            <div className="rounded-2xl glass-card p-6">
              <h2 className="font-display text-lg font-semibold mb-5">Cloaked links</h2>
              {links.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted-foreground">No links yet.</div>
              ) : (
                <div className="space-y-3">
                  {links.map((l) => {
                    const e = earningsByLink[l.id];
                    const total = e?.total_clicks ?? 0;
                    const ads = e?.adsterra_clicks ?? 0;
                    const usr = e?.user_clicks ?? 0;
                    const earned = e?.earnings_usd ?? 0;
                    const expanded = expandedLink === l.id;
                    const cloak = cloakByLink[l.id];
                    return (
                      <div key={l.id} className="rounded-xl surface-soft p-4 hover:shadow-card">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-display font-semibold truncate">{l.title || l.short_code}</span>
                              {!l.is_active && <span className="rounded-full bg-muted text-muted-foreground text-[10px] px-2 py-0.5">paused</span>}
                            </div>
                            <div className="font-mono text-xs text-primary truncate">/r/{l.short_code}</div>
                            <div className="font-mono text-[11px] text-muted-foreground truncate">→ {l.adsterra_url}</div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button size="sm" variant="outline" onClick={() => copyShort(l.short_code)}><Copy className="h-3.5 w-3.5 mr-1" />Copy</Button>
                            <Button size="sm" variant="outline" asChild><a href={`/r/${l.short_code}`} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a></Button>
                            <Button size="sm" variant="ghost" onClick={() => { const next = expanded ? null : l.id; setExpandedLink(next); if (next && !cloakByLink[l.id]) loadCloak(l.id); }}>
                              <Settings2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => deleteLink(l.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <Mini label="Clicks" value={total.toLocaleString()} />
                          <Mini label="Partner 4%" value={ads.toLocaleString()} sub={`${total ? ((ads / total) * 100).toFixed(1) : "0"}%`} />
                          <Mini label="Yours" value={usr.toLocaleString()} />
                          <Mini label="Earned" value={`$${earned.toFixed(4)}`} highlight />
                        </div>
                        {expanded && cloak && (
                          <CloakPanel cloak={cloak} onUpdate={(p) => updateCloak(l.id, p)} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Live traffic feed */}
          <aside className="rounded-2xl glass-card p-5 h-fit lg:sticky lg:top-24">
            <h3 className="font-display text-sm font-semibold mb-3 flex items-center gap-2"><Activity className="h-4 w-4 text-primary" />Live Traffic Log</h3>
            {logs.length === 0 ? (
              <div className="text-xs text-muted-foreground py-6 text-center">Waiting for clicks…</div>
            ) : (
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {logs.slice(0, 30).map((row) => (
                  <div key={row.id} className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${row.decision === "money" ? "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30" : "bg-rose-500/15 text-rose-700 ring-1 ring-rose-500/30"}`}>
                        {row.decision === "money" ? "HUMAN" : "BLOCKED"}
                      </span>
                      <span className="text-muted-foreground">{new Date(row.created_at).toLocaleTimeString()}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-muted-foreground">
                      <Globe2 className="h-3 w-3" /><span>{row.country || "??"}</span>
                      <span>· {row.is_mobile ? "📱 mobile" : "🖥️ desktop"}</span>
                      {row.coherence_score != null && <span>· score {row.coherence_score}</span>}
                    </div>
                    {row.reasons.length > 0 && (
                      <div className="mt-1 text-[10px] text-rose-700/80 font-mono truncate">{row.reasons.join(" · ")}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
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
      <div className="text-[10px] uppercase tracking-wider text-primary font-semibold">Cloaking Rules</div>

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
