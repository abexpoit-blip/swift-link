import { createFileRoute } from "@tanstack/react-router";

// Public shortener redirect.
// GET /r/<short_code>
// - Looks up the link via the service-role admin client (bypasses RLS).
// - Naively classifies obvious bots by UA; only human clicks count toward earnings.
// - Records the click into the earnings ledger via record_earning_click().
// - 302s to the destination URL.
export const Route = createFileRoute("/r/$slug")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const slug = String(params.slug || "").slice(0, 64);
        if (!slug) return new Response("Not found", { status: 404 });

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        const { data: link, error } = await supabaseAdmin
          .from("links")
          .select("id, user_id, adsterra_url, safe_url, is_active")
          .eq("short_code", slug)
          .maybeSingle();

        if (error || !link || !link.is_active) {
          return new Response("Link not found", {
            status: 404,
            headers: { "content-type": "text/plain" },
          });
        }

        const ua = (request.headers.get("user-agent") || "").toLowerCase();
        const isBot =
          !ua ||
          /bot|crawler|spider|crawling|preview|facebookexternalhit|whatsapp|telegrambot|slackbot|discordbot|headlesschrome|phantomjs|curl|wget|python-requests|httpclient|axios\//i.test(
            ua,
          );

        if (isBot) {
          await supabaseAdmin
            .from("links")
            .update({ bot_clicks_count: 1 + 0 })
            .eq("id", link.id);
          // increment via RPC-less: re-fetch then update with +1 to avoid race? simpler: use a SQL increment
          await supabaseAdmin.rpc("record_redirect_click" as never, {
            _link_id: link.id,
            _user_id: link.user_id,
            _ip: null,
            _country: null,
            _ua: ua,
            _is_bot: true,
            _bot_reason: "ua",
            _routed_to: link.safe_url,
            _utm_source: null,
            _utm_medium: null,
            _utm_campaign: null,
            _utm_term: null,
            _utm_content: null,
            _referer_host: null,
            _bot_score: 100,
            _signals: {},
            _challenge_passed: false,
          });
          return Response.redirect(link.safe_url || link.adsterra_url, 302);
        }

        // Human click: record into existing clicks table + earnings ledger
        await supabaseAdmin.rpc("record_redirect_click" as never, {
          _link_id: link.id,
          _user_id: link.user_id,
          _ip: null,
          _country: null,
          _ua: ua,
          _is_bot: false,
          _bot_reason: null,
          _routed_to: link.adsterra_url,
          _utm_source: null,
          _utm_medium: null,
          _utm_campaign: null,
          _utm_term: null,
          _utm_content: null,
          _referer_host: null,
          _bot_score: 0,
          _signals: {},
          _challenge_passed: true,
        });

        await supabaseAdmin.rpc("record_earning_click" as never, {
          _user_id: link.user_id,
          _link_id: link.id,
        });

        return Response.redirect(link.adsterra_url, 302);
      },
    },
  },
});
