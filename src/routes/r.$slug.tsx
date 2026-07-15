import { createFileRoute } from "@tanstack/react-router";

// NOTE: The actual /r/:slug logic lives in src/server.ts (handleRedirectRoute).
// That handler runs BEFORE the TanStack router, so this file is effectively
// unreachable in production. We keep it as a minimal stub so the router still
// resolves the route (for type generation) but no logic is duplicated here.
// Do NOT re-add redirect/bot-detection logic to this file — edit src/server.ts.

export const Route = createFileRoute("/r/$slug")({
  server: {
    handlers: {
      GET: async () =>
        new Response("Not found", {
          status: 404,
          headers: { "x-adspx-r-handler": "stub-fallback" },
        }),
    },
  },
});
