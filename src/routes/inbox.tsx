import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Link2, Loader2, LogOut, Inbox as InboxIcon, Megaphone, Mail } from "lucide-react";

export const Route = createFileRoute("/inbox")({
  component: InboxPage,
  head: () => ({ meta: [{ title: "Inbox — Linkly" }] }),
});

type Msg = {
  id: string;
  subject: string;
  body: string;
  is_broadcast: boolean;
  recipient_id: string | null;
  created_at: string;
};

function InboxPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);

  async function load(uid: string) {
    const [msgRes, readRes] = await Promise.all([
      supabase
        .from("messages")
        .select("id, subject, body, is_broadcast, recipient_id, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("message_reads").select("message_id").eq("user_id", uid),
    ]);
    setMessages((msgRes.data as Msg[] | null) ?? []);
    setReadIds(new Set(((readRes.data as any[] | null) ?? []).map((r) => r.message_id)));
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

  async function openMessage(m: Msg) {
    setOpenId(openId === m.id ? null : m.id);
    if (!userId || readIds.has(m.id)) return;
    await supabase.from("message_reads").insert({ message_id: m.id, user_id: userId });
    setReadIds((prev) => new Set(prev).add(m.id));
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
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <InboxIcon className="h-6 w-6 text-primary" /> Inbox
            </h1>
            <p className="text-sm text-muted-foreground">
              Official notices from the Linkly team. {unread > 0 && <span className="text-primary font-semibold">{unread} unread</span>}
            </p>
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            No messages yet — your inbox is clear.
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((m) => {
              const isUnread = !readIds.has(m.id);
              const isOpen = openId === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => openMessage(m)}
                  className={`w-full text-left rounded-xl border bg-card p-4 transition hover:border-primary/40 ${
                    isUnread ? "border-primary/40" : "border-border"
                  }`}
                >
                  <div className="flex items-start gap-3">
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
                      </div>
                      <p
                        className={`text-sm text-muted-foreground ${
                          isOpen ? "whitespace-pre-wrap" : "line-clamp-1"
                        }`}
                      >
                        {m.body}
                      </p>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {new Date(m.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
