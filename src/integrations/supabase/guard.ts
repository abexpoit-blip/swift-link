/**
 * Self-hosted Supabase safeguard.
 *
 * Runs on both server and client at app boot. Purpose:
 *   1. Fail loud if the configured Supabase URL points to the managed
 *      supabase.co / supabase.in cloud instead of our self-hosted VPS.
 *   2. Patch global fetch so any accidental request to *.supabase.co
 *      (from third-party libs, stale bundles, etc.) is blocked at runtime.
 *
 * Import once from src/routes/__root.tsx (top of file, side-effect import).
 */

const FORBIDDEN_HOST_RE = /(^|\.)supabase\.(co|in)$/i;

function getConfiguredUrl(): string {
  // Client build: import.meta.env is inlined by Vite.
  // Server (SSR/serverFn): fall back to process.env.
  const fromVite =
    typeof import.meta !== "undefined" &&
    (import.meta as ImportMeta).env?.VITE_SUPABASE_URL;
  const fromProc =
    typeof process !== "undefined" ? process.env?.SUPABASE_URL : undefined;
  return String(fromVite || fromProc || "");
}

function assertSelfHosted(url: string): void {
  if (!url) return; // client.ts already errors on missing url
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error(
      `[supabase-guard] Invalid VITE_SUPABASE_URL: "${url}" — must be your self-hosted endpoint (e.g. https://supabase.adspx.com).`,
    );
  }
  if (FORBIDDEN_HOST_RE.test(host)) {
    throw new Error(
      `[supabase-guard] Refusing to boot: Supabase URL points to managed cloud "${host}". This project uses a self-hosted VPS instance. Fix VITE_SUPABASE_URL / SUPABASE_URL in .env and redeploy.`,
    );
  }
}

function patchFetch(): void {
  const g: typeof globalThis & { __supabaseGuardInstalled?: boolean } =
    globalThis as typeof globalThis & { __supabaseGuardInstalled?: boolean };
  if (g.__supabaseGuardInstalled) return;
  if (typeof g.fetch !== "function") return;
  const originalFetch = g.fetch.bind(g);

  g.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    let urlStr = "";
    try {
      if (typeof input === "string") urlStr = input;
      else if (input instanceof URL) urlStr = input.toString();
      else if (input && typeof (input as Request).url === "string")
        urlStr = (input as Request).url;
    } catch {
      /* ignore */
    }
    if (urlStr) {
      try {
        const host = new URL(urlStr, "http://x").hostname;
        if (FORBIDDEN_HOST_RE.test(host)) {
          const msg = `[supabase-guard] Blocked request to managed Supabase host "${host}". Self-hosted only.`;
          console.error(msg, urlStr);
          return Promise.reject(new Error(msg));
        }
      } catch {
        /* ignore parse errors */
      }
    }
    return originalFetch(input as RequestInfo, init);
  }) as typeof fetch;

  g.__supabaseGuardInstalled = true;
}

assertSelfHosted(getConfiguredUrl());
patchFetch();

export {};
