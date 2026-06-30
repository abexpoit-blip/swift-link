import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Wallet,
  Bitcoin,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
  Trash2,
  AlertCircle,
} from "lucide-react";

export const Route = createFileRoute("/withdraw")({
  component: WithdrawPage,
  head: () => ({
    meta: [
      { title: "Withdraw earnings — AdsPx" },
      {
        name: "description",
        content:
          "Request a USDT crypto withdrawal. Minimum $25, paid via TRC20 or BEP20 within 24 hours.",
      },
    ],
  }),
});

type Wallet = {
  id: string;
  network: "USDT_TRC20" | "USDT_BEP20";
  address: string;
  label: string | null;
};

type Withdrawal = {
  id: string;
  amount_usd: number;
  network: string;
  wallet_address: string;
  status: "pending" | "approved" | "paid" | "rejected";
  tx_hash: string | null;
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
};

const MIN_AMOUNT = 25;

function WithdrawPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [withdrawn, setWithdrawn] = useState<number>(0);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [history, setHistory] = useState<Withdrawal[]>([]);

  // form state
  const [amount, setAmount] = useState<string>("25");
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // add wallet form
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [newNetwork, setNewNetwork] = useState<"USDT_TRC20" | "USDT_BEP20">("USDT_TRC20");
  const [newAddress, setNewAddress] = useState("");
  const [newLabel, setNewLabel] = useState("");

  async function loadAll(uid: string) {
    const [profileRes, walletsRes, historyRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("balance_available, balance_withdrawn")
        .eq("id", uid)
        .maybeSingle(),
      supabase
        .from("user_wallets")
        .select("id, network, address, label")
        .eq("user_id", uid)
        .order("created_at", { ascending: false }),
      supabase
        .from("withdrawals")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    setBalance(Number(profileRes.data?.balance_available ?? 0));
    setWithdrawn(Number(profileRes.data?.balance_withdrawn ?? 0));
    const ws = (walletsRes.data as Wallet[] | null) ?? [];
    setWallets(ws);
    if (ws.length && !selectedWalletId) setSelectedWalletId(ws[0].id);
    setHistory((historyRes.data as Withdrawal[] | null) ?? []);
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setLoading(false);
        return;
      }
      setUserId(data.user.id);
      await loadAll(data.user.id);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addWallet(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const trimmed = newAddress.trim();
    if (trimmed.length < 20 || trimmed.length > 80) {
      toast.error("Wallet address looks invalid");
      return;
    }
    const { error } = await supabase.from("user_wallets").insert({
      user_id: userId,
      network: newNetwork,
      address: trimmed,
      label: newLabel.trim() || null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Wallet added");
    setNewAddress("");
    setNewLabel("");
    setShowAddWallet(false);
    await loadAll(userId);
  }

  async function deleteWallet(id: string) {
    if (!userId) return;
    const { error } = await supabase.from("user_wallets").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Wallet removed");
    await loadAll(userId);
  }

  async function submitWithdrawal(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const amt = Number(amount);
    if (!amt || amt < MIN_AMOUNT) {
      toast.error(`Minimum withdrawal is $${MIN_AMOUNT}`);
      return;
    }
    if (amt > balance) {
      toast.error("Amount exceeds available balance");
      return;
    }
    const wallet = wallets.find((w) => w.id === selectedWalletId);
    if (!wallet) {
      toast.error("Select a wallet");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("withdrawals").insert({
      user_id: userId,
      amount_usd: amt,
      network: wallet.network,
      wallet_address: wallet.address,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Withdrawal request submitted");
    setAmount(String(MIN_AMOUNT));
    await loadAll(userId);
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-6">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center space-y-4">
          <Wallet className="h-10 w-10 text-primary mx-auto" />
          <h1 className="font-display text-2xl font-semibold">Sign in to withdraw</h1>
          <p className="text-sm text-muted-foreground">
            You need an account to request a withdrawal.
          </p>
          <div className="flex gap-2 justify-center">
            <Button asChild>
              <a href="/login">Sign in</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/signup">Create account</a>
            </Button>
          </div>
          <Link to="/" className="block text-xs text-muted-foreground hover:text-foreground">
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 glass sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to AdsPx
          </Link>
          <span className="font-display font-semibold">Withdraw</span>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-5xl space-y-5 sm:space-y-7">
        {/* Balance cards */}
        <section className="grid md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
            <div className="text-xs uppercase tracking-wider text-primary mb-1">Available</div>
            <div className="font-display text-3xl font-bold text-gradient">
              ${balance.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ready to withdraw</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Withdrawn</div>
            <div className="font-display text-3xl font-bold">${withdrawn.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">All-time payouts</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Minimum</div>
            <div className="font-display text-3xl font-bold">$25</div>
            <p className="text-xs text-muted-foreground mt-1">USDT TRC20 / BEP20</p>
          </div>
        </section>

        {/* Wallets */}
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                <Bitcoin className="h-5 w-5 text-primary" /> Your wallets
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Save USDT addresses for quick withdrawals.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowAddWallet((v) => !v)}>
              <Plus className="h-4 w-4 mr-1" /> Add wallet
            </Button>
          </div>

          {showAddWallet && (
            <form
              onSubmit={addWallet}
              className="rounded-xl border border-border bg-background/50 p-5 mb-5 space-y-4"
            >
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Network</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    {(["USDT_TRC20", "USDT_BEP20"] as const).map((n) => (
                      <button
                        type="button"
                        key={n}
                        onClick={() => setNewNetwork(n)}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                          newNetwork === n
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {n.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="label" className="text-xs">
                    Label (optional)
                  </Label>
                  <Input
                    id="label"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    maxLength={40}
                    placeholder="Binance, Trust Wallet…"
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address" className="text-xs">
                  Wallet address
                </Label>
                <Input
                  id="address"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  maxLength={80}
                  required
                  placeholder={newNetwork === "USDT_TRC20" ? "T..." : "0x..."}
                  className="mt-1.5 font-mono text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm">
                  Save wallet
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowAddWallet(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {wallets.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No wallets yet. Add one to enable withdrawals.
            </div>
          ) : (
            <div className="space-y-2">
              {wallets.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-background/40 p-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="rounded-full bg-primary/10 text-primary text-[10px] font-mono px-2 py-0.5">
                        {w.network.replace("_", " ")}
                      </span>
                      {w.label && (
                        <span className="text-sm font-medium">{w.label}</span>
                      )}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground truncate">
                      {w.address}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteWallet(w.id)}
                    aria-label="Remove wallet"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Withdrawal form */}
        <section className="rounded-2xl border border-primary/30 bg-card p-4 sm:p-5 md:p-6 shadow-elegant">
          <h2 className="font-display text-xl font-semibold mb-1">Request a withdrawal</h2>
          <p className="text-xs text-muted-foreground mb-6">
            Min ${MIN_AMOUNT} · Processed within 24 hours · No network fees deducted
          </p>

          {balance < MIN_AMOUNT && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 mb-5 flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium">Not enough balance yet</div>
                <div className="text-muted-foreground text-xs mt-0.5">
                  You need at least ${MIN_AMOUNT}. Current balance:{" "}
                  <strong className="text-foreground">${balance.toFixed(2)}</strong>.
                </div>
              </div>
            </div>
          )}

          <form onSubmit={submitWithdrawal} className="space-y-5">
            <div>
              <Label htmlFor="amount" className="text-xs">
                Amount (USD)
              </Label>
              <Input
                id="amount"
                type="number"
                min={MIN_AMOUNT}
                max={balance}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="mt-1.5"
              />
              <div className="text-xs text-muted-foreground mt-1">
                Available: ${balance.toFixed(2)}
              </div>
            </div>

            <div>
              <Label className="text-xs">Withdraw to</Label>
              {wallets.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-4 mt-1.5 text-sm text-muted-foreground text-center">
                  Add a wallet above to continue.
                </div>
              ) : (
                <div className="space-y-2 mt-1.5">
                  {wallets.map((w) => (
                    <label
                      key={w.id}
                      className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition ${
                        selectedWalletId === w.id
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background/40 hover:border-primary/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="wallet"
                        value={w.id}
                        checked={selectedWalletId === w.id}
                        onChange={() => setSelectedWalletId(w.id)}
                        className="accent-primary"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">
                          {w.label ?? w.network.replace("_", " ")}{" "}
                          <span className="text-[10px] font-mono text-muted-foreground ml-1">
                            {w.network.replace("_", " ")}
                          </span>
                        </div>
                        <div className="font-mono text-xs text-muted-foreground truncate">
                          {w.address}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-primary-gradient shadow-glow"
              disabled={
                submitting ||
                wallets.length === 0 ||
                balance < MIN_AMOUNT ||
                Number(amount) < MIN_AMOUNT ||
                Number(amount) > balance
              }
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>Submit withdrawal request</>
              )}
            </Button>
          </form>
        </section>

        {/* History */}
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 md:p-6">
          <h2 className="font-display text-xl font-semibold mb-5">Withdrawal history</h2>
          {history.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6">
              No withdrawals yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="text-left py-3 pr-4">Date</th>
                    <th className="text-left py-3 pr-4">Amount</th>
                    <th className="text-left py-3 pr-4">Network</th>
                    <th className="text-left py-3 pr-4">Wallet</th>
                    <th className="text-left py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((w) => (
                    <tr key={w.id} className="border-b border-border/60 last:border-0">
                      <td className="py-3 pr-4 text-muted-foreground">
                        {new Date(w.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-4 font-semibold">${Number(w.amount_usd).toFixed(2)}</td>
                      <td className="py-3 pr-4 font-mono text-xs">
                        {w.network.replace("_", " ")}
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-muted-foreground truncate max-w-[180px]">
                        {w.wallet_address.slice(0, 8)}…{w.wallet_address.slice(-6)}
                      </td>
                      <td className="py-3">
                        <StatusBadge status={w.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: Withdrawal["status"] }) {
  const map = {
    pending: { icon: Clock, label: "Pending", cls: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
    approved: { icon: CheckCircle2, label: "Approved", cls: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
    paid: { icon: CheckCircle2, label: "Paid", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
    rejected: { icon: XCircle, label: "Rejected", cls: "bg-red-500/10 text-red-600 border-red-500/30" },
  } as const;
  const m = map[status];
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${m.cls}`}>
      <Icon className="h-3 w-3" /> {m.label}
    </span>
  );
}
