import { createFileRoute } from "@tanstack/react-router";

// Public endpoint — called from money-page JS challenge.
// Confirms human for the fbclid so reused-token detection doesn't punish real users.

// In-memory token bucket per IP (resets on server restart / per worker).
// PM2 cluster mode: each worker has its own bucket → effective limit ≈ N × workers.
const RATE_LIMIT_MAX = 20; // requests
const RATE_LIMIT_WINDOW_MS = 60_000; // per 1 minute
const buckets = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    // opportunistic cleanup
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
    }
    return false;
  }
  b.count += 1;
  return b.count > RATE_LIMIT_MAX;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST,OPTIONS",
  "access-control-allow-headers": "content-type",
} as const;

function clientIp(request: Request): string {
  const h = request.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export const Route = createFileRoute("/api/public/behavior-check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const ip = clientIp(request);
          if (isRateLimited(ip)) {
            return new Response("rate_limited", { status: 429, headers: CORS_HEADERS });
          }

          const body = await request.json().catch(() => null);
          if (!body || typeof body !== "object") {
            return new Response("bad", { status: 400, headers: CORS_HEADERS });
          }
          const fbclid = typeof body.fbclid === "string" ? body.fbclid.slice(0, 256) : null;
          const linkId = typeof body.link_id === "string" ? body.link_id : null;
          const events = Number(body.events) || 0;
          const ms = Number(body.ms) || 0;

          // Silently succeed for malformed inputs — attacker gets no signal.
          if (!fbclid || !linkId || !UUID_RE.test(linkId)) {
            return new Response("ok", { status: 200, headers: CORS_HEADERS });
          }
          if (events < 1 || ms < 100) {
            return new Response("ok", { status: 200, headers: CORS_HEADERS });
          }

          const { getAdspxPublicClient } = await import("@/lib/adspx-public.server");
          const supabasePublic = getAdspxPublicClient();
          await (supabasePublic.rpc as any)("confirm_human_fbclid", {
            _fbclid: fbclid,
            _link_id: linkId,
          });
          return new Response("ok", { status: 200, headers: CORS_HEADERS });
        } catch {
          return new Response("ok", { status: 200, headers: CORS_HEADERS });
        }
      },
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: CORS_HEADERS }),
    },
  },
});
