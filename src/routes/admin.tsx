import { AppShell } from "@/components/AppShell";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { simulateRedirect, type SimProfile } from "@/lib/cloak-simulate.functions";
import {
  LayoutDashboard,
  Loader2,
  LogOut,
  Send,
  Megaphone,
  Users,
  DollarSign,
  MousePointerClick,
  Wallet,
  ShieldCheck,
  Check,
  X,
  Trash2,
  Inbox,
  History,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Bot,
  User,
  Server,
  Globe,
  RotateCw,
  AlertTriangle,
  Settings2,
  TrendingUp,
  Activity,
  CircleDollarSign,
  Sparkles,
} from "lucide-react";
import { AdspxMark } from "@/components/AdspxLogo";

export const Route = createFileRoute("/admin")({
  component: () => (<AppShell><AdminPage /></AppShell>),
  validateSearch: (s: Record<string, unknown>) => ({ tab: (s.tab as string) || "overview" }),
  head: () => ({ meta: [{ title: "Admin Control Center — AdsPx" }] }),
});


type Withdrawal = {
  id: string;
  user_id: string;
  amount_usd: number;
  network: string;
  wallet_address: string;
  status: string;
  admin_comment: string | null;
  processed_at: string | null;
  created_at: string;
};

type AuditRow = {
  id: string;
  action: string;
  previous_status: string | null;
  new_status: string;
  comment: string | null;
  admin_email: string | null;
  created_at: string;
};

type MessageRow = {
  id: string;
  subject: string;
  body: string;
  is_broadcast: boolean;
  recipient_id: string | null;
  created_at: string;
};

type AdminUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  plan_slug: string | null;
  banned: boolean;
  banned_reason: string | null;
  email_confirmed_at: string | null;
  last_login_at: string | null;
  created_at: string;
  links_used: number | null;
  clicks_used: number | null;
  balance_available: number | null;
};

type AppSettings = {
  fallback_url: string | null;
  our_adsterra_url: string | null;
  injection_threshold: number | null;
  injection_count: number | null;
  daily_redirect_enabled: boolean | null;
};

type LedgerRow = { day: string; user_clicks: number; adsterra_clicks: number };

function AdminPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [adminId, setAdminId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const searchParams = Route.useSearch();
  const [tab, setTab] = useState<string>(searchParams.tab || "overview");
  useEffect(() => { if (searchParams.tab && searchParams.tab !== tab) setTab(searchParams.tab); }, [searchParams.tab]);


  // stats
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeUsers7d, setActiveUsers7d] = useState(0);
  const [totalLinks, setTotalLinks] = useState(0);
  const [botClicks, setBotClicks] = useState(0);
  const [realClicks, setRealClicks] = useState(0);
  const [partnerClicks, setPartnerClicks] = useState(0);
  const [paidOut, setPaidOut] = useState(0);
  const [pendingPayouts, setPendingPayouts] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);

  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [audits, setAudits] = useState<Record<string, AuditRow[]>>({});
  const [expandedAudit, setExpandedAudit] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<MessageRow[]>([]);

  // compose form
  const [mode, setMode] = useState<"broadcast" | "single">("broadcast");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  // user management
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);

  // system settings
  const [inactiveDays, setInactiveDays] = useState<number>(14);
  const [savingDays, setSavingDays] = useState(false);
  const [appCfg, setAppCfg] = useState<AppSettings>({
    fallback_url: "",
    our_adsterra_url: "",
    injection_threshold: 25,
    injection_count: 0,
    daily_redirect_enabled: true,
  });
  const [savingApp, setSavingApp] = useState(false);

  // decision dialog
  const [decision, setDecision] = useState<{ w: Withdrawal; action: "approved" | "rejected" } | null>(null);
  const [comment, setComment] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState(false);

  // simulator
  const runSim = useServerFn(simulateRedirect);
  const [simCode, setSimCode] = useState("");
  const [simProfile, setSimProfile] = useState<SimProfile>("fb_crawler");
  const [simRunning, setSimRunning] = useState(false);
  const [simResult, setSimResult] = useState<{
    profile: string; decision: string; reasons: string[]; safe_url: string | null; money_url: string;
    inputs: { ua: string; ip: string; country: string; asn: string; is_hard_bot: boolean; is_datacenter: boolean; is_mobile: boolean; coherence: number; fbclid: string | null };
  } | null>(null);

  async function runSimulation() {
    if (!simCode.trim()) { toast.error("Short code dao"); return; }
    setSimRunning(true);
    setSimResult(null);
    try {
      const res = await runSim({ data: { short_code: simCode.trim(), profile: simProfile } });
      setSimResult(res as any);
    } catch (e: any) {
      toast.error(e?.message || "Simulation failed");
    } finally {
      setSimRunning(false);
    }
  }

  async function loadAll() {
    const sevenAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const [
      usersRes,
      activeRes,
      linksRes,
      botRes,
      ledgerRes,
      profilesRes,
      withdrawRes,
      msgRes,
      auditRes,
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).gt("last_login_at", sevenAgo),
      supabase.from("links").select("id", { count: "exact", head: true }),
      supabase.from("clicks").select("id", { count: "exact", head: true }).eq("is_bot", true),
      supabase
        .from("earnings_ledger")
        .select("day, user_clicks, adsterra_clicks")
        .gte("day", thirtyAgo)
        .order("day", { ascending: true }),
      supabase.from("profiles").select("balance_withdrawn"),
      supabase
        .from("withdrawals")
        .select("id, user_id, amount_usd, network, wallet_address, status, admin_comment, processed_at, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("messages")
        .select("id, subject, body, is_broadcast, recipient_id, created_at")
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("withdrawal_audit")
        .select("id, withdrawal_id, action, previous_status, new_status, comment, admin_email, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    setTotalUsers(usersRes.count ?? 0);
    setActiveUsers7d(activeRes.count ?? 0);
    setTotalLinks(linksRes.count ?? 0);
    setBotClicks(botRes.count ?? 0);

    const rows = (ledgerRes.data as LedgerRow[] | null) ?? [];
    setLedger(rows);
    let real = 0, ads = 0;
    for (const r of rows) { real += Number(r.user_clicks) || 0; ads += Number(r.adsterra_clicks) || 0; }
    setRealClicks(real);
    setPartnerClicks(ads);

    const withdrawn = ((profilesRes.data as { balance_withdrawn: number }[] | null) ?? []).reduce(
      (s, p) => s + Number(p.balance_withdrawn ?? 0),
      0,
    );
    setPaidOut(withdrawn);

    const ws = (withdrawRes.data as Withdrawal[] | null) ?? [];
    setWithdrawals(ws);
    const pend = ws.filter((w) => w.status === "pending");
    setPendingPayouts(pend.reduce((s, w) => s + Number(w.amount_usd), 0));
    setPendingCount(pend.length);

    const grouped: Record<string, AuditRow[]> = {};
    for (const a of (auditRes.data as (AuditRow & { withdrawal_id: string })[] | null) ?? []) {
      (grouped[a.withdrawal_id] ??= []).push(a);
    }
    setAudits(grouped);

    setMessages((msgRes.data as MessageRow[] | null) ?? []);
  }

  async function loadAppSettings() {
    const { data } = await supabase
      .from("app_settings")
      .select("fallback_url, our_adsterra_url, injection_threshold, injection_count, daily_redirect_enabled")
      .eq("id", true)
      .maybeSingle();
    if (data) setAppCfg(data as AppSettings);
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { navigate({ to: "/login" }); return; }
      setEmail(data.user.email ?? "");
      setAdminId(data.user.id);
      const [adminCheck, superCheck] = await Promise.all([
        supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: data.user.id, _role: "super_admin" }),
      ]);
      const isAdmin = !!adminCheck.data;
      const isSuper = !!superCheck.data;
      if (!isAdmin && !isSuper) {
        toast.error("Admin access required");
        navigate({ to: "/dashboard" });
        return;
      }
      setIsSuperAdmin(isSuper);
      await Promise.all([loadAll(), loadUsers(""), loadInactiveDays(), loadAppSettings()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // derived stats
  const trend = useMemo(() => {
    // last 7 days totals per day
    const map = new Map<string, number>();
    for (const r of ledger) {
      map.set(r.day, (map.get(r.day) || 0) + Number(r.user_clicks || 0) + Number(r.adsterra_clicks || 0));
    }
    const out: { day: string; clicks: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      out.push({ day: d, clicks: map.get(d) || 0 });
    }
    return out;
  }, [ledger]);

  const clicksToday = trend[trend.length - 1]?.clicks ?? 0;
  const clicks7d = trend.reduce((s, x) => s + x.clicks, 0);
  const revenueUsd = realClicks / 100000;
  const partnerShare = realClicks + partnerClicks > 0
    ? ((partnerClicks / (realClicks + partnerClicks)) * 100).toFixed(1)
    : "0.0";

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) { toast.error("Subject and body required"); return; }
    setSending(true);
    let recipient_id: string | null = null;
    if (mode === "single") {
      const { data: p } = await supabase.from("profiles").select("id").eq("email", recipientEmail.trim().toLowerCase()).maybeSingle();
      if (!p) { setSending(false); toast.error("User not found"); return; }
      recipient_id = p.id;
    }
    const { error } = await supabase.from("messages").insert({
      sender_id: adminId, recipient_id, subject: subject.trim(), body: body.trim(),
      is_broadcast: mode === "broadcast",
    });
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success(mode === "broadcast" ? "Broadcast sent to all users" : "Message sent");
    setSubject(""); setBody(""); setRecipientEmail("");
    await loadAll();
  }

  function openDecision(w: Withdrawal, action: "approved" | "rejected") {
    setDecision({ w, action }); setComment("");
  }

  async function submitDecision() {
    if (!decision || !adminId) return;
    if (decision.action === "rejected" && !comment.trim()) { toast.error("Rejection requires a comment"); return; }
    setSubmittingDecision(true);
    const { w, action } = decision;
    const { error: updErr } = await supabase.from("withdrawals").update({
      status: action, admin_comment: comment.trim() || null, processed_by: adminId, processed_at: new Date().toISOString(),
    }).eq("id", w.id);
    if (updErr) { setSubmittingDecision(false); return toast.error(updErr.message); }
    const { error: audErr } = await supabase.from("withdrawal_audit").insert({
      withdrawal_id: w.id, admin_id: adminId, admin_email: email, action,
      previous_status: w.status, new_status: action, comment: comment.trim() || null,
    });
    setSubmittingDecision(false);
    if (audErr) toast.warning(`Updated, but audit log failed: ${audErr.message}`);
    else toast.success(`Withdrawal ${action}`);
    setDecision(null); setComment("");
    await loadAll();
  }

  async function deleteMessage(id: string) {
    if (!confirm("Delete this message?")) return;
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); await loadAll();
  }

  async function loadUsers(search = "") {
    setUsersLoading(true);
    const { data, error } = await supabase.rpc("admin_list_users", { _search: search || undefined, _limit: 200 });
    setUsersLoading(false);
    if (error) { toast.error(error.message); return; }
    setUsers((data ?? []) as AdminUser[]);
  }

  async function loadInactiveDays() {
    const { data } = await supabase.from("system_settings").select("value").eq("key", "inactive_days").maybeSingle();
    if (data?.value !== undefined && data?.value !== null) {
      const n = typeof data.value === "number" ? data.value : Number(data.value);
      if (!Number.isNaN(n)) setInactiveDays(n);
    }
  }

  async function saveInactiveDays() {
    if (inactiveDays < 1 || inactiveDays > 365) { toast.error("1 — 365 din er moddhe rakho"); return; }
    setSavingDays(true);
    const { error } = await supabase.from("system_settings")
      .upsert({ key: "inactive_days", value: inactiveDays, updated_at: new Date().toISOString() });
    setSavingDays(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Inactive threshold ${inactiveDays} days e set kora holo`);
  }

  async function saveAppSettings() {
    setSavingApp(true);
    const { error } = await supabase.from("app_settings").upsert({
      id: true,
      fallback_url: appCfg.fallback_url || undefined,
      our_adsterra_url: appCfg.our_adsterra_url || undefined,
      injection_threshold: appCfg.injection_threshold ?? 25,
      daily_redirect_enabled: appCfg.daily_redirect_enabled ?? true,
      updated_at: new Date().toISOString(),
    });
    setSavingApp(false);
    if (error) { toast.error(error.message); return; }
    toast.success("System settings saved");
  }

  async function banUser(u: AdminUser) {
    const reason = window.prompt(`Ban reason for ${u.email}?`, "Policy violation");
    if (reason === null) return;
    const { error } = await supabase.rpc("admin_set_banned", { _user_id: u.id, _banned: true, _reason: reason });
    if (error) { toast.error(error.message); return; }
    toast.success("User banned"); loadUsers(userSearch);
  }
  async function unbanUser(u: AdminUser) {
    const { error } = await supabase.rpc("admin_set_banned", { _user_id: u.id, _banned: false, _reason: undefined });
    if (error) { toast.error(error.message); return; }
    toast.success("Ban removed"); loadUsers(userSearch);
  }
  async function deleteUser(u: AdminUser) {
    if (!window.confirm(`Permanently delete ${u.email}? Data is unrecoverable.`)) return;
    const { error } = await supabase.rpc("admin_delete_user", { _user_id: u.id });
    if (error) { toast.error(error.message); return; }
    toast.success("User deleted"); loadUsers(userSearch);
  }
  async function verifyUser(u: AdminUser) {
    const { error } = await supabase.rpc("admin_verify_email", { _user_id: u.id });
    if (error) { toast.error(error.message); return; }
    toast.success("Email marked verified"); loadUsers(userSearch);
  }

  async function purgeNow() {
    if (!window.confirm(`Run inactive-user purge now (${inactiveDays}d threshold)?`)) return;
    const { data, error } = await supabase.rpc("purge_inactive_users");
    if (error) { toast.error(error.message); return; }
    toast.success(`Purged ${data ?? 0} inactive user(s)`);
    await Promise.all([loadAll(), loadUsers(userSearch)]);
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  function toggleAudit(id: string) {
    setExpandedAudit((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 glass sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <AdspxMark className="h-8 w-8" />
            <span className="font-display font-bold text-lg tracking-tight">
              Ads<span className="text-gradient">Px</span>
            </span>
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-[10px] font-semibold px-2 py-0.5">
              <ShieldCheck className="h-3 w-3" /> {isSuperAdmin ? "SUPER ADMIN" : "ADMIN"}
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">Dashboard</Link>
            <Link to="/inbox" className="text-muted-foreground hover:text-foreground">Messages</Link>
            <Link to="/admin" className="font-medium">Control Center</Link>
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden md:inline text-xs text-muted-foreground">{email}</span>
            <Button size="sm" variant="ghost" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-1" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-7xl">
        {/* Page header */}
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Control Center</div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Platform administration</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Realtime overview, moderation tools, and system configuration in one place.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <button
                onClick={() => setTab("withdrawals")}
                className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-700 px-3 py-1.5 text-xs font-semibold hover:bg-amber-500/20 transition-colors"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                {pendingCount} pending payout{pendingCount === 1 ? "" : "s"}
              </button>
            )}
            <Button size="sm" variant="outline" onClick={() => loadAll()}>
              <RotateCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="mb-6 flex flex-wrap h-auto gap-1 bg-muted/60 p-1 rounded-xl">
            <TabsTrigger value="overview" className="gap-1.5"><LayoutDashboard className="h-3.5 w-3.5" />Overview</TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5"><Users className="h-3.5 w-3.5" />Users</TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5"><History className="h-3.5 w-3.5" />User History</TabsTrigger>
            <TabsTrigger value="withdrawals" className="gap-1.5"><Wallet className="h-3.5 w-3.5" />Payouts{pendingCount > 0 && <span className="ml-1 rounded-full bg-amber-500 text-white text-[9px] px-1.5 py-0.5">{pendingCount}</span>}</TabsTrigger>
            <TabsTrigger value="ads" className="gap-1.5"><Megaphone className="h-3.5 w-3.5" />Ads Setup</TabsTrigger>
            <TabsTrigger value="performance" className="gap-1.5"><Activity className="h-3.5 w-3.5" />Performance</TabsTrigger>
            <TabsTrigger value="messages" className="gap-1.5"><Inbox className="h-3.5 w-3.5" />Messages</TabsTrigger>
            <TabsTrigger value="system" className="gap-1.5"><Settings2 className="h-3.5 w-3.5" />System</TabsTrigger>
            <TabsTrigger value="simulator" className="gap-1.5"><FlaskConical className="h-3.5 w-3.5" />Simulator</TabsTrigger>
          </TabsList>


          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-6 mt-0">
            {/* KPI grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat icon={Users} label="Total users" value={totalUsers.toLocaleString()} sub={`${activeUsers7d.toLocaleString()} active · 7d`} />
              <Stat icon={MousePointerClick} label="Real clicks · today" value={clicksToday.toLocaleString()} sub={`${clicks7d.toLocaleString()} last 7d`} accent />
              <Stat icon={Megaphone} label="Our ad clicks" value={partnerClicks.toLocaleString()} sub={`${partnerShare}% of total`} />
              <Stat icon={CircleDollarSign} label="User revenue · 30d" value={`$${revenueUsd.toFixed(4)}`} sub={`$${paidOut.toFixed(2)} paid · $${pendingPayouts.toFixed(2)} pending`} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MiniStat icon={Activity} label="Real clicks 30d" value={realClicks.toLocaleString()} />
              <MiniStat icon={Bot} label="Bot clicks (blocked)" value={botClicks.toLocaleString()} />
              <MiniStat icon={TrendingUp} label="Total links" value={totalLinks.toLocaleString()} />
              <MiniStat icon={Sparkles} label="Payout queue" value={`$${pendingPayouts.toFixed(2)}`} />
            </div>

            {/* Chart */}
            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-display text-lg font-semibold">Click volume · last 7 days</h2>
                  <p className="text-xs text-muted-foreground">Real human + partner clicks combined, per day.</p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">7d total</div>
                  <div className="font-display text-xl font-bold">{clicks7d.toLocaleString()}</div>
                </div>
              </div>
              <TrendChart data={trend} />
            </section>
          </TabsContent>

          {/* USERS */}
          <TabsContent value="users" className="mt-0">
            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
                <div>
                  <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" /> User management
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Delete, ban/unban, force-verify. Inactive users auto-purge on the schedule set in System.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Search by email or name…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") loadUsers(userSearch); }}
                  className="max-w-md"
                />
                <Button size="sm" variant="outline" onClick={() => loadUsers(userSearch)} disabled={usersLoading}>
                  {usersLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
                </Button>
              </div>

              {users.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">No users found.</div>
              ) : (
                <div className="overflow-x-auto -mx-5 sm:mx-0">
                  <table className="w-full text-sm min-w-[720px]">
                    <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3">User</th>
                        <th className="text-left py-2 px-3">Plan</th>
                        <th className="text-left py-2 px-3">Verified</th>
                        <th className="text-left py-2 px-3">Last login</th>
                        <th className="text-left py-2 px-3">Balance</th>
                        <th className="text-left py-2 px-3">Status</th>
                        <th className="text-right py-2 px-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => {
                        const lastLogin = u.last_login_at ? new Date(u.last_login_at) : null;
                        const daysIdle = lastLogin ? Math.floor((Date.now() - lastLogin.getTime()) / 86400000) : null;
                        const idleWarn = daysIdle !== null && daysIdle >= Math.max(1, inactiveDays - 3);
                        return (
                          <tr key={u.id} className="border-b border-border/60 hover:bg-muted/30">
                            <td className="py-2 px-3 min-w-0">
                              <div className="font-medium truncate max-w-[220px]">{u.email}</div>
                              <div className="text-[11px] text-muted-foreground truncate max-w-[220px]">{u.full_name || "—"}</div>
                            </td>
                            <td className="py-2 px-3 text-xs uppercase tracking-wider">{u.plan_slug ?? "free"}</td>
                            <td className="py-2 px-3">
                              {u.email_confirmed_at
                                ? <span className="text-emerald-600 text-xs">✓ verified</span>
                                : <span className="text-amber-600 text-xs">pending</span>}
                            </td>
                            <td className="py-2 px-3 text-xs">
                              {lastLogin ? <span className={idleWarn ? "text-amber-600" : ""}>{daysIdle}d ago</span> : "—"}
                            </td>
                            <td className="py-2 px-3 text-xs font-mono">${Number(u.balance_available ?? 0).toFixed(4)}</td>
                            <td className="py-2 px-3">
                              {u.banned
                                ? <span className="inline-flex items-center rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-700 px-2 py-0.5 text-[10px] uppercase tracking-wider">banned</span>
                                : <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 px-2 py-0.5 text-[10px] uppercase tracking-wider">active</span>}
                            </td>
                            <td className="py-2 px-3 text-right whitespace-nowrap">
                              <div className="inline-flex gap-1">
                                {!u.email_confirmed_at && (
                                  <Button size="sm" variant="ghost" onClick={() => verifyUser(u)} title="Mark verified">
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {u.banned
                                  ? <Button size="sm" variant="outline" onClick={() => unbanUser(u)}>Unban</Button>
                                  : <Button size="sm" variant="ghost" onClick={() => banUser(u)} title="Ban"><AlertTriangle className="h-3.5 w-3.5" /></Button>}
                                {isSuperAdmin
                                  ? <Button size="sm" variant="ghost" onClick={() => deleteUser(u)} title="Delete (super-admin only)" className="text-rose-600 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" /></Button>
                                  : <Button size="sm" variant="ghost" disabled title="Only super-admin can delete users" className="opacity-40"><Trash2 className="h-3.5 w-3.5" /></Button>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </TabsContent>

          {/* WITHDRAWALS */}
          <TabsContent value="withdrawals" className="mt-0">
            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <h2 className="font-display text-lg font-semibold mb-5 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" /> Withdrawal requests
              </h2>
              {withdrawals.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">No requests yet.</div>
              ) : (
                <div className="space-y-2">
                  {withdrawals.map((w) => {
                    const wAudits = audits[w.id] ?? [];
                    const isOpen = expandedAudit.has(w.id);
                    return (
                      <div key={w.id} className="rounded-xl border border-border bg-background/40">
                        <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-display font-bold text-gradient text-lg">${Number(w.amount_usd).toFixed(2)}</div>
                            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                              {w.network} · {new Date(w.created_at).toLocaleString()}
                            </div>
                            <div className="font-mono text-xs text-muted-foreground truncate max-w-md">{w.wallet_address}</div>
                            {w.admin_comment && (
                              <div className="mt-2 text-xs text-muted-foreground italic border-l-2 border-border pl-2">
                                &ldquo;{w.admin_comment}&rdquo;
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <StatusPill status={w.status} />
                            {w.status === "pending" && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => openDecision(w, "approved")}>
                                  <Check className="h-3.5 w-3.5 mr-1" /> Approve
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => openDecision(w, "rejected")}>
                                  <X className="h-3.5 w-3.5 mr-1" /> Reject
                                </Button>
                              </>
                            )}
                            {wAudits.length > 0 && (
                              <Button size="sm" variant="ghost" onClick={() => toggleAudit(w.id)} className="text-xs">
                                <History className="h-3.5 w-3.5 mr-1" />
                                {wAudits.length} {isOpen ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                              </Button>
                            )}
                          </div>
                        </div>
                        {isOpen && wAudits.length > 0 && (
                          <div className="border-t border-border bg-card/40 px-4 py-3 space-y-2">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Decision history</div>
                            {wAudits.map((a) => (
                              <div key={a.id} className="text-xs flex items-start gap-2">
                                <StatusPill status={a.new_status} />
                                <div className="flex-1 min-w-0">
                                  <div className="text-muted-foreground">
                                    <span className="text-foreground font-medium">{a.admin_email ?? "admin"}</span>{" "}
                                    {a.previous_status && <>changed <span className="font-mono">{a.previous_status}</span> →</>}{" "}
                                    <span className="font-mono">{a.new_status}</span> ·{" "}
                                    {new Date(a.created_at).toLocaleString()}
                                  </div>
                                  {a.comment && <div className="mt-0.5 italic">&ldquo;{a.comment}&rdquo;</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </TabsContent>

          {/* MESSAGES */}
          <TabsContent value="messages" className="space-y-6 mt-0">
            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <h2 className="font-display text-lg font-semibold mb-1 flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" /> Send notice to inbox
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Posts land in each user&apos;s Messages inbox — no popups, no banners.
              </p>
              <div className="flex gap-2 mb-4">
                <Button type="button" size="sm" variant={mode === "broadcast" ? "default" : "outline"}
                  onClick={() => setMode("broadcast")} className={mode === "broadcast" ? "bg-primary-gradient" : ""}>
                  <Megaphone className="h-3.5 w-3.5 mr-1" /> Broadcast — all users
                </Button>
                <Button type="button" size="sm" variant={mode === "single" ? "default" : "outline"}
                  onClick={() => setMode("single")} className={mode === "single" ? "bg-primary-gradient" : ""}>
                  <Users className="h-3.5 w-3.5 mr-1" /> Single user
                </Button>
              </div>
              <form onSubmit={sendMessage} className="space-y-3">
                {mode === "single" && (
                  <div>
                    <Label htmlFor="rcpt" className="text-xs">Recipient email</Label>
                    <Input id="rcpt" type="email" required value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)} placeholder="user@example.com" className="mt-1.5" />
                  </div>
                )}
                <div>
                  <Label htmlFor="subj" className="text-xs">Subject</Label>
                  <Input id="subj" required value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={140} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="body" className="text-xs">Message</Label>
                  <Textarea id="body" required value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={4000} className="mt-1.5" />
                </div>
                <Button type="submit" disabled={sending} className="bg-primary-gradient shadow-glow">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-1.5" /> Send</>}
                </Button>
              </form>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <h2 className="font-display text-lg font-semibold mb-5 flex items-center gap-2">
                <Inbox className="h-5 w-5 text-primary" /> Sent notices
              </h2>
              {messages.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">Nothing sent yet.</div>
              ) : (
                <div className="space-y-2">
                  {messages.map((m) => (
                    <div key={m.id} className="rounded-xl border border-border bg-background/40 p-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-display font-semibold">{m.subject}</span>
                          {m.is_broadcast
                            ? <span className="rounded-full bg-primary/15 text-primary text-[10px] px-2 py-0.5">broadcast</span>
                            : <span className="rounded-full bg-muted text-muted-foreground text-[10px] px-2 py-0.5">direct</span>}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{m.body}</p>
                        <div className="text-[10px] text-muted-foreground mt-1">{new Date(m.created_at).toLocaleString()}</div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => deleteMessage(m.id)} aria-label="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </TabsContent>

          {/* SYSTEM */}
          <TabsContent value="system" className="space-y-6 mt-0">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Ad injection & routing */}
              <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                <h2 className="font-display text-lg font-semibold mb-1 flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-primary" /> Ad routing & partner share
                </h2>
                <p className="text-xs text-muted-foreground mb-4">
                  Controls how often we route to our partner network vs the user&apos;s money URL.
                </p>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Our ad URL (Adsterra / partner)</Label>
                    <Input
                      value={appCfg.our_adsterra_url ?? ""}
                      onChange={(e) => setAppCfg({ ...appCfg, our_adsterra_url: e.target.value })}
                      placeholder="https://…"
                      className="mt-1.5 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Fallback URL (when nothing matches)</Label>
                    <Input
                      value={appCfg.fallback_url ?? ""}
                      onChange={(e) => setAppCfg({ ...appCfg, fallback_url: e.target.value })}
                      placeholder="https://…"
                      className="mt-1.5 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">
                      Partner injection every N clicks
                      <span className="text-muted-foreground font-normal ml-1">
                        (current: 1 in {appCfg.injection_threshold ?? 25} ≈ {(100 / (appCfg.injection_threshold || 25)).toFixed(1)}%)
                      </span>
                    </Label>
                    <Input
                      type="number" min={1} max={1000}
                      value={appCfg.injection_threshold ?? 25}
                      onChange={(e) => setAppCfg({ ...appCfg, injection_threshold: Number(e.target.value) || 25 })}
                      className="mt-1.5 w-32"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-background/40 p-3">
                    <div>
                      <div className="text-sm font-medium">Daily redirect enabled</div>
                      <div className="text-[11px] text-muted-foreground">Master switch for click routing.</div>
                    </div>
                    <Switch
                      checked={!!appCfg.daily_redirect_enabled}
                      onCheckedChange={(v) => setAppCfg({ ...appCfg, daily_redirect_enabled: v })}
                    />
                  </div>
                  <Button onClick={saveAppSettings} disabled={savingApp} className="bg-primary-gradient">
                    {savingApp ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save settings"}
                  </Button>
                </div>
              </section>

              {/* Maintenance */}
              <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                <h2 className="font-display text-lg font-semibold mb-1 flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-primary" /> Maintenance
                </h2>
                <p className="text-xs text-muted-foreground mb-4">
                  Automated cleanup schedule and on-demand utilities.
                </p>

                <div className="space-y-4">
                  <div>
                    <Label className="text-xs">Inactive-days threshold (auto-delete)</Label>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Input
                        type="number" min={1} max={365}
                        value={inactiveDays}
                        onChange={(e) => setInactiveDays(Number(e.target.value) || 0)}
                        className="w-28"
                      />
                      <Button size="sm" onClick={saveInactiveDays} disabled={savingDays}>
                        {savingDays ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      Users who don&apos;t sign in for {inactiveDays} days are auto-purged by the daily cron.
                    </p>
                  </div>

                  <div className="rounded-lg border border-border bg-background/40 p-3">
                    <div className="text-sm font-medium mb-1">Run inactive purge now</div>
                    <div className="text-[11px] text-muted-foreground mb-2">
                      Manually execute the cleanup that normally runs on schedule.
                    </div>
                    <Button size="sm" variant="outline" onClick={purgeNow}>
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Purge inactive users
                    </Button>
                  </div>

                  <div className="rounded-lg border border-border bg-background/40 p-3">
                    <div className="text-sm font-medium mb-1">Refresh dashboard cache</div>
                    <div className="text-[11px] text-muted-foreground mb-2">
                      Re-pull all stats, users, withdrawals, and messages from the database.
                    </div>
                    <Button size="sm" variant="outline" onClick={() => loadAll()}>
                      <RotateCw className="h-3.5 w-3.5 mr-1.5" /> Refresh now
                    </Button>
                  </div>
                </div>
              </section>
            </div>

            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <h2 className="font-display text-lg font-semibold mb-3">System health</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MiniStat icon={Activity} label="Bot clicks blocked" value={botClicks.toLocaleString()} />
                <MiniStat icon={MousePointerClick} label="Human clicks 30d" value={realClicks.toLocaleString()} />
                <MiniStat icon={TrendingUp} label="Total links" value={totalLinks.toLocaleString()} />
                <MiniStat icon={Users} label="Active users 7d" value={activeUsers7d.toLocaleString()} />
              </div>
            </section>
          </TabsContent>

          {/* SIMULATOR */}
          <TabsContent value="simulator" className="mt-0">
            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <h2 className="font-display text-lg font-semibold mb-1 flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-primary" /> Test Link — cloak simulator
              </h2>
              <p className="text-sm text-muted-foreground mb-5">
                Kono ekta short code er against e bivinno traffic profile simulate koro. Real click hisebe count hobe na — sudhu decision dekha jabe.
              </p>

              <div className="grid md:grid-cols-3 gap-3 mb-4">
                <div className="md:col-span-1">
                  <Label htmlFor="sim-code" className="text-xs">Short code</Label>
                  <Input id="sim-code" placeholder="abc123" value={simCode} onChange={(e) => setSimCode(e.target.value)} className="mt-1.5 font-mono" />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Traffic profile</Label>
                  <div className="mt-1.5 grid grid-cols-2 md:grid-cols-3 gap-2">
                    {(
                      [
                        { id: "fb_crawler", label: "FB Crawler", icon: Bot },
                        { id: "human_mobile_fb", label: "Mobile (FB IAB)", icon: User },
                        { id: "human_desktop", label: "Desktop human", icon: User },
                        { id: "datacenter", label: "Datacenter IP", icon: Server },
                        { id: "reused_fbclid", label: "Reused fbclid", icon: RotateCw },
                        { id: "low_coherence", label: "Low coherence", icon: AlertTriangle },
                        { id: "blocked_country", label: "Geo blocked", icon: Globe },
                      ] as { id: SimProfile; label: string; icon: typeof Bot }[]
                    ).map((p) => {
                      const Active = simProfile === p.id;
                      const Ic = p.icon;
                      return (
                        <button key={p.id} type="button" onClick={() => setSimProfile(p.id)}
                          className={`text-left rounded-lg border px-3 py-2 text-xs flex items-center gap-2 transition-colors ${Active ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background/40 text-muted-foreground hover:text-foreground"}`}>
                          <Ic className="h-3.5 w-3.5" /> {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <Button onClick={runSimulation} disabled={simRunning} className="bg-primary-gradient shadow-glow">
                {simRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <><FlaskConical className="h-4 w-4 mr-1.5" /> Run simulation</>}
              </Button>

              {simResult && (
                <div className="mt-5 rounded-xl border border-border bg-background/40 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Decision:</span>
                    <span className={`inline-flex items-center rounded-full border text-xs font-semibold uppercase tracking-wider px-3 py-1 ${
                      simResult.decision === "money"
                        ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                        : simResult.decision === "block"
                        ? "bg-rose-500/15 text-rose-700 border-rose-500/30"
                        : "bg-amber-500/15 text-amber-700 border-amber-500/30"
                    }`}>
                      → {simResult.decision === "money" ? "Money URL" : simResult.decision === "block" ? "Blocked" : "Safe Page"}
                    </span>
                  </div>

                  {simResult.reasons.length > 0 && (
                    <div className="text-xs">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Reasons</div>
                      <div className="flex flex-wrap gap-1.5">
                        {simResult.reasons.map((r, i) => (
                          <span key={i} className="rounded-md bg-muted text-foreground/80 px-2 py-0.5 text-[11px] font-mono">{r}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Inputs</div>
                      <div className="space-y-0.5 font-mono text-[11px] text-muted-foreground">
                        <div>IP: <span className="text-foreground">{simResult.inputs.ip}</span> · ASN {simResult.inputs.asn}</div>
                        <div>Country: <span className="text-foreground">{simResult.inputs.country}</span> · Mobile: {String(simResult.inputs.is_mobile)}</div>
                        <div>Hard bot: {String(simResult.inputs.is_hard_bot)} · DC: {String(simResult.inputs.is_datacenter)}</div>
                        <div>Coherence: <span className="text-foreground">{simResult.inputs.coherence}</span></div>
                        <div className="truncate" title={simResult.inputs.ua}>UA: {simResult.inputs.ua.slice(0, 60)}…</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Routes</div>
                      <div className="space-y-0.5 font-mono text-[11px] break-all">
                        <div className="text-muted-foreground">Money: <span className="text-foreground">{simResult.money_url}</span></div>
                        <div className="text-muted-foreground">Safe: <span className="text-foreground">{simResult.safe_url || "(inline article)"}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </TabsContent>
        </Tabs>
      </main>

      {/* Decision dialog */}
      <Dialog open={!!decision} onOpenChange={(o) => !o && setDecision(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">
              {decision?.action} withdrawal · ${decision ? Number(decision.w.amount_usd).toFixed(2) : ""}
            </DialogTitle>
            <DialogDescription>
              {decision?.action === "rejected"
                ? "A comment is required when rejecting."
                : "Add an optional note (e.g. transaction hash)."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-xs font-mono text-muted-foreground break-all">
              {decision?.w.network} · {decision?.w.wallet_address}
            </div>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)}
              placeholder={decision?.action === "approved" ? "Tx hash, payout reference…" : "Reason for rejection…"}
              rows={3} maxLength={500} autoFocus />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDecision(null)} disabled={submittingDecision}>Cancel</Button>
            <Button onClick={submitDecision} disabled={submittingDecision}
              className={decision?.action === "approved" ? "bg-primary-gradient" : ""}
              variant={decision?.action === "rejected" ? "destructive" : "default"}>
              {submittingDecision ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Confirm {decision?.action}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub, accent }: {
  icon: typeof DollarSign; label: string; value: string; sub?: string; accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 sm:p-5 transition-colors ${accent ? "border-primary/30 bg-primary/5" : "border-border bg-card hover:border-border/80"}`}>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      </div>
      <div className={`font-display text-xl sm:text-2xl font-bold tabular-nums ${accent ? "text-gradient" : ""}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-1 truncate">{sub}</div>}
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: {
  icon: typeof DollarSign; label: string; value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="font-display text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function TrendChart({ data }: { data: { day: string; clicks: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.clicks));
  const W = 720, H = 140, P = 24;
  const step = (W - P * 2) / Math.max(1, data.length - 1);
  const pts = data.map((d, i) => [P + i * step, H - P - (d.clicks / max) * (H - P * 2)] as const);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${H - P} L${pts[0][0].toFixed(1)},${H - P} Z`;
  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-32 sm:h-36">
        <defs>
          <linearGradient id="tc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.55 0.22 280)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="oklch(0.55 0.22 280)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* baseline */}
        <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="currentColor" strokeOpacity="0.15" />
        <path d={area} fill="url(#tc-fill)" />
        <path d={line} fill="none" stroke="oklch(0.55 0.22 280)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p[0]} cy={p[1]} r="3" fill="oklch(0.55 0.22 280)" />
            <text x={p[0]} y={H - 6} textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.55">
              {data[i].day.slice(5)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-700 border-amber-500/30",
    approved: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
    rejected: "bg-rose-500/15 text-rose-700 border-rose-500/30",
    paid: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  };
  return (
    <span className={`inline-flex items-center rounded-full border text-[10px] uppercase tracking-wider px-2 py-0.5 ${map[status] ?? "bg-muted text-muted-foreground border-border"}`}>
      {status}
    </span>
  );
}
