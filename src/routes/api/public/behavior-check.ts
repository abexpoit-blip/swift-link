import { createFileRoute } from "@tanstack/react-router";

// Public endpoint — called from money-page JS challenge.
// Confirms human for the fbclid so reused-token detection doesn't punish real users.
export const Route = createFileRoute("/api/public/behavior-check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => null);
          if (!body || typeof body !== "object") return new Response("bad", { status: 400 });
          const fbclid = typeof body.fbclid === "string" ? body.fbclid.slice(0, 256) : null;
          const linkId = typeof body.link_id === "string" ? body.link_id.slice(0, 64) : null;
          const events = Number(body.events) || 0;
          const ms = Number(body.ms) || 0;
          if (!fbclid || !linkId) return new Response("ok", { status: 200 });
          if (events < 1 || ms < 100) return new Response("ok", { status: 200 });
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await (supabaseAdmin.rpc as any)("confirm_human_fbclid", { _fbclid: fbclid, _link_id: linkId });
          return new Response("ok", { status: 200 });
        } catch {
          return new Response("ok", { status: 200 });
        }
      },
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST,OPTIONS",
            "access-control-allow-headers": "content-type",
          },
        }),
    },
  },
});
