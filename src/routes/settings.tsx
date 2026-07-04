import { AppShell } from "@/components/AppShell";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Mail, User, Shield, LogOut, KeyRound, CheckCircle2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/settings")({
  component: () => (<AppShell><SettingsPage /></AppShell>),
  head: () => ({ meta: [{ title: "Settings — AdsPx" }] }),
});

function SettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(true);
  const [resending, setResending] = useState(false);
  const [fullName, setFullName] = useState("");
  const [planSlug, setPlanSlug] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/login" }); return; }
      setUserId(session.user.id);
      setEmail(session.user.email ?? "");
      setEmailVerified(!!session.user.email_confirmed_at);
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, plan_slug, created_at")
        .eq("id", session.user.id)
        .maybeSingle();
      if (prof) {
        setFullName(prof.full_name ?? "");
        setPlanSlug(prof.plan_slug ?? "free");
        setCreatedAt(prof.created_at ?? "");
      }
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveProfile() {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName.trim() || null }).eq("id", userId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile updated");
  }

  async function resendVerify() {
    if (!email) return;
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup", email,
      options: { emailRedirectTo: `${window.location.origin}/settings` },
    });
    setResending(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Verification email sent");
  }

  async function changePassword() {
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPw(false);
    if (error) { toast.error(error.message); return; }
    setNewPassword("");
    toast.success("Password updated");
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  if (loading) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen text-foreground">
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-4xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account, security and preferences</p>
        </div>

        {/* Profile */}
        <section className="rounded-2xl glass-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">Profile</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
              <div className="mt-1.5 rounded-md bg-muted/40 border border-border px-3 py-2 text-sm font-mono flex items-center justify-between gap-2">
                <span className="truncate">{email}</span>
                {emailVerified ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 text-xs shrink-0"><CheckCircle2 className="h-3.5 w-3.5" />Verified</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-600 text-xs shrink-0"><AlertTriangle className="h-3.5 w-3.5" />Unverified</span>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="fullName" className="text-xs uppercase tracking-wider text-muted-foreground">Full Name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" maxLength={120} className="mt-1.5 bg-muted/40" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Plan</Label>
              <div className="mt-1.5 rounded-md bg-muted/40 border border-border px-3 py-2 text-sm font-mono capitalize">{planSlug}</div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Member since</Label>
              <div className="mt-1.5 rounded-md bg-muted/40 border border-border px-3 py-2 text-sm font-mono">
                {createdAt ? new Date(createdAt).toLocaleDateString() : "—"}
              </div>
            </div>
          </div>
          <Button onClick={saveProfile} disabled={saving} className="bg-primary-gradient shadow-glow text-primary-foreground">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
          </Button>
        </section>

        {/* Email verification */}
        {!emailVerified && (
          <section className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-amber-600" />
              <h2 className="font-display text-lg font-semibold">Verify email</h2>
            </div>
            <p className="text-sm text-amber-900/90 dark:text-amber-200/90">
              Confirm your email to keep account recovery and payout notices secure.
            </p>
            <Button onClick={resendVerify} disabled={resending} className="bg-amber-600 hover:bg-amber-700 text-white">
              {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resend verification email"}
            </Button>
          </section>
        )}

        {/* Security */}
        <section className="rounded-2xl glass-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">Security</h2>
          </div>
          <div className="grid md:grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <Label htmlFor="pw" className="text-xs uppercase tracking-wider text-muted-foreground">New Password (min 8 chars)</Label>
              <Input id="pw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="mt-1.5 bg-muted/40" />
            </div>
            <Button onClick={changePassword} disabled={changingPw || newPassword.length < 8} variant="outline">
              {changingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
            </Button>
          </div>
        </section>

        {/* Quick links */}
        <section className="rounded-2xl glass-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">Quick Links</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Link to="/withdraw" className="rounded-xl border border-border bg-muted/30 hover:bg-muted/60 px-4 py-3 text-sm transition-colors">
              💰 Withdrawal history & new request
            </Link>
            <Link to="/inbox" className="rounded-xl border border-border bg-muted/30 hover:bg-muted/60 px-4 py-3 text-sm transition-colors">
              📬 Messages & notifications
            </Link>
            <Link to="/statistics" className="rounded-xl border border-border bg-muted/30 hover:bg-muted/60 px-4 py-3 text-sm transition-colors">
              📊 Detailed analytics
            </Link>
            <Link to="/create-link" className="rounded-xl border border-border bg-muted/30 hover:bg-muted/60 px-4 py-3 text-sm transition-colors">
              🔗 Create & manage links
            </Link>
          </div>
        </section>

        {/* Danger zone */}
        <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 space-y-3">
          <h2 className="font-display text-lg font-semibold text-destructive">Sign out</h2>
          <p className="text-sm text-muted-foreground">End your current session on this device.</p>
          <Button variant="destructive" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />Sign out
          </Button>
        </section>
      </main>
    </div>
  );
}
