import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AdspxMark } from "@/components/AdspxLogo";


export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Sign in — AdsPx" },
      { name: "description", content: "Sign in to your AdsPx account." },
    ],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.endsWith("@gmail.com") && trimmed !== "admin@adspx.com") {
      toast.error("Only Gmail accounts are allowed. Please use a @gmail.com email.");
      return;
    }
    setLoading(true);
    // Retry once on transient "Failed to fetch" (preview iframe / flaky network)
    let error: { message: string } | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await supabase.auth.signInWithPassword({ email: trimmed, password });
      error = res.error;
      if (!error) break;
      const msg = (error.message || "").toLowerCase();
      if (!msg.includes("failed to fetch") && !msg.includes("network")) break;
      await new Promise((r) => setTimeout(r, 400));
    }
    setLoading(false);
    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("failed to fetch") || msg.includes("network")) {
        toast.error("Network blocked. Open https://adspx.com/login in a new tab and try again.");
      } else if (msg.includes("invalid") || msg.includes("credentials")) {
        toast.error("Wrong email or password.");
      } else {
        toast.error(error.message);
      }
      return;
    }
    // bump last_login_at; ignore errors
    supabase.rpc("touch_last_login").then(() => {});
    // silent sign-in: no welcome toast
    // admin auto-redirect to admin panel
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (isAdmin) { navigate({ to: "/admin" }); return; }
    }
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background px-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <AdspxMark className="h-8 w-8" />
          <span className="font-display font-semibold text-lg tracking-tight">
            Ads<span className="text-gradient">Px</span>
          </span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-elegant">
          <h1 className="font-display text-2xl font-semibold mb-1">Sign in</h1>
          <p className="text-sm text-muted-foreground mb-6">Sign in to your AdsPx account to keep earning.</p>



          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Gmail address</Label>
              <Input
                id="email"
                type="email"
                required
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                maxLength={72}
                className="mt-1.5"
              />
            </div>
            <Button type="submit" className="w-full bg-primary-gradient shadow-glow" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            No account?{" "}
            <Link to="/signup" className="text-primary hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
