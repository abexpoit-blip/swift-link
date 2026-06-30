/**
 * Shared publishers dataset.
 * Used by both the public Leaderboard and the Recent withdrawals widget
 * so the demo numbers stay consistent across the site.
 */

export type Publisher = {
  id: string;
  user: string;
  flag: "🇮🇳" | "🇺🇸";
  country: "in" | "us";
  /** Daily visits sent today. */
  traffic: number;
  /** Lifetime $ earned. */
  earnings: number;
  /** Lifetime $ withdrawn so far. */
  withdrawn: number;
};

/** Top 10 shown on /leaderboard. Ranked by daily traffic. */
export const TOP_PUBLISHERS: Publisher[] = [
  { id: "p1",  user: "arjun.k***",   flag: "🇮🇳", country: "in", traffic: 184320, earnings: 1842.10, withdrawn: 1750.00 },
  { id: "p2",  user: "michael.b***", flag: "🇺🇸", country: "us", traffic: 162540, earnings: 1604.55, withdrawn: 1525.00 },
  { id: "p3",  user: "priya.s***",   flag: "🇮🇳", country: "in", traffic: 138210, earnings: 1387.40, withdrawn: 1300.00 },
  { id: "p4",  user: "kevin.r***",   flag: "🇺🇸", country: "us", traffic: 121870, earnings: 1218.05, withdrawn: 1175.00 },
  { id: "p5",  user: "rahul.m***",   flag: "🇮🇳", country: "in", traffic: 109450, earnings:  982.65, withdrawn:  900.00 },
  { id: "p6",  user: "daniel.w***",  flag: "🇺🇸", country: "us", traffic:  94780, earnings:  874.20, withdrawn:  825.00 },
  { id: "p7",  user: "neha.p***",    flag: "🇮🇳", country: "in", traffic:  82140, earnings:  741.10, withdrawn:  700.00 },
  { id: "p8",  user: "james.t***",   flag: "🇺🇸", country: "us", traffic:  71860, earnings:  628.95, withdrawn:  575.00 },
  { id: "p9",  user: "vikram.l***",  flag: "🇮🇳", country: "in", traffic:  61320, earnings:  524.40, withdrawn:  475.00 },
  { id: "p10", user: "sophia.d***",  flag: "🇺🇸", country: "us", traffic:  52740, earnings:  461.85, withdrawn:  425.00 },
];

/** Smaller publishers — used to vary the recent withdrawals feed. */
export const OTHER_PUBLISHERS: Publisher[] = [
  { id: "o1",  user: "aditya.v***",  flag: "🇮🇳", country: "in", traffic: 38200, earnings: 312.40, withdrawn: 275.00 },
  { id: "o2",  user: "ethan.s***",   flag: "🇺🇸", country: "us", traffic: 34110, earnings: 298.10, withdrawn: 250.00 },
  { id: "o3",  user: "noah.z***",    flag: "🇺🇸", country: "us", traffic: 29840, earnings: 254.65, withdrawn: 225.00 },
  { id: "o4",  user: "sandeep.a***", flag: "🇮🇳", country: "in", traffic: 27620, earnings: 221.30, withdrawn: 200.00 },
  { id: "o5",  user: "yash.h***",    flag: "🇮🇳", country: "in", traffic: 23410, earnings: 198.75, withdrawn: 175.00 },
  { id: "o6",  user: "varun.c***",   flag: "🇮🇳", country: "in", traffic: 21080, earnings: 174.20, withdrawn: 150.00 },
  { id: "o7",  user: "tyler.k***",   flag: "🇺🇸", country: "us", traffic: 18540, earnings: 152.55, withdrawn: 125.00 },
  { id: "o8",  user: "ankit.o***",   flag: "🇮🇳", country: "in", traffic: 16320, earnings: 134.10, withdrawn: 100.00 },
  { id: "o9",  user: "ryan.p***",    flag: "🇺🇸", country: "us", traffic: 13980, earnings: 112.40, withdrawn:  90.00 },
  { id: "o10", user: "deepak.f***",  flag: "🇮🇳", country: "in", traffic: 11240, earnings:  89.55, withdrawn:  75.00 },
];

/** Combined pool used by the recent-withdrawals feed. */
export const ALL_PUBLISHERS: Publisher[] = [...TOP_PUBLISHERS, ...OTHER_PUBLISHERS];

export type PayoutMethod = "USDT TRC20" | "USDT BEP20";

export type RecentPayout = {
  user: string;
  flag: string;
  country: "in" | "us";
  amount: number; // $ withdrawn in this single recent payout
  method: PayoutMethod;
  minutesAgo: number;
};

const METHODS: PayoutMethod[] = ["USDT TRC20", "USDT BEP20"];

function pickRand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Build a recent withdrawal entry that is consistent with the publisher pool. */
export function makeRecentPayout(minutesAgo: number, filterCountry?: "in" | "us"): RecentPayout {
  const pool = filterCountry
    ? ALL_PUBLISHERS.filter((p) => p.country === filterCountry)
    : ALL_PUBLISHERS;
  const p = pickRand(pool);
  // Realistic small recent withdrawal: $10 – $57, capped by their lifetime withdrawn.
  const cap = Math.max(10, Math.min(57, p.withdrawn));
  const amount = Math.round((10 + Math.random() * (cap - 10)) * 100) / 100;
  return {
    user: p.user,
    flag: p.flag,
    country: p.country,
    amount,
    method: pickRand(METHODS),
    minutesAgo,
  };
}
