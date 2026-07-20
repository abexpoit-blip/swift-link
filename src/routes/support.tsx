import { AppShell } from "@/components/AppShell";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2,
  LifeBuoy,
  Plus,
  Send,
  Sparkles,
  ArrowLeft,
  Shield,
  User as UserIcon,
  X,
  Trash2,
  CheckCircle2,
  Search,
  MessageSquare,
} from "lucide-react";

export const Route = createFileRoute("/support")({
  component: () => (
    <AppShell>
      <SupportPage />
    </AppShell>
  ),
  head: () => ({ meta: [{ title: "Support — AdsPx" }] }),
});

type Ticket = {
  id: string;
  user_id: string;
  subject: string;
  status: "open" | "pending" | "closed";
  last_message_at: string;
  last_sender_is_admin: boolean;
  unread_for_user: boolean;
  unread_for_admin: boolean;
  created_at: string;
  user_email?: string | null;
};

type Message = {
  id: string;
  ticket_id: string;
  sender_id: string | null;
  is_admin: boolean;
  body: string;
  created_at: string;
};

const db = supabase as any;

function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function statusChip(s: Ticket["status"]) {
  const map = {
    open: "bg-emerald-500/15 text-emerald-600 ring-emerald-500/25",
    pending: "bg-amber-500/15 text-amber-600 ring-amber-500/25",
    closed: "bg-muted text-muted-foreground ring-border",
  } as const;
  return (
    <span className={`inline-flex items-center text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ring-1 ${map[s]}`}>
      {s}
    </span>
  );
}

function SupportPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");
  const [query, setQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  async function loadTickets(admin: boolean) {
    let q = db.from("support_tickets").select("*").order("last_message_at", { ascending: false }).limit(200);
    const res = await q;
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    let rows = (res.data ?? []) as Ticket[];
    if (admin && rows.length) {
      // fetch owner emails via profiles
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      const { data: profs } = await db.from("profiles").select("id, email, full_name").in("id", ids);
      const map = new Map<string, any>((profs ?? []).map((p: any) => [p.id, p]));
      rows = rows.map((r) => ({ ...r, user_email: map.get(r.user_id)?.email ?? map.get(r.user_id)?.full_name ?? null }));
    }
    setTickets(rows);
  }

  async function loadMessages(ticketId: string) {
    setMsgLoading(true);
    const { data, error } = await db
      .from("support_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    setMsgLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setMessages((data ?? []) as Message[]);
    await db.rpc("support_mark_read", { _ticket: ticketId });
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? { ...t, unread_for_user: isAdmin ? t.unread_for_user : false, unread_for_admin: isAdmin ? false : t.unread_for_admin }
          : t,
      ),
    );
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 50);
  }

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session?.user) {
        navigate({ to: "/login" });
        return;
      }
      const user = sess.session.user;
      setUid(user.id);
      const { data: roles } = await db.from("user_roles").select("role").eq("user_id", user.id);
      const admin = !!roles?.some((r: any) => r.role === "admin" || r.role === "super_admin");
      setIsAdmin(admin);
      await loadTickets(admin);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime — refresh open thread on new messages
  useEffect(() => {
    if (!openId) return;
    const ch = supabase
      .channel(`support-msgs-${openId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `ticket_id=eq.${openId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 30);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [openId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tickets.filter((t) => {
      if (filter === "open" && t.status === "closed") return false;
      if (filter === "closed" && t.status !== "closed") return false;
      if (q && !t.subject.toLowerCase().includes(q) && !(t.user_email ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tickets, filter, query]);

  const openTicket = useMemo(() => tickets.find((t) => t.id === openId) ?? null, [tickets, openId]);

  async function createTicket() {
    if (!newSubject.trim() || !newBody.trim()) return toast.error("Subject and message required");
    setCreating(true);
    const { data, error } = await db.rpc("support_create_ticket", { _subject: newSubject, _body: newBody });
    setCreating(false);
    if (error) return toast.error(error.message);
    toast.success("Ticket created — support will reply soon");
    setShowNew(false);
    setNewSubject("");
    setNewBody("");
    await loadTickets(isAdmin);
    setOpenId(data as string);
    await loadMessages(data as string);
  }

  async function sendReply() {
    if (!openTicket || !reply.trim() || !uid) return;
    if (openTicket.status === "closed") return toast.error("This ticket is closed");
    setSending(true);
    const { error } = await db.from("support_messages").insert({
      ticket_id: openTicket.id,
      sender_id: uid,
      is_admin: isAdmin,
      body: reply.trim().slice(0, 4000),
    });
    setSending(false);
    if (error) return toast.error(error.message);
    setReply("");
    await loadTickets(isAdmin);
  }

  async function closeTicket() {
    if (!openTicket) return;
    const { error } = await db.from("support_tickets").update({ status: "closed" }).eq("id", openTicket.id);
    if (error) return toast.error(error.message);
    toast.success("Ticket closed");
    await loadTickets(isAdmin);
    setOpenId(null);
  }

  async function reopenTicket() {
    if (!openTicket) return;
    const { error } = await db.from("support_tickets").update({ status: "open" }).eq("id", openTicket.id);
    if (error) return toast.error(error.message);
    await loadTickets(isAdmin);
    setTickets((prev) => prev.map((t) => (t.id === openTicket.id ? { ...t, status: "open" } : t)));
  }

  async function deleteTicket() {
    if (!openTicket) return;
    if (!confirm("Delete this ticket permanently?")) return;
    const { error } = await db.from("support_tickets").delete().eq("id", openTicket.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    setOpenId(null);
    await loadTickets(isAdmin);
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground min-h-screen">
      <main className="container mx-auto px-3 sm:px-4 md:px-6 py-6 md:py-10 max-w-6xl">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6 md:p-8 mb-6">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
              <div className="h-11 w-11 sm:h-12 sm:w-12 shrink-0 rounded-2xl bg-primary/15 text-primary grid place-items-center ring-1 ring-primary/20">
                <LifeBuoy className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="truncate font-display text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
                    {isAdmin ? "Support Center" : "Contact Support"}
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-primary/80 border border-primary/25 rounded-full px-2 py-0.5">
                    <Sparkles className="h-3 w-3" /> Premium
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {isAdmin
                    ? `${tickets.length} ticket${tickets.length === 1 ? "" : "s"} · reply, close, delete.`
                    : "24/7 human help. Average reply under 2 hours."}
                </p>
              </div>
            </div>
            {!isAdmin && (
              <Button
                onClick={() => setShowNew(true)}
                className="shrink-0 bg-primary text-primary-foreground hover:opacity-90 h-10 rounded-xl"
              >
                <Plus className="h-4 w-4 mr-1.5" /> New Ticket
              </Button>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isAdmin ? "Search subject or user…" : "Search your tickets…"}
              className="pl-9 h-10 rounded-xl bg-card border-border/70"
            />
          </div>
          <div className="flex gap-1.5 rounded-xl bg-card border border-border/70 p-1">
            {(["all", "open", "closed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 h-8 rounded-lg text-xs font-medium capitalize transition ${
                  filter === f
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Split panel */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          {/* List */}
          <div
            className={`${
              openTicket ? "hidden lg:block" : "block"
            } rounded-2xl border border-border/70 bg-card overflow-hidden`}
          >
            {filtered.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                {isAdmin ? "No tickets match." : "No tickets yet. Click New Ticket to open one."}
              </div>
            ) : (
              <ul className="divide-y divide-border/60 max-h-[70vh] overflow-y-auto">
                {filtered.map((t) => {
                  const isOpenRow = openId === t.id;
                  const unread = isAdmin ? t.unread_for_admin : t.unread_for_user;
                  return (
                    <li
                      key={t.id}
                      onClick={async () => {
                        setOpenId(t.id);
                        await loadMessages(t.id);
                      }}
                      className={`relative flex items-start gap-3 px-4 py-3.5 cursor-pointer transition ${
                        isOpenRow ? "bg-primary/5" : "hover:bg-muted/40"
                      }`}
                    >
                      {unread && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary" />}
                      <div className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-primary/25 to-primary/10 text-primary grid place-items-center">
                        <LifeBuoy className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`truncate ${unread ? "font-semibold" : "text-foreground/85"}`}>
                            {t.subject}
                          </span>
                          <span className="ml-auto text-[10px] text-muted-foreground whitespace-nowrap">
                            {timeAgo(t.last_message_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {statusChip(t.status)}
                          {isAdmin && t.user_email && (
                            <span className="text-[11px] text-muted-foreground truncate">{t.user_email}</span>
                          )}
                          {t.last_sender_is_admin && !unread && (
                            <span className="text-[10px] text-muted-foreground">· admin replied</span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Thread */}
          <div
            className={`${
              openTicket ? "block" : "hidden lg:block"
            } rounded-2xl border border-border/70 bg-card overflow-hidden flex flex-col min-h-[500px]`}
          >
            {openTicket ? (
              <>
                <header className="p-4 sm:p-5 border-b border-border/60 bg-gradient-to-br from-primary/5 to-transparent">
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => setOpenId(null)}
                      className="lg:hidden inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Back
                    </button>
                    {statusChip(openTicket.status)}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(openTicket.created_at).toLocaleString()}
                    </span>
                  </div>
                  <h2 className="font-display text-lg sm:text-xl font-bold leading-snug truncate">
                    {openTicket.subject}
                  </h2>
                  {isAdmin && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {openTicket.status !== "closed" ? (
                        <Button size="sm" variant="outline" onClick={closeTicket} className="h-8">
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Close
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={reopenTicket} className="h-8">
                          <X className="h-3.5 w-3.5 mr-1" /> Reopen
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={deleteTicket} className="h-8 text-red-600 hover:text-red-700">
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                  )}
                </header>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 max-h-[55vh]">
                  {msgLoading ? (
                    <div className="grid place-items-center py-10">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : (
                    messages.map((m) => {
                      const mine = m.sender_id === uid;
                      return (
                        <div key={m.id} className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                          {!mine && (
                            <div
                              className={`h-7 w-7 shrink-0 rounded-full grid place-items-center ${
                                m.is_admin ? "bg-primary/15 text-primary" : "bg-muted text-foreground"
                              }`}
                            >
                              {m.is_admin ? <Shield className="h-3.5 w-3.5" /> : <UserIcon className="h-3.5 w-3.5" />}
                            </div>
                          )}
                          <div
                            className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                              mine
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : m.is_admin
                                  ? "bg-primary/10 text-foreground rounded-bl-sm ring-1 ring-primary/15"
                                  : "bg-muted text-foreground rounded-bl-sm"
                            }`}
                          >
                            {m.is_admin && !mine && (
                              <div className="text-[10px] font-semibold text-primary/80 uppercase tracking-wider mb-0.5">
                                Support Team
                              </div>
                            )}
                            {m.body}
                            <div className={`text-[10px] mt-1 opacity-70 ${mine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                              {timeAgo(m.created_at)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {openTicket.status === "closed" ? (
                  <div className="border-t border-border/60 p-4 text-center text-sm text-muted-foreground bg-muted/30">
                    This ticket is closed. {isAdmin ? "Reopen to reply." : "Create a new ticket to continue."}
                  </div>
                ) : (
                  <div className="border-t border-border/60 p-3 sm:p-4 bg-card">
                    <div className="flex items-end gap-2">
                      <Textarea
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            sendReply();
                          }
                        }}
                        placeholder={isAdmin ? "Reply to user…" : "Type your message…"}
                        rows={2}
                        className="flex-1 resize-none rounded-xl bg-background border-border/70 min-h-[44px]"
                      />
                      <Button
                        onClick={sendReply}
                        disabled={sending || !reply.trim()}
                        className="h-11 rounded-xl bg-primary text-primary-foreground hover:opacity-90 shrink-0"
                      >
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">Ctrl/⌘+Enter to send</div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 grid place-items-center p-10 text-center">
                <div>
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 text-primary grid place-items-center mb-3">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isAdmin ? "Select a ticket to reply." : "Select a ticket to view the conversation."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* New Ticket modal */}
      {showNew && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4"
          onClick={() => !creating && setShowNew(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl overflow-hidden"
          >
            <div className="p-5 border-b border-border/60 bg-gradient-to-br from-primary/10 to-transparent flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary grid place-items-center">
                <LifeBuoy className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-lg font-bold">Open a new ticket</h3>
                <p className="text-xs text-muted-foreground">We usually reply within 2 hours.</p>
              </div>
              <button
                onClick={() => setShowNew(false)}
                className="h-8 w-8 grid place-items-center rounded-lg hover:bg-muted"
                disabled={creating}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Subject</label>
                <Input
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="e.g. Withdraw not processed"
                  maxLength={200}
                  className="h-10 rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Message</label>
                <Textarea
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="Describe your issue in detail…"
                  rows={5}
                  maxLength={4000}
                  className="rounded-xl resize-none"
                />
              </div>
            </div>
            <div className="p-4 border-t border-border/60 flex items-center justify-end gap-2 bg-muted/30">
              <Button variant="outline" onClick={() => setShowNew(false)} disabled={creating}>
                Cancel
              </Button>
              <Button onClick={createTicket} disabled={creating} className="bg-primary text-primary-foreground">
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Send className="h-4 w-4 mr-1.5" />}
                Send Ticket
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
