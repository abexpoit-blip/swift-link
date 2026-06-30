import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Link2,
  Loader2,
  LogOut,
  Inbox as InboxIcon,
  Megaphone,
  Mail,
  CheckCheck,
  Filter,
} from "lucide-react";

export const Route = createFileRoute("/inbox")({
  component: InboxPage,
  head: () => ({ meta: [{ title: "Inbox — AdsPx" }] }),
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

function InboxPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // filters
  const [kind, setKind] = useState<FilterKind>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
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
    setReadIds(new Set(((readRes.data as { message_id: string }[] | null) ?? []).map((r) => r.message_id)));
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
      await load(data.user.id);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const fromTs = from ? new Date(from).getTime() : -Infinity;
    const toTs = to ? new Date(to).getTime() + 86_400_000 : Infinity;
    const q = query.trim().toLowerCase();
    return messages.filter((m) => {
      if (kind === "direct" && m.is_broadcast) return false;
      if (kind === "broadcast" && !m.is_broadcast) return false;
      if (kind === "unread" && readIds.has(m.id)) return false;
      const t = new Date(m.created_at).getTime();
      if (t < fromTs || t > toTs) return false;
      if (q && !m.subject.toLowerCase().includes(q) && !m.body.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [messages, kind, from, to, query, readIds]);

  async function openMessage(m: Msg) {
    setOpenId(openId === m.id ? null : m.id);
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
    if (ids.length === 0) {
      toast.info("Nothing to mark");
      return;
    }
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

  async function markAllVisibleRead() {
    if (!userId) return;
    const ids = filtered.map((m) => m.id).filter((id) => !readIds.has(id));
    if (ids.length === 0) {
      toast.info("Nothing to mark");
      return;
    }
    const { error } = await supabase.rpc("mark_messages_read", { _ids: ids });
    if (error) return toast.error(error.message);
    setReadIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    toast.success(`Marked ${ids.length} as read`);
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

  const unread = messages.filter((m) => !readIds.has(m.id)).length;

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
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">Dashboard</Link>
            <Link to="/inbox" className="font-medium">Inbox</Link>
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

      <main className="container mx-auto px-6 py-10 max-w-3xl">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <InboxIcon className="h-6 w-6 text-primary" /> Inbox
            </h1>
            <p className="text-sm text-muted-foreground">
              {unread > 0 ? <span className="text-primary font-semibold">{unread} unread</span> : "All caught up"} · {filtered.length} of {messages.length} shown
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <Button size="sm" variant="outline" onClick={markSelectedRead}>
                <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark {selected.size} read
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={markAllVisibleRead}>
              <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark all visible
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-border bg-card p-4 mb-4 grid gap-3 md:grid-cols-[auto_1fr_auto_auto_auto]">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" /> Filter
          </div>
          <Input
            placeholder="Search subject or body…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9"
          />
          <div className="flex gap-1">
            {(["all", "unread", "broadcast", "direct"] as FilterKind[]).map((k) => (
              <Button
                key={k}
                size="sm"
                variant={kind === k ? "default" : "outline"}
                onClick={() => setKind(k)}
                className={`h-9 capitalize ${kind === k ? "bg-primary-gradient" : ""}`}
              >
                {k}
              </Button>
            ))}
          </div>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 w-[150px]"
            aria-label="From date"
          />
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-9 w-[150px]"
            aria-label="To date"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            No messages match these filters.
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((m) => {
              const isUnread = !readIds.has(m.id);
              const isOpen = openId === m.id;
              const isSel = selected.has(m.id);
              return (
                <div
                  key={m.id}
                  className={`rounded-xl border bg-card transition hover:border-primary/40 ${
                    isUnread ? "border-primary/40" : "border-border"
                  } ${isSel ? "ring-2 ring-primary/40" : ""}`}
                >
                  <div className="flex items-start gap-3 p-4">
                    <input
                      type="checkbox"
                      checked={isSel}
                      onClick={(e) => toggleSelect(m.id, e)}
                      onChange={() => {}}
                      className="mt-1.5 h-4 w-4 rounded border-border accent-primary cursor-pointer"
                      aria-label="Select message"
                    />
                    <button onClick={() => openMessage(m)} className="flex-1 text-left flex items-start gap-3 min-w-0">
                      <div
                        className={`mt-0.5 h-8 w-8 shrink-0 rounded-lg grid place-items-center ${
                          m.is_broadcast ? "bg-primary/15 text-primary" : "bg-muted text-foreground"
                        }`}
                      >
                        {m.is_broadcast ? <Megaphone className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`font-display ${isUnread ? "font-bold" : "font-medium"}`}>
                            {m.subject}
                          </span>
                          {isUnread && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                          <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
                            {m.is_broadcast ? "broadcast" : "direct"}
                          </span>
                        </div>
                        <p className={`text-sm text-muted-foreground ${isOpen ? "whitespace-pre-wrap" : "line-clamp-1"}`}>
                          {m.body}
                        </p>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {new Date(m.created_at).toLocaleString()}
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
