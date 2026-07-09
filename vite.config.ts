import { defineConfig } from "@lovable.dev/vite-tanstack-config";
const appBuildVersion = process.env.APP_BUILD_VERSION || process.env.GIT_COMMIT_SHA || `${Date.now()}`;
export default defineConfig({
  nitro: { preset: "node-server" },
  tanstackStart: { server: { entry: "server" } },
  vite: {
    define: { __APP_BUILD_VERSION__: JSON.stringify(appBuildVersion) },
    preview: { host: "0.0.0.0", port: 3000, allowedHosts: ["adspx.com", "www.adspx.com", "109.205.180.183"] },
    server: { host: "0.0.0.0", allowedHosts: ["adspx.com", "www.adspx.com", "109.205.180.183"] },
    build: {
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            // Keep React and ReactDOM in one chunk. Splitting only react-dom out
            // creates a circular entry import in production, so hydration never
            // attaches event handlers on pages like /login.
            if (
              id.includes("node_modules/react/") ||
              id.includes("node_modules/react-dom/") ||
              id.includes("node_modules/scheduler/") ||
              id.includes("node_modules/use-sync-external-store/")
            ) return "vendor-react";
            if (id.includes("@supabase")) return "vendor-supabase";
            if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
            if (id.includes("@radix-ui")) return "vendor-radix";
            if (id.includes("@tanstack")) return "vendor-tanstack";
            if (id.includes("lucide-react")) return "vendor-icons";
          },
        },
      },
    },
  },
});
