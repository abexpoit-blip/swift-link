import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin-login")({
  component: AdminLoginPage,
  head: () => ({
    meta: [
      { title: "Admin — AdsPx" },
      { name: "description", content: "AdsPx admin console access." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: trimmed, password });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      toast.error("Session error");
      return;
    }
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    setLoading(false);
    if (!isAdmin) {
      await supabase.auth.signOut();
      toast.error("This account is not an admin.");
      return;
    }
    supabase.rpc("touch_last_login").then(() => {});
    toast.success("Welcome, admin");
    navigate({ to: "/admin" });
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background px-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <span className="font-display font-semibold text-lg tracking-tight">
            AdsPx <span className="text-gradient">Admin</span>
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-elegant">
          <h1 className="font-display text-2xl font-semibold mb-1">Admin sign in</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Restricted access. Only administrators can sign in here.
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                maxLength={72}
                className="mt-1.5"
              />
            </div>
            <Button type="submit" className="w-full bg-primary-gradient shadow-glow" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in as admin"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
