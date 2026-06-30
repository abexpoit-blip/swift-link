import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Link2,
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
} from "lucide-react";
import { AdspxMark } from "@/components/AdspxLogo";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin — AdsPx" }] }),
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

function AdminPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [adminId, setAdminId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [totalUsers, setTotalUsers] = useState(0);
  const [realClicks, setRealClicks] = useState(0);
  const [partnerClicks, setAdsterraClicks] = useState(0);
  const [paidOut, setPaidOut] = useState(0);
  const [pendingPayouts, setPendingPayouts] = useState(0);

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
  const [inactiveDays, setInactiveDays] = useState<number>(14);
  const [savingDays, setSavingDays] = useState(false);


  // decision dialog
  const [decision, setDecision] = useState<{ w: Withdrawal; action: "approved" | "rejected" } | null>(null);
  const [comment, setComment] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState(false);

  // test link simulator
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
    const [usersRes, ledgerRes, profilesRes, withdrawRes, msgRes, auditRes] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("earnings_ledger").select("adsterra_clicks, user_clicks"),
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

    let real = 0;
    let ads = 0;
    for (const r of (ledgerRes.data as { user_clicks: number; adsterra_clicks: number }[] | null) ?? []) {
      real += Number(r.user_clicks);
      ads += Number(r.adsterra_clicks);
    }
    setRealClicks(real);
    setAdsterraClicks(ads);

    const withdrawn = ((profilesRes.data as { balance_withdrawn: number }[] | null) ?? []).reduce(
      (s, p) => s + Number(p.balance_withdrawn ?? 0),
      0,
    );
    setPaidOut(withdrawn);

    const ws = (withdrawRes.data as Withdrawal[] | null) ?? [];
    setWithdrawals(ws);
    setPendingPayouts(
      ws.filter((w) => w.status === "pending").reduce((s, w) => s + Number(w.amount_usd), 0),
    );

    const grouped: Record<string, AuditRow[]> = {};
    for (const a of (auditRes.data as (AuditRow & { withdrawal_id: string })[] | null) ?? []) {
      (grouped[a.withdrawal_id] ??= []).push(a);
    }
    setAudits(grouped);

    setMessages((msgRes.data as MessageRow[] | null) ?? []);
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/login" });
        return;
      }
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
      await loadAll();
      await Promise.all([loadUsers(""), loadInactiveDays()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and body required");
      return;
    }
    setSending(true);
    let recipient_id: string | null = null;
    if (mode === "single") {
      const { data: p } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", recipientEmail.trim().toLowerCase())
        .maybeSingle();
      if (!p) {
        setSending(false);
        toast.error("User not found");
        return;
      }
      recipient_id = p.id;
    }
    const { error } = await supabase.from("messages").insert({
      sender_id: adminId,
      recipient_id,
      subject: subject.trim(),
      body: body.trim(),
      is_broadcast: mode === "broadcast",
    });
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success(mode === "broadcast" ? "Broadcast sent to all users" : "Message sent");
    setSubject("");
    setBody("");
    setRecipientEmail("");
    await loadAll();
  }

  function openDecision(w: Withdrawal, action: "approved" | "rejected") {
    setDecision({ w, action });
    setComment("");
  }

  async function submitDecision() {
    if (!decision || !adminId) return;
    if (decision.action === "rejected" && !comment.trim()) {
      toast.error("Rejection requires a comment");
      return;
    }
    setSubmittingDecision(true);
    const { w, action } = decision;
    const { error: updErr } = await supabase
      .from("withdrawals")
      .update({
        status: action,
        admin_comment: comment.trim() || null,
        processed_by: adminId,
        processed_at: new Date().toISOString(),
      })
      .eq("id", w.id);
    if (updErr) {
      setSubmittingDecision(false);
      return toast.error(updErr.message);
    }
    const { error: audErr } = await supabase.from("withdrawal_audit").insert({
      withdrawal_id: w.id,
      admin_id: adminId,
      admin_email: email,
      action,
      previous_status: w.status,
      new_status: action,
      comment: comment.trim() || null,
    });
    setSubmittingDecision(false);
    if (audErr) toast.warning(`Updated, but audit log failed: ${audErr.message}`);
    else toast.success(`Withdrawal ${action}`);
    setDecision(null);
    setComment("");
    await loadAll();
  }

  async function deleteMessage(id: string) {
    if (!confirm("Delete this message?")) return;
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    await loadAll();
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
    const { error } = await supabase
      .from("system_settings")
      .upsert({ key: "inactive_days", value: inactiveDays, updated_at: new Date().toISOString() });
    setSavingDays(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Inactive threshold ${inactiveDays} days e set kora holo`);
  }

  async function banUser(u: AdminUser) {
    const reason = window.prompt(`Ban reason for ${u.email}?`, "Policy violation");
    if (reason === null) return;
    const { error } = await supabase.rpc("admin_set_banned", { _user_id: u.id, _banned: true, _reason: reason });
    if (error) { toast.error(error.message); return; }
    toast.success("User banned");
    loadUsers(userSearch);
  }

  async function unbanUser(u: AdminUser) {
    const { error } = await supabase.rpc("admin_set_banned", { _user_id: u.id, _banned: false, _reason: undefined });
    if (error) { toast.error(error.message); return; }
    toast.success("Ban removed");
    loadUsers(userSearch);
  }

  async function deleteUser(u: AdminUser) {
    if (!window.confirm(`Permanently delete ${u.email}? Data is unrecoverable.`)) return;
    const { error } = await supabase.rpc("admin_delete_user", { _user_id: u.id });
    if (error) { toast.error(error.message); return; }
    toast.success("User deleted");
    loadUsers(userSearch);
  }

  async function verifyUser(u: AdminUser) {
    const { error } = await supabase.rpc("admin_verify_email", { _user_id: u.id });
    if (error) { toast.error(error.message); return; }
    toast.success("Email marked verified");
    loadUsers(userSearch);
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

  const revenueUsd = realClicks / 100000;

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
            <Link to="/admin" className="font-medium">Admin</Link>
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
        <section>
          <div className="flex items-end justify-between mb-4">
            <div>
              <h1 className="font-display text-2xl font-bold">Platform overview</h1>
              <p className="text-sm text-muted-foreground">
                Revenue counts <span className="text-foreground font-semibold">real human traffic only</span> — bot & blocked clicks are excluded.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Stat icon={Users} label="Total users" value={totalUsers.toLocaleString()} />
            <Stat icon={MousePointerClick} label="Real clicks (paid)" value={realClicks.toLocaleString()} accent />
            <Stat icon={Megaphone} label="Ad partner (4%)" value={partnerClicks.toLocaleString()} />
            <Stat icon={DollarSign} label="User revenue" value={`$${revenueUsd.toFixed(4)}`} />
            <Stat icon={Wallet} label="Paid out" value={`$${paidOut.toFixed(2)}`} sub={`Pending $${pendingPayouts.toFixed(2)}`} />
          </div>
        </section>

        {/* Send notice */}
        <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
          <h2 className="font-display text-xl font-semibold mb-1 flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" /> Send notice to inbox
          </h2>
          <p className="text-sm text-muted-foreground mb-5">
            Posts land in each user&apos;s Inbox — no popups, no banners.
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

        {/* User management */}
        <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
          <div className="flex items-end justify-between gap-4 flex-wrap mb-5">
            <div>
              <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> User management
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Delete, ban/unban, force-verify. Inactive users auto-delete after the threshold below.
              </p>
            </div>
            <div className="flex items-end gap-2">
              <div>
                <Label className="text-xs">Inactive-days threshold</Label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={inactiveDays}
                  onChange={(e) => setInactiveDays(Number(e.target.value) || 0)}
                  className="mt-1.5 w-28"
                />
              </div>
              <Button size="sm" onClick={saveInactiveDays} disabled={savingDays}>
                {savingDays ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
              </Button>
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-3">User</th>
                    <th className="text-left py-2 pr-3">Plan</th>
                    <th className="text-left py-2 pr-3">Verified</th>
                    <th className="text-left py-2 pr-3">Last login</th>
                    <th className="text-left py-2 pr-3">Status</th>
                    <th className="text-right py-2 pl-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const lastLogin = u.last_login_at ? new Date(u.last_login_at) : null;
                    const daysIdle = lastLogin ? Math.floor((Date.now() - lastLogin.getTime()) / 86400000) : null;
                    const idleWarn = daysIdle !== null && daysIdle >= Math.max(1, inactiveDays - 3);
                    return (
                      <tr key={u.id} className="border-b border-border/60">
                        <td className="py-2 pr-3 min-w-0">
                          <div className="font-medium truncate max-w-[220px]">{u.email}</div>
                          <div className="text-[11px] text-muted-foreground truncate max-w-[220px]">{u.full_name || "—"}</div>
                        </td>
                        <td className="py-2 pr-3 text-xs uppercase tracking-wider">{u.plan_slug ?? "free"}</td>
                        <td className="py-2 pr-3">
                          {u.email_confirmed_at ? (
                            <span className="text-emerald-600 text-xs">✓ verified</span>
                          ) : (
                            <span className="text-amber-600 text-xs">pending</span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-xs">
                          {lastLogin ? (
                            <span className={idleWarn ? "text-amber-600" : ""}>
                              {daysIdle}d ago
                            </span>
                          ) : "—"}
                        </td>
                        <td className="py-2 pr-3">
                          {u.banned ? (
                            <span className="inline-flex items-center rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-700 px-2 py-0.5 text-[10px] uppercase tracking-wider">banned</span>
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 px-2 py-0.5 text-[10px] uppercase tracking-wider">active</span>
                          )}
                        </td>
                        <td className="py-2 pl-3 text-right whitespace-nowrap">
                          <div className="inline-flex gap-1">
                            {!u.email_confirmed_at && (
                              <Button size="sm" variant="ghost" onClick={() => verifyUser(u)} title="Mark verified">
                                <ShieldCheck className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {u.banned ? (
                              <Button size="sm" variant="outline" onClick={() => unbanUser(u)}>Unban</Button>
                            ) : (
                              <Button size="sm" variant="ghost" onClick={() => banUser(u)} title="Ban">
                                <AlertTriangle className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {isSuperAdmin ? (
                              <Button size="sm" variant="ghost" onClick={() => deleteUser(u)} title="Delete (super-admin only)" className="text-rose-600 hover:text-rose-700">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" disabled title="Only super-admin can delete users" className="opacity-40">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
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


        {/* Withdrawals */}
        <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
          <h2 className="font-display text-xl font-semibold mb-5">Withdrawal requests</h2>
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

        {/* Test Link — cloaking simulator */}
        <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
          <h2 className="font-display text-xl font-semibold mb-1 flex items-center gap-2">
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
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSimProfile(p.id)}
                      className={`text-left rounded-lg border px-3 py-2 text-xs flex items-center gap-2 transition-colors ${Active ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background/40 text-muted-foreground hover:text-foreground"}`}
                    >
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

        {/* Sent messages */}
        <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
          <h2 className="font-display text-xl font-semibold mb-5 flex items-center gap-2">
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
                      {m.is_broadcast ? (
                        <span className="rounded-full bg-primary/15 text-primary text-[10px] px-2 py-0.5">broadcast</span>
                      ) : (
                        <span className="rounded-full bg-muted text-muted-foreground text-[10px] px-2 py-0.5">direct</span>
                      )}
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
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={decision?.action === "approved" ? "Tx hash, payout reference…" : "Reason for rejection…"}
              rows={3}
              maxLength={500}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDecision(null)} disabled={submittingDecision}>Cancel</Button>
            <Button
              onClick={submitDecision}
              disabled={submittingDecision}
              className={decision?.action === "approved" ? "bg-primary-gradient" : ""}
              variant={decision?.action === "rejected" ? "destructive" : "default"}
            >
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
    <div className={`rounded-2xl border p-5 ${accent ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      </div>
      <div className={`font-display text-2xl font-bold ${accent ? "text-gradient" : ""}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-1">{sub}</div>}
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
