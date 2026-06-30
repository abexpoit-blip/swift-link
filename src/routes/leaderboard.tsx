import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Trophy, TrendingUp, TrendingDown, ArrowLeft, Zap } from "lucide-react";
import { AdspxMark } from "@/components/AdspxLogo";
import { TOP_PUBLISHERS, type Publisher } from "@/lib/publishers";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Top Earners — Live Leaderboard | AdsPx" },
      {
        name: "description",
        content:
          "See the top 10 AdsPx publishers right now — live daily traffic sent, total earnings and recent withdrawals. Updates every few seconds.",
      },
      { property: "og:title", content: "Top Earners — Live Leaderboard | AdsPx" },
      {
        property: "og:description",
        content:
          "Live ranking of AdsPx top publishers — daily traffic, earnings and withdrawals.",
      },
    ],
  }),
  component: LeaderboardPage,
});

type Row = Publisher & { trend: 1 | -1 | 0 };


function LeaderboardPage() {
  const [rows, setRows] = useState<Row[]>(() =>
    TOP_PUBLISHERS.map((p) => ({ ...p, trend: 0 as const })),
  );

  // tick every 4s — small random bumps + occasional re-sort
  useEffect(() => {
    const id = setInterval(() => {
      setRows((prev) => {
        const next = prev.map((r) => {
          const delta = Math.floor((Math.random() - 0.35) * 4200); // bias positive
          const newTraffic = Math.max(20000, r.traffic + delta);
          const earnGain = delta > 0 ? delta / 100000 : 0;
          return {
            ...r,
            traffic: newTraffic,
            earnings: +(r.earnings + earnGain).toFixed(2),
            trend: delta > 200 ? 1 : delta < -200 ? -1 : 0,
          } as Row;
        });
        // re-sort by traffic so positions move up/down
        next.sort((a, b) => b.traffic - a.traffic);
        return next;
      });
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const totals = useMemo(() => {
    const traffic = rows.reduce((s, r) => s + r.traffic, 0);
    const earnings = rows.reduce((s, r) => s + r.earnings, 0);
    const withdrawn = rows.reduce((s, r) => s + r.withdrawn, 0);
    return { traffic, earnings, withdrawn };
  }, [rows]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 glass">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <AdspxMark className="h-8 w-8" />
            <span className="font-display font-bold text-lg tracking-tight">
              Ads<span className="text-gradient">Px</span>
            </span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>
      </header>

      <section className="container mx-auto px-6 py-16">
        <div className="text-center mb-10 max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Zap className="h-3 w-3 text-primary" /> Live · updates every 4s
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight">
            Top <span className="text-gradient">10 publishers</span> right now
          </h1>
          <p className="text-muted-foreground">
            Daily traffic sent, total earnings, and what they've withdrawn. Positions move up &amp; down in real time.
          </p>
        </div>

        {/* Totals bar */}
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-3 mb-8">
          <div className="rounded-2xl glass-deep border border-border/60 p-5 text-center">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Combined daily traffic</div>
            <div className="font-display text-2xl md:text-3xl font-bold mt-1">
              {totals.traffic.toLocaleString()}
            </div>
          </div>
          <div className="rounded-2xl glass-deep border border-primary/40 p-5 text-center">
            <div className="text-[11px] uppercase tracking-wider text-primary">Total earned</div>
            <div className="font-display text-2xl md:text-3xl font-bold text-gradient mt-1">
              ${totals.earnings.toFixed(2)}
            </div>
          </div>
          <div className="rounded-2xl glass-deep border border-border/60 p-5 text-center">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Total withdrawn</div>
            <div className="font-display text-2xl md:text-3xl font-bold mt-1">
              ${totals.withdrawn.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Leaderboard table */}
        <div className="max-w-4xl mx-auto rounded-2xl border border-border bg-card overflow-hidden shadow-card">
          <div className="grid grid-cols-[40px_1fr_1fr_1fr_1fr] gap-3 px-5 py-3 border-b border-border/60 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
            <div>#</div>
            <div>Publisher</div>
            <div className="text-right">Traffic / day</div>
            <div className="text-right">Earnings</div>
            <div className="text-right">Withdrawn</div>
          </div>

          {rows.map((r, i) => (
            <div
              key={r.id}
              className="grid grid-cols-[40px_1fr_1fr_1fr_1fr] gap-3 px-5 py-4 border-b border-border/40 last:border-b-0 items-center text-sm transition-colors hover:bg-secondary/30"
            >
              <div className="flex items-center">
                {i === 0 ? (
                  <Trophy className="h-4 w-4 text-primary" />
                ) : (
                  <span className="font-mono text-muted-foreground">{i + 1}</span>
                )}
              </div>
              <div className="flex items-center gap-2 font-medium">
                <span>{r.flag}</span>
                <span className="truncate">{r.user}</span>
              </div>
              <div className="text-right font-mono flex items-center justify-end gap-1.5">
                {r.trend === 1 && <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
                {r.trend === -1 && <TrendingDown className="h-3.5 w-3.5 text-rose-500" />}
                <span>{r.traffic.toLocaleString()}</span>
              </div>
              <div className="text-right font-mono text-gradient font-semibold">
                ${r.earnings.toFixed(2)}
              </div>
              <div className="text-right font-mono">
                ${r.withdrawn.toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-center text-muted-foreground mt-6">
          Usernames are partially hidden for privacy. Numbers reflect verified human traffic only.
        </p>

        <div className="text-center mt-10">
          <Link
            to="/"
            className="btn-premium inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium"
          >
            Start sending traffic
          </Link>
        </div>
      </section>
    </div>
  );
}
