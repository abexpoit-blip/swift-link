/**
 * Shared publishers dataset.
 * Used by both the public Leaderboard and the Recent withdrawals widget
 * so the demo numbers stay consistent across the site.
 *
 * Male names only. Country codes are ISO-3166 alpha-2 lowercase and rendered
 * with real SVG flags from flagcdn.com (see `flagUrl`).
 */

export type CountryCode =
  | "us" | "in" | "bd" | "pk" | "id" | "ng" | "br" | "mx" | "eg" | "tr"
  | "ph" | "vn" | "th" | "ma" | "dz" | "ke" | "za" | "gb" | "de" | "fr"
  | "it" | "es" | "ca" | "au" | "sa" | "ae" | "ir" | "iq" | "ru" | "ua"
  | "pl" | "ar" | "co" | "pe" | "cl" | "my" | "sg" | "lk" | "np";

export type Publisher = {
  id: string;
  user: string;
  country: CountryCode;
  /** Daily visits sent today. */
  traffic: number;
  /** Lifetime $ earned. */
  earnings: number;
  /** Lifetime $ withdrawn so far. */
  withdrawn: number;
};

export const flagUrl = (code: string) => `https://flagcdn.com/${code.toLowerCase()}.svg`;

/** Top publishers shown on /leaderboard. Ranked by daily traffic. */
export const TOP_PUBLISHERS: Publisher[] = [
  { id: "p01", user: "arjun.k***",   country: "in", traffic: 184320, earnings: 1842.10, withdrawn: 1750.00 },
  { id: "p02", user: "michael.b***", country: "us", traffic: 162540, earnings: 1604.55, withdrawn: 1525.00 },
  { id: "p03", user: "rakib.h***",   country: "bd", traffic: 148720, earnings: 1487.20, withdrawn: 1400.00 },
  { id: "p04", user: "kevin.r***",   country: "us", traffic: 138210, earnings: 1382.05, withdrawn: 1300.00 },
  { id: "p05", user: "ahmed.s***",   country: "eg", traffic: 121870, earnings: 1218.05, withdrawn: 1175.00 },
  { id: "p06", user: "rahul.m***",   country: "in", traffic: 109450, earnings:  982.65, withdrawn:  900.00 },
  { id: "p07", user: "joao.p***",    country: "br", traffic:  98740, earnings:  874.20, withdrawn:  825.00 },
  { id: "p08", user: "daniel.w***",  country: "us", traffic:  94780, earnings:  847.95, withdrawn:  800.00 },
  { id: "p09", user: "mehmet.y***",  country: "tr", traffic:  86120, earnings:  761.10, withdrawn:  700.00 },
  { id: "p10", user: "vikram.l***",  country: "in", traffic:  82140, earnings:  741.10, withdrawn:  690.00 },
  { id: "p11", user: "imran.a***",   country: "pk", traffic:  76860, earnings:  689.95, withdrawn:  640.00 },
  { id: "p12", user: "carlos.g***",  country: "mx", traffic:  71320, earnings:  628.95, withdrawn:  575.00 },
  { id: "p13", user: "andre.s***",   country: "br", traffic:  64480, earnings:  574.40, withdrawn:  525.00 },
  { id: "p14", user: "budi.h***",    country: "id", traffic:  58210, earnings:  521.85, withdrawn:  475.00 },
];

/** Smaller publishers — used to vary the recent withdrawals feed. */
export const OTHER_PUBLISHERS: Publisher[] = [
  { id: "o01", user: "shakib.r***",  country: "bd", traffic: 41200, earnings: 342.40, withdrawn: 300.00 },
  { id: "o02", user: "ethan.s***",   country: "us", traffic: 38110, earnings: 318.10, withdrawn: 275.00 },
  { id: "o03", user: "tarek.b***",   country: "ma", traffic: 34840, earnings: 286.65, withdrawn: 250.00 },
  { id: "o04", user: "sandeep.a***", country: "in", traffic: 31620, earnings: 261.30, withdrawn: 230.00 },
  { id: "o05", user: "ali.k***",     country: "pk", traffic: 28410, earnings: 234.75, withdrawn: 200.00 },
  { id: "o06", user: "noah.z***",    country: "us", traffic: 26840, earnings: 218.20, withdrawn: 190.00 },
  { id: "o07", user: "kwame.o***",   country: "ng", traffic: 24080, earnings: 198.10, withdrawn: 170.00 },
  { id: "o08", user: "yash.h***",    country: "in", traffic: 22410, earnings: 184.20, withdrawn: 160.00 },
  { id: "o09", user: "diego.f***",   country: "ar", traffic: 20540, earnings: 168.55, withdrawn: 145.00 },
  { id: "o10", user: "tyler.k***",   country: "us", traffic: 18840, earnings: 152.10, withdrawn: 130.00 },
  { id: "o11", user: "javier.m***",  country: "es", traffic: 17320, earnings: 142.40, withdrawn: 120.00 },
  { id: "o12", user: "samir.l***",   country: "dz", traffic: 16080, earnings: 132.95, withdrawn: 110.00 },
  { id: "o13", user: "agus.p***",    country: "id", traffic: 14620, earnings: 119.30, withdrawn: 100.00 },
  { id: "o14", user: "ryan.p***",    country: "ca", traffic: 13580, earnings: 110.40, withdrawn:  92.00 },
  { id: "o15", user: "deepak.f***",  country: "in", traffic: 12240, earnings:  98.55, withdrawn:  80.00 },
  { id: "o16", user: "hassan.j***",  country: "ae", traffic: 11470, earnings:  92.10, withdrawn:  75.00 },
  { id: "o17", user: "viktor.s***",  country: "ua", traffic: 10840, earnings:  86.65, withdrawn:  70.00 },
  { id: "o18", user: "kofi.a***",    country: "ke", traffic:  9920, earnings:  78.20, withdrawn:  64.00 },
  { id: "o19", user: "tomasz.w***",  country: "pl", traffic:  9210, earnings:  72.55, withdrawn:  60.00 },
  { id: "o20", user: "lucas.r***",   country: "br", traffic:  8540, earnings:  66.40, withdrawn:  54.00 },
  { id: "o21", user: "raj.t***",     country: "np", traffic:  7910, earnings:  61.05, withdrawn:  50.00 },
  { id: "o22", user: "iqbal.m***",   country: "my", traffic:  7320, earnings:  56.20, withdrawn:  46.00 },
  { id: "o23", user: "dmitry.k***",  country: "ru", traffic:  6740, earnings:  51.55, withdrawn:  42.00 },
  { id: "o24", user: "minh.n***",    country: "vn", traffic:  6210, earnings:  47.10, withdrawn:  38.00 },
  { id: "o25", user: "nathan.b***",  country: "gb", traffic:  5780, earnings:  43.65, withdrawn:  35.00 },
  { id: "o26", user: "felix.h***",   country: "de", traffic:  5310, earnings:  39.85, withdrawn:  32.00 },
  { id: "o27", user: "matteo.v***",  country: "it", traffic:  4920, earnings:  36.20, withdrawn:  28.00 },
  { id: "o28", user: "kabir.s***",   country: "lk", traffic:  4560, earnings:  33.10, withdrawn:  26.00 },
  { id: "o29", user: "omar.f***",    country: "sa", traffic:  4220, earnings:  30.40, withdrawn:  23.00 },
  { id: "o30", user: "harith.z***",  country: "sg", traffic:  3910, earnings:  27.85, withdrawn:  21.00 },
];

/** Combined pool used by the recent-withdrawals feed. */
export const ALL_PUBLISHERS: Publisher[] = [...TOP_PUBLISHERS, ...OTHER_PUBLISHERS];

export type PayoutMethod = "USDT TRC20" | "USDT BEP20";

export type RecentPayout = {
  user: string;
  country: CountryCode;
  amount: number; // $ withdrawn in this single recent payout
  method: PayoutMethod;
  minutesAgo: number;
};

const METHODS: PayoutMethod[] = ["USDT TRC20", "USDT BEP20"];

function pickRand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Build a recent withdrawal entry that is consistent with the publisher pool. */
export function makeRecentPayout(minutesAgo: number, filterCountry?: CountryCode): RecentPayout {
  const pool = filterCountry
    ? ALL_PUBLISHERS.filter((p) => p.country === filterCountry)
    : ALL_PUBLISHERS;
  const p = pickRand(pool.length ? pool : ALL_PUBLISHERS);
  // Realistic small recent withdrawal: $10 – $57, capped by their lifetime withdrawn.
  const cap = Math.max(10, Math.min(57, p.withdrawn));
  const amount = Math.round((10 + Math.random() * (cap - 10)) * 100) / 100;
  return {
    user: p.user,
    country: p.country,
    amount,
    method: pickRand(METHODS),
    minutesAgo,
  };
}
