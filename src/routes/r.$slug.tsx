import { createFileRoute } from "@tanstack/react-router";

// Per-isolate link cache: avoids hitting DB for repeat short codes.
// Survives across requests on the same Worker isolate (~minutes).
type CachedLink = {
  id: string;
  user_id: string;
  adsterra_url: string;
  safe_url: string | null;
  is_active: boolean;
  expires: number;
};
const LINK_CACHE = new Map<string, CachedLink>();
const CACHE_TTL_MS = 60_000; // 60s — short enough to honour deletes/edits
const CACHE_MAX = 1000;

const BOT_RE =
  /bot|crawler|spider|crawling|preview|facebookexternalhit|whatsapp|telegrambot|slackbot|discordbot|headlesschrome|phantomjs|curl|wget|python-requests|httpclient|axios\//i;

export const Route = createFileRoute("/r/$slug")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const slug = String(params.slug || "").slice(0, 64);
        if (!slug) return new Response("Not found", { status: 404 });

        const now = Date.now();
        let link = LINK_CACHE.get(slug);
        if (link && link.expires < now) {
          LINK_CACHE.delete(slug);
          link = undefined;
        }

        if (!link) {
          const { supabaseAdmin } = await import(
            "@/integrations/supabase/client.server"
          );
          const { data, error } = await supabaseAdmin
            .from("links")
            .select("id, user_id, adsterra_url, safe_url, is_active")
            .eq("short_code", slug)
            .maybeSingle();

          if (error || !data || !data.is_active) {
            return new Response("Link not found", {
              status: 404,
              headers: { "content-type": "text/plain", "cache-control": "public, max-age=30" },
            });
          }

          link = { ...data, expires: now + CACHE_TTL_MS };
          if (LINK_CACHE.size >= CACHE_MAX) {
            // simple eviction: drop oldest
            const firstKey = LINK_CACHE.keys().next().value;
            if (firstKey) LINK_CACHE.delete(firstKey);
          }
          LINK_CACHE.set(slug, link);
        }

        const ua = (request.headers.get("user-agent") || "").toLowerCase();
        const isBot = !ua || BOT_RE.test(ua);
        const target = (isBot && link.safe_url) || link.adsterra_url;

        // Single combined RPC: insert click + earnings in one DB roundtrip.
        // Imported lazily so the module isn't bundled on the client.
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        // Fire the write but don't block the redirect on it — user gets
        // the 302 immediately. The promise still runs to completion on
        // the worker; we just don't await it.
        void (supabaseAdmin.rpc as any)("handle_redirect_click", {
          _link_id: link.id,
          _user_id: link.user_id,
          _is_bot: isBot,
          _ua: ua,
          _routed_to: target,
        });

        return new Response(null, {
          status: 302,
          headers: {
            location: target,
            "cache-control": "no-store",
            "referrer-policy": "no-referrer",
          },
        });
      },
    },
  },
});
