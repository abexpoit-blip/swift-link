import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Link2,
  Loader2,
  Plus,
  Copy,
  Trash2,
  ExternalLink,
  DollarSign,
  MousePointerClick,
  Wallet,
  LogOut,
  TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [{ title: "Dashboard — Linkly" }],
  }),
});

type LinkRow = {
  id: string;
  short_code: string;
  title: string | null;
  adsterra_url: string;
  clicks_count: number;
  bot_clicks_count: number;
  is_active: boolean;
  created_at: string;
};

type EarningRow = {
  link_id: string | null;
  total_clicks: number;
  adsterra_clicks: number;
  user_clicks: number;
  earnings_usd: number;
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

  // create form
  const [destUrl, setDestUrl] = useState("");
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadAll(uid: string) {
    const [profileRes, linksRes, earningsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("balance_available, balance_withdrawn, email")
        .eq("id", uid)
        .maybeSingle(),
      supabase
        .from("links")
        .select("id, short_code, title, adsterra_url, clicks_count, bot_clicks_count, is_active, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false }),
      supabase
        .from("earnings_ledger")
        .select("link_id, total_clicks, adsterra_clicks, user_clicks, earnings_usd")
        .eq("user_id", uid),
    ]);

    setBalance(Number(profileRes.data?.balance_available ?? 0));
    setWithdrawn(Number(profileRes.data?.balance_withdrawn ?? 0));
    if (profileRes.data?.email) setEmail(profileRes.data.email);

    const lks = (linksRes.data as LinkRow[] | null) ?? [];
    setLinks(lks);

    // aggregate earnings per link
    const agg: Record<string, EarningRow> = {};
    for (const e of (earningsRes.data as EarningRow[] | null) ?? []) {
      const k = e.link_id ?? "_";
      if (!agg[k]) {
        agg[k] = { link_id: e.link_id, total_clicks: 0, adsterra_clicks: 0, user_clicks: 0, earnings_usd: 0 };
      }
      agg[k].total_clicks += Number(e.total_clicks);
      agg[k].adsterra_clicks += Number(e.adsterra_clicks);
      agg[k].user_clicks += Number(e.user_clicks);
      agg[k].earnings_usd += Number(e.earnings_usd);
    }
    setEarningsByLink(agg);
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/login" });
        return;
      }
      setUserId(data.user.id);
      setEmail(data.user.email ?? "");
      await loadAll(data.user.id);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function genCode(len = 7) {
    const chars = "abcdefghijkmnpqrstuvwxyz23456789";
    let out = "";
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  async function createLink(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    try {
      const url = destUrl.trim();
      // basic URL validation
      const u = new URL(url);
      if (!["http:", "https:"].includes(u.protocol)) throw new Error("URL must start with http or https");
    } catch {
      toast.error("Enter a valid URL (https://...)");
      return;
    }
    setCreating(true);
    const short_code = genCode();
    const { error } = await supabase.from("links").insert({
      user_id: userId,
      short_code,
      title: title.trim() || null,
      adsterra_url: destUrl.trim(),
      safe_url: destUrl.trim(),
    });
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Short link created");
    setDestUrl("");
    setTitle("");
    await loadAll(userId);
  }

  async function deleteLink(id: string) {
    if (!userId) return;
    if (!confirm("Delete this link? Stats will also be removed.")) return;
    const { error } = await supabase.from("links").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Deleted");
    await loadAll(userId);
  }

  function copyShort(code: string) {
    const url = `${window.location.origin}/r/${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied");
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const totalClicks = Object.values(earningsByLink).reduce((s, e) => s + e.total_clicks, 0);
  const totalEarned = Object.values(earningsByLink).reduce((s, e) => s + e.earnings_usd, 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 glass sticky top-0 z-40">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-primary-gradient grid place-items-center shadow-glow">
              <Link2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold">
              Link<span className="text-gradient">ly</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link to="/dashboard" className="font-medium">Dashboard</Link>
            <Link to="/inbox" className="text-muted-foreground hover:text-foreground">Inbox</Link>
            <Link to="/withdraw" className="text-muted-foreground hover:text-foreground">Withdraw</Link>
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden md:inline text-xs text-muted-foreground">{email}</span>
            <Button size="sm" variant="ghost" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-1" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10 max-w-6xl space-y-8">
        {/* Stat cards */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={DollarSign}
            label="Available"
            value={`$${balance.toFixed(2)}`}
            accent
          />
          <StatCard
            icon={Wallet}
            label="Withdrawn"
            value={`$${withdrawn.toFixed(2)}`}
          />
          <StatCard
            icon={MousePointerClick}
            label="Total clicks"
            value={totalClicks.toLocaleString()}
          />
          <StatCard
            icon={TrendingUp}
            label="Lifetime earned"
            value={`$${totalEarned.toFixed(4)}`}
          />
        </section>

        {/* Withdraw CTA */}
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <div className="font-display text-lg font-semibold">Ready to cash out?</div>
            <p className="text-sm text-muted-foreground">
              Minimum $25. Pays out in USDT (TRC20 / BEP20) within 24 hours.
            </p>
          </div>
          <Button asChild className="bg-primary-gradient shadow-glow">
            <Link to="/withdraw">Withdraw earnings</Link>
          </Button>
        </section>

        {/* Create link */}
        <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
          <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" /> Create a short link
          </h2>
          <form onSubmit={createLink} className="grid md:grid-cols-[1fr_220px_auto] gap-3">
            <div>
              <Label htmlFor="dest" className="text-xs">Destination URL</Label>
              <Input
                id="dest"
                type="url"
                required
                placeholder="https://example.com/your-page"
                value={destUrl}
                onChange={(e) => setDestUrl(e.target.value)}
                maxLength={2000}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="title" className="text-xs">Title (optional)</Label>
              <Input
                id="title"
                placeholder="My YouTube video"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                className="mt-1.5"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="bg-primary-gradient shadow-glow" disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create link"}
              </Button>
            </div>
          </form>
        </section>

        {/* Link list */}
        <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
          <h2 className="font-display text-xl font-semibold mb-5">Your links</h2>
          {links.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              No links yet. Create your first one above.
            </div>
          ) : (
            <div className="space-y-3">
              {links.map((l) => {
                const e = earningsByLink[l.id];
                const total = e?.total_clicks ?? 0;
                const adsterra = e?.adsterra_clicks ?? 0;
                const userClicks = e?.user_clicks ?? 0;
                const earned = e?.earnings_usd ?? 0;
                return (
                  <div
                    key={l.id}
                    className="rounded-xl border border-border bg-background/40 p-5 hover:border-primary/40 transition"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-display font-semibold truncate">
                            {l.title || l.short_code}
                          </span>
                          {!l.is_active && (
                            <span className="rounded-full bg-muted text-muted-foreground text-[10px] px-2 py-0.5">
                              paused
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-xs text-primary truncate">
                          /r/{l.short_code}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground truncate">
                          → {l.adsterra_url}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => copyShort(l.short_code)}>
                          <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <a href={`/r/${l.short_code}`} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteLink(l.id)}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <Mini label="Total clicks" value={total.toLocaleString()} />
                      <Mini
                        label="Adsterra (4%)"
                        value={adsterra.toLocaleString()}
                        sub={`${total ? ((adsterra / total) * 100).toFixed(1) : "0.0"}%`}
                      />
                      <Mini
                        label="Your clicks"
                        value={userClicks.toLocaleString()}
                        sub={`${total ? ((userClicks / total) * 100).toFixed(1) : "0.0"}%`}
                      />
                      <Mini
                        label="Earned"
                        value={`$${earned.toFixed(4)}`}
                        highlight
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        accent ? "border-primary/30 bg-primary/5" : "border-border bg-card"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      </div>
      <div className={`font-display text-2xl font-bold ${accent ? "text-gradient" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function Mini({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg bg-card border border-border px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-display font-bold ${highlight ? "text-gradient text-lg" : "text-base"}`}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-muted-foreground font-mono">{sub}</div>}
    </div>
  );
}
