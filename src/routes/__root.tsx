import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import appCss from "@/styles.css?url";
import favicon32 from "@/assets/favicon-32.png.asset.json";
import appleTouch from "@/assets/apple-touch-icon.png.asset.json";
import icon192 from "@/assets/icon-192.png.asset.json";
import ogDefault from "@/assets/og-default.jpg.asset.json";


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
      { rel: "icon", type: "image/png", sizes: "32x32", href: favicon32.url },
      { rel: "icon", type: "image/png", sizes: "192x192", href: icon192.url },
      { rel: "apple-touch-icon", sizes: "180x180", href: appleTouch.url },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
      },
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
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={new QueryClient()}>
          {children}
          <Toaster richColors position="top-right" />
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
