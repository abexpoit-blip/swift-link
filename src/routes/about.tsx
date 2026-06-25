import { createFileRoute } from "@tanstack/react-router";
import { BreezyLayout } from "@/components/breezy/BreezyLayout";
import { SITE } from "@/lib/breezy-data";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: `About — ${SITE.name}` },
      { name: "description", content: `Founded in San Francisco in ${SITE.founded}, BreezySocial designs smart gadgets for calm, modern living.` },
      { property: "og:title", content: `About — ${SITE.name}` },
      { property: "og:description", content: "Our story, our team, and what we believe about thoughtful product design." },
      { property: "og:url", content: "https://breezysocial.com/about" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://breezysocial.com/og-default.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `About — ${SITE.name}` },
      { name: "twitter:description", content: "Our story, our team, and what we believe about thoughtful product design." },
      { name: "twitter:image", content: "https://breezysocial.com/og-default.png" },
    ],
    links: [{ rel: "canonical", href: "https://breezysocial.com/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <BreezyLayout>
      <section className="max-w-3xl mx-auto px-6 py-20">
        <div className="text-xs uppercase tracking-[0.2em] text-[#7D9B76] font-semibold mb-3">
          Our story
        </div>
        <h1 className="text-5xl md:text-6xl text-[#2A2A28] mb-8" style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400 }}>
          Built for calm, modern living.
        </h1>
        <div className="prose prose-lg max-w-none text-[#5A554C] leading-relaxed space-y-5">
          <p>
            BreezySocial started in {SITE.founded} when our founder, Mira Ostrowski, couldn't find a single sleep headphone that worked for a side sleeper. After a year of prototypes in her San Francisco apartment, the first BreezySocial product shipped to 312 backers — and the company was born.
          </p>
          <p>
            Today we're a team of 14 — designers, sleep researchers, hardware engineers, and editors — operating out of a small studio in the Mission District. We design and ship eight core products, each one obsessively iterated until it solves a real, daily problem. We don't do "smart" for its own sake. Every feature has to earn its place.
          </p>
          <p>
            We believe technology should feel like a quiet companion, not a constant interruption. Our products are built to support better sleep, sharper focus, calmer travel, and steadier daily rhythms. That's it. That's the whole mission.
          </p>
          <h2 className="text-3xl mt-12 mb-4 text-[#2A2A28]" style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400 }}>
            What we promise
          </h2>
          <ul className="space-y-2 not-prose">
            <li className="flex gap-3"><span className="text-[#5A7A55]">◐</span> Thoughtfully designed, lab-tested products</li>
            <li className="flex gap-3"><span className="text-[#5A7A55]">◐</span> 30-day no-questions returns</li>
            <li className="flex gap-3"><span className="text-[#5A7A55]">◐</span> Free shipping on orders over $50</li>
            <li className="flex gap-3"><span className="text-[#5A7A55]">◐</span> 12-24 month warranties on every item</li>
            <li className="flex gap-3"><span className="text-[#5A7A55]">◐</span> Real human support — never a chatbot</li>
          </ul>
          <h2 className="text-3xl mt-12 mb-4 text-[#2A2A28]" style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400 }}>
            Get in touch
          </h2>
          <p>
            We love hearing from customers — product questions, feedback, even tough criticism. Email us at <a href={`mailto:${SITE.email}`} className="text-[#5A7A55] underline">{SITE.email}</a> or reach out through our <a href="/contact" className="text-[#5A7A55] underline">contact page</a>.
          </p>
          <p className="text-sm text-[#9A9488] pt-8 border-t border-[#E8E2D5]">
            BreezySocial Inc. · {SITE.address} · Founded {SITE.founded}
          </p>
        </div>
      </section>
    </BreezyLayout>
  );
}
