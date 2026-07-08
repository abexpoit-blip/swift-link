import { createFileRoute } from "@tanstack/react-router";
import { handleSelfhostBackendOptions, proxySelfhostBackend } from "@/lib/selfhost-proxy";

export const Route = createFileRoute("/auth/v1/$")({
  server: {
    handlers: {
      GET: async ({ request }) => proxySelfhostBackend(request),
      HEAD: async ({ request }) => proxySelfhostBackend(request),
      POST: async ({ request }) => proxySelfhostBackend(request),
      PUT: async ({ request }) => proxySelfhostBackend(request),
      PATCH: async ({ request }) => proxySelfhostBackend(request),
      DELETE: async ({ request }) => proxySelfhostBackend(request),
      OPTIONS: async () => handleSelfhostBackendOptions(),
    },
  },
});