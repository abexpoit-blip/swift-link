// Self-hosted Supabase guard — must run before any @supabase/supabase-js import.
import "@/integrations/supabase/guard";
import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  useRouteContext,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import appCss from "@/styles.css?url";

// Local public-path icons so self-hosted deployments (adspx.com) don't depend on CDN.
const favicon32 = { url: "/favicon-32.png" };
const appleTouch = { url: "/apple-touch-icon.png" };
const icon192 = { url: "/icon-192.png" };
const ogDefault = { url: "https://adspx.com/og-default.jpg" };


interface RouterCtx {
  queryClient: QueryClient;
}


export const Route = createRootRouteWithContext<RouterCtx>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#7c3aed" },
      { title: "AdsPx — Paid short links for creators" },
      {
        name: "description",
        content:
          "AdsPx — turn any link into a paid short link. Share, earn per click, withdraw in USDT crypto from $25.",
      },
      { property: "og:site_name", content: "AdsPx" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "AdsPx — Paid short links for creators" },
      {
        property: "og:description",
        content:
          "Turn any link into a paid short link. Share, earn per click, withdraw in USDT crypto from $25.",
      },
      { property: "og:image", content: ogDefault.url },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "AdsPx — Paid short links for creators" },
      {
        name: "twitter:description",
        content:
          "Turn any link into a paid short link. Earn per click, withdraw in crypto.",
      },
      { name: "twitter:image", content: ogDefault.url },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: favicon32.url },
      { rel: "icon", type: "image/png", sizes: "192x192", href: icon192.url },
      { rel: "apple-touch-icon", sizes: "180x180", href: appleTouch.url },

      { rel: "manifest", href: "/manifest.json" },
    ],
  }),

  shellComponent: RootDocument,
  notFoundComponent: () => (
    <main className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold mb-2">404</h1>
        <p className="text-muted-foreground">Page not found.</p>
      </div>
    </main>
  ),
});

function RootDocument({ children }: { children: React.ReactNode }) {
  const { queryClient } = useRouteContext({ from: "__root__" });
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster richColors position="top-right" offset="72px" />
        </QueryClientProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  function isChunkErr(msg){
    if(!msg) return false;
    msg = String(msg);
    return msg.indexOf('Failed to fetch dynamically imported module') !== -1
        || msg.indexOf('Importing a module script failed') !== -1
        || msg.indexOf('error loading dynamically imported module') !== -1
        || /ChunkLoadError/i.test(msg);
  }
  function reloadOnce(){
    try {
      var k = '__adspx_chunk_reload';
      var last = Number(sessionStorage.getItem(k) || 0);
      var now = Date.now();
      if (now - last < 10000) return; // avoid loops
      sessionStorage.setItem(k, String(now));
    } catch(e){}
    location.reload();
  }
  window.addEventListener('error', function(e){
    if (isChunkErr(e && (e.message || (e.error && e.error.message)))) reloadOnce();
  });
  window.addEventListener('unhandledrejection', function(e){
    var r = e && e.reason;
    var msg = r && (r.message || r);
    if (isChunkErr(msg)) reloadOnce();
  });
})();
`,
          }}
        />
        <Scripts />
      </body>
    </html>
  );
}


