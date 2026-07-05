import { AppShell } from "@/components/AppShell";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2, Plus, Copy, Trash2, ExternalLink, Settings2, Link2,
} from "lucide-react";

export const Route = createFileRoute("/create-link")({
  component: () => (<AppShell><CreateLinkPage /></AppShell>),
  head: () => ({ meta: [{ title: "Create Link — AdsPx" }] }),
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

const FREE_LINK_LIMIT = 100;

function CreateLinkPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [linkLimit, setLinkLimit] = useState<number | null>(FREE_LINK_LIMIT);
  const [earningsByLink, setEarningsByLink] = useState<Record<string, EarningRow>>({});
  const [expandedLink, setExpandedLink] = useState<string | null>(null);
  const [cloakByLink, setCloakByLink] = useState<Record<string, CloakSettings>>({});
  const [destUrl, setDestUrl] = useState("");
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadAll(uid: string) {
    const [profileRes, linksRes, earningsRes] = await Promise.all([
      supabase.from("profiles").select("link_limit, plan_slug").eq("id", uid).maybeSingle(),
      supabase.from("links").select("id, short_code, title, adsterra_url, clicks_count, bot_clicks_count, is_active, created_at").eq("user_id", uid).order("created_at", { ascending: false }),
      supabase.from("earnings_ledger").select("link_id, total_clicks, adsterra_clicks, user_clicks, earnings_usd").eq("user_id", uid),
    ]);
    const profile = profileRes.data as { link_limit: number | null; plan_slug: string | null } | null;
    setLinkLimit(profile?.plan_slug === "free" ? Math.max(Number(profile?.link_limit ?? FREE_LINK_LIMIT), FREE_LINK_LIMIT) : profile?.link_limit ?? null);
    setLinks((linksRes.data as LinkRow[] | null) ?? []);
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
  }

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/login" }); return; }
      setUserId(session.user.id);
      await loadAll(session.user.id);
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
    if (error) {
      toast.error(error.message.replace("(1/1)", `(1/${FREE_LINK_LIMIT})`));
      return;
    }
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

  const linksUsedText = useMemo(() => {
    if (linkLimit === null) return `${links.length} / Unlimited`;
    return `${links.length} / ${linkLimit}`;
  }, [linkLimit, links.length]);

  if (loading) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen text-foreground">
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
          <Link2 className="h-6 w-6 text-primary" />
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold tracking-tight">Create Smart Link</h1>
            <p className="text-sm text-muted-foreground">Generate protected short links and manage traffic rules</p>
          </div>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-medium text-primary shrink-0">
            Link usage: <span className="font-mono">{linksUsedText}</span>
          </div>
        </div>

        {/* Create form */}
        <div className="rounded-2xl glass-card p-6">
          <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2"><Plus className="h-5 w-5 text-primary" /> New smart link</h2>
          <form onSubmit={createLink} className="grid md:grid-cols-[1fr_200px_auto] gap-3">
            <div>
              <Label htmlFor="dest" className="text-xs uppercase tracking-wider text-muted-foreground">Money URL (ad partner)</Label>
              <Input id="dest" type="url" required placeholder="https://offer.your-ad-network.com/..." value={destUrl} onChange={(e) => setDestUrl(e.target.value)} maxLength={2000} className="mt-1.5 bg-muted/40" />
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

        {/* Links list */}
        <div className="rounded-2xl glass-card p-6">
          <h2 className="font-display text-lg font-semibold mb-5">Your smart links ({links.length})</h2>
          {links.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">No links yet. Create your first one above.</div>
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
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      <Mini label="Total Clicks" value={total.toLocaleString()} />
                      <Mini label="Verified Humans" value={usr.toLocaleString()} sub={`${total ? ((usr / total) * 100).toFixed(1) : "0"}%`} />
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
      </main>
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
