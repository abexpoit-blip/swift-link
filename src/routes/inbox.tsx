import { AppShell } from "@/components/AppShell";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2,
  Inbox as InboxIcon,
  Megaphone,
  Mail,
  CheckCheck,
  Search,
  Sparkles,
  ArrowLeft,
  Circle,
  Bell,
} from "lucide-react";

export const Route = createFileRoute("/inbox")({
  component: () => (
    <AppShell>
      <InboxPage />
    </AppShell>
  ),
  head: () => ({ meta: [{ title: "Messages — AdsPx" }] }),
});

type Msg = {
  id: string;
  subject: string;
  body: string;
  is_broadcast: boolean;
  recipient_id: string | null;
  created_at: string;
};

type FilterKind = "all" | "direct" | "broadcast" | "unread";

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

function InboxPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(true);
  const [resending, setResending] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [kind, setKind] = useState<FilterKind>("all");
  const [query, setQuery] = useState("");

  async function load(uid: string) {
    const [msgRes, readRes] = await Promise.all([
      supabase
        .from("messages")
        .select("id, subject, body, is_broadcast, recipient_id, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("message_reads").select("message_id").eq("user_id", uid),
    ]);
    setMessages((msgRes.data as Msg[] | null) ?? []);
    setReadIds(
      new Set(((readRes.data as { message_id: string }[] | null) ?? []).map((r) => r.message_id))
    );
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
      setEmailVerified(!!data.user.email_confirmed_at);
      await load(data.user.id);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function resendVerification() {
    if (!email) return;
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setResending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Verification email sent. Check your Gmail inbox.");
  }

  const counts = useMemo(() => {
    const unread = messages.filter((m) => !readIds.has(m.id)).length;
    const broadcast = messages.filter((m) => m.is_broadcast).length;
    const direct = messages.filter((m) => !m.is_broadcast).length;
    return { unread, broadcast, direct, all: messages.length };
  }, [messages, readIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return messages.filter((m) => {
      if (kind === "direct" && m.is_broadcast) return false;
      if (kind === "broadcast" && !m.is_broadcast) return false;
      if (kind === "unread" && readIds.has(m.id)) return false;
      if (
        q &&
        !m.subject.toLowerCase().includes(q) &&
        !m.body.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [messages, kind, query, readIds]);

  const openMsg = useMemo(() => messages.find((m) => m.id === openId) ?? null, [messages, openId]);

  async function openMessage(m: Msg) {
    setOpenId(m.id);
    if (!userId || readIds.has(m.id)) return;
    await supabase.from("message_reads").insert({ message_id: m.id, user_id: userId });
    setReadIds((prev) => new Set(prev).add(m.id));
  }

  function toggleSelect(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function markSelectedRead() {
    const ids = Array.from(selected).filter((id) => !readIds.has(id));
    if (ids.length === 0) return toast.info("Nothing to mark");
    const { error } = await supabase.rpc("mark_messages_read", { _ids: ids });
    if (error) return toast.error(error.message);
    setReadIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    setSelected(new Set());
    toast.success(`Marked ${ids.length} as read`);
  }

  async function markAllRead() {
    if (!userId) return;
    const ids = messages.map((m) => m.id).filter((id) => !readIds.has(id));
    if (ids.length === 0) return toast.info("All caught up");
    const { error } = await supabase.rpc("mark_messages_read", { _ids: ids });
    if (error) return toast.error(error.message);
    setReadIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    toast.success(`Marked ${ids.length} as read`);
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const tabs: { key: FilterKind; label: string; count: number; icon: typeof Bell }[] = [
    { key: "all", label: "All", count: counts.all, icon: InboxIcon },
    { key: "unread", label: "Unread", count: counts.unread, icon: Circle },
    { key: "broadcast", label: "Announcements", count: counts.broadcast, icon: Megaphone },
    { key: "direct", label: "Direct", count: counts.direct, icon: Mail },
  ];

  return (
    <div className="bg-background text-foreground min-h-screen">
      <main className="container mx-auto px-4 md:px-6 py-8 md:py-10 max-w-6xl">
        {/* Premium hero header */}
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-card to-card p-6 md:p-8 mb-6">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/15 text-primary grid place-items-center ring-1 ring-primary/20 shadow-sm">
                <InboxIcon className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
                    Inbox
                  </h1>
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-primary/80 border border-primary/25 rounded-full px-2 py-0.5">
                    <Sparkles className="h-3 w-3" /> Premium
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {counts.unread > 0 ? (
                    <>
                      <span className="font-semibold text-primary">{counts.unread} unread</span>{" "}
                      of {counts.all} messages
                    </>
                  ) : (
                    <>All caught up · {counts.all} messages</>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <Button size="sm" variant="outline" onClick={markSelectedRead}>
                  <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark {selected.size} read
                </Button>
              )}
              <Button
                size="sm"
                onClick={markAllRead}
                className="bg-primary text-primary-foreground hover:opacity-90"
              >
                <CheckCheck className="h-4 w-4 mr-1.5" /> Mark all read
              </Button>
            </div>
          </div>
        </div>

        {!emailVerified && (
          <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold text-amber-900 dark:text-amber-200">
                  Verify your email for account security
                </div>
                <p className="text-xs text-amber-900/80 dark:text-amber-200/80 mt-0.5">
                  Confirm <span className="font-mono">{email}</span> from your Gmail inbox.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={resendVerification}
              disabled={resending}
              className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
            >
              {resending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Resend verification"}
            </Button>
          </div>
        )}

        {/* Toolbar */}
        <div className="mb-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search messages…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-10 rounded-xl bg-card border-border/70"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto rounded-xl bg-card border border-border/70 p-1">
            {tabs.map((t) => {
              const active = kind === t.key;
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setKind(t.key)}
                  className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${active ? "" : "opacity-70"}`} />
                  {t.label}
                  <span
                    className={`ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                      active ? "bg-primary-foreground/20" : "bg-muted"
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Split panel */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          {/* List */}
          <div
            className={`${
              openMsg ? "hidden lg:block" : "block"
            } rounded-2xl border border-border/70 bg-card overflow-hidden`}
          >
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                No messages match.
              </div>
            ) : (
              <ul className="divide-y divide-border/60 max-h-[70vh] overflow-y-auto">
                {filtered.map((m) => {
                  const isUnread = !readIds.has(m.id);
                  const isOpen = openId === m.id;
                  const isSel = selected.has(m.id);
                  return (
                    <li
                      key={m.id}
                      className={`group relative flex items-start gap-3 px-4 py-3.5 cursor-pointer transition ${
                        isOpen
                          ? "bg-primary/5"
                          : "hover:bg-muted/40"
                      }`}
                      onClick={() => openMessage(m)}
                    >
                      {isUnread && (
                        <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary" />
                      )}
                      <input
                        type="checkbox"
                        checked={isSel}
                        onClick={(e) => toggleSelect(m.id, e)}
                        onChange={() => {}}
                        className="mt-1.5 h-4 w-4 rounded border-border accent-primary cursor-pointer"
                        aria-label="Select"
                      />
                      <div
                        className={`h-9 w-9 shrink-0 rounded-xl grid place-items-center ${
                          m.is_broadcast
                            ? "bg-gradient-to-br from-primary/25 to-primary/10 text-primary"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        {m.is_broadcast ? (
                          <Megaphone className="h-4 w-4" />
                        ) : (
                          <Mail className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className={`truncate ${
                              isUnread ? "font-semibold text-foreground" : "text-foreground/85"
                            }`}
                          >
                            {m.subject}
                          </span>
                          {isUnread && (
                            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          )}
                          <span className="ml-auto text-[10px] text-muted-foreground whitespace-nowrap">
                            {timeAgo(m.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{m.body}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Detail */}
          <div
            className={`${
              openMsg ? "block" : "hidden lg:block"
            } rounded-2xl border border-border/70 bg-card overflow-hidden`}
          >
            {openMsg ? (
              <article className="flex flex-col h-full">
                <header className="p-5 md:p-6 border-b border-border/60 bg-gradient-to-br from-primary/5 to-transparent">
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => setOpenId(null)}
                      className="lg:hidden inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Back
                    </button>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        openMsg.is_broadcast
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {openMsg.is_broadcast ? (
                        <>
                          <Megaphone className="h-3 w-3" /> Announcement
                        </>
                      ) : (
                        <>
                          <Mail className="h-3 w-3" /> Direct
                        </>
                      )}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(openMsg.created_at).toLocaleString()}
                    </span>
                  </div>
                  <h2 className="font-display text-xl md:text-2xl font-bold leading-snug">
                    {openMsg.subject}
                  </h2>
                </header>
                <div className="p-5 md:p-6 overflow-y-auto max-h-[60vh]">
                  <p className="whitespace-pre-wrap text-sm md:text-[15px] leading-relaxed text-foreground/90">
                    {openMsg.body}
                  </p>
                </div>
              </article>
            ) : (
              <div className="h-full min-h-[300px] grid place-items-center p-10 text-center">
                <div>
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 text-primary grid place-items-center mb-3">
                    <Bell className="h-6 w-6" />
                  </div>
                  <div className="font-display font-semibold mb-1">Select a message</div>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Pick any conversation on the left to read it here.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
