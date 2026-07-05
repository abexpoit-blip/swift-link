import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

// Production host for adspx. Adjust if the primary domain changes.
const BASE_URL = "https://adspx.com";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const today = new Date().toISOString().slice(0, 10);
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "daily", priority: "1.0", lastmod: today },
          { path: "/login", changefreq: "monthly", priority: "0.6", lastmod: today },
          { path: "/signup", changefreq: "monthly", priority: "0.7", lastmod: today },
          { path: "/leaderboard", changefreq: "hourly", priority: "0.8", lastmod: today },
          { path: "/statistics", changefreq: "daily", priority: "0.7", lastmod: today },
        ];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
          },
        });
      },
    },
  },
});
