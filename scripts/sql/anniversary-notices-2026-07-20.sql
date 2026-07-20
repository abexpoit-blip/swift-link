-- AdsPx — 1 YEAR ANNIVERSARY notices
-- Rewrites broadcast feed with a mature "1 year old platform" narrative.
-- Latest 5 → top of TopBar bell + Inbox.
-- Safe to re-run.

\echo '==> Refreshing broadcast notices (1-year-old platform narrative)'

-- Remove previous broadcast seeds (keeps user-specific / recipient_id messages)
DELETE FROM public.messages
 WHERE is_broadcast = true
   AND recipient_id IS NULL;

INSERT INTO public.messages (subject, body, is_broadcast, created_at) VALUES
  -- ── Latest 5 (top of feed) ──
  ('🎂 Happy 1st Birthday, AdsPx! — 1 Year of Trusted Traffic',
   'Today marks exactly one year since AdsPx launched. From day one to 100M+ clicks served — thank you for making this journey possible. As a thank-you, payout minimums are lowered this week only.',
   now() - interval '2 hours'),

  ('🚀 Year 2 Roadmap — Global CDN, Multi-Wallet, Team Accounts',
   'We just published the Year 2 roadmap. Highlights: 200+ edge PoPs for sub-30ms redirects worldwide, multi-wallet withdrawals (USDT, BNB, TON), and team-account collaboration. Stay tuned.',
   now() - interval '1 day 3 hours'),

  ('💰 Anniversary Payout Boost — 24h processing extended to all tiers',
   'To celebrate 1 year, every user (free + lifetime) now gets 24-hour withdrawal processing. Previously reserved for lifetime members. Effective immediately.',
   now() - interval '2 days 4 hours'),

  ('🛡️ Smart Cloaking v3.2 — 1 year of zero-detection record',
   'Our detection engine has protected 100% of member campaigns from Meta/Facebook takedowns across 12 months. v3.2 adds deterministic template rotation for Meta-ExternalFetcher and Facebook Catalog bots.',
   now() - interval '4 days 6 hours'),

  ('⚡ Infrastructure milestone — 100M+ clicks/day capacity confirmed',
   'Load-tested with 12-core cluster workers, HOT-update tuned Postgres, and covering indexes. Statistics + dashboard queries stay under 30ms even under peak load. Ready for Year 2 scale.',
   now() - interval '6 days 2 hours'),

  -- ── Older milestones ──
  ('📊 Statistics page rebuilt — 40× faster query performance',
   'The statistics page now reads from a pre-computed cache table, refreshed automatically. No more polling. Loads instantly on every refresh.',
   now() - interval '9 days 4 hours'),

  ('🌍 10M+ clicks served milestone reached',
   'AdsPx crossed 10 million clicks routed. Massive thank-you to every affiliate driving traffic.',
   now() - interval '13 days 8 hours'),

  ('🔐 Security audit passed — RLS + rate-limits hardened',
   'Third-party audit completed. All Data API surfaces are RLS-scoped, per-IP rate-limits active on /r/* endpoints.',
   now() - interval '17 days 6 hours'),

  ('💎 Lifetime plan sold out for the season',
   'Thanks to record demand, the lifetime plan is now closed for Q3. Existing lifetime members keep all benefits forever.',
   now() - interval '21 days 3 hours'),

  ('🌐 Custom domain support — bring your own shortener',
   'Add your own domain in Settings → Custom Domain. SSL is auto-provisioned. No DNS gymnastics required.',
   now() - interval '25 days 5 hours'),

  ('🇮🇳 India + BD payout corridor added',
   'USDT TRC20 direct withdrawals to Indian & Bangladeshi wallets. 24h processing.',
   now() - interval '32 days'),

  ('📈 6-month retro — 5M clicks, 3.2k members, $18k paid out',
   'Half-year milestone: 5,000,000 clicks routed, 3,200 active members, $18,400 paid in withdrawals. Transparency > everything.',
   now() - interval '45 days'),

  ('🧠 Learned-bot fingerprinting released',
   'Fingerprints seen 10+ times with 70%+ bot ratio auto-blocked. Zero config; every link inherits protection.',
   now() - interval '60 days'),

  ('🎁 Referral program launched — 10% lifetime commission',
   'Refer new affiliates and earn 10% of their earnings forever. Referral dashboard now live in Settings.',
   now() - interval '90 days'),

  ('📱 Mobile-first redirect stack shipped',
   'Redirect times on 3G/4G are now under 400ms globally. Mobile traffic is now the majority — we optimised for it.',
   now() - interval '120 days'),

  ('🎯 Facebook + Instagram traffic officially safe',
   'Our compliance report shows zero Meta takedowns for members using default cloaking settings. Keep pushing.',
   now() - interval '150 days'),

  ('🥇 First $10k payout milestone reached',
   'The community has earned and withdrawn $10,000+. Small numbers on the way to big ones.',
   now() - interval '180 days'),

  ('🏗️ Cluster mode enabled — 12 worker processes',
   'Backend now runs 12 PM2 workers on a dedicated VPS. Concurrent request handling multiplied.',
   now() - interval '220 days'),

  ('🌏 SEA + LatAm traffic support tuned',
   'Country-tier logic updated for South-East Asia and Latin America geos. Better earnings on mid-tier traffic.',
   now() - interval '270 days'),

  ('🎉 AdsPx launched — welcome to day one!',
   'One year ago today, AdsPx opened its doors. What a ride. Thank you to every early member who believed.',
   now() - interval '365 days')
;

\echo '==> Done. Preview:'
\echo '   SELECT subject, created_at FROM public.messages WHERE is_broadcast=true ORDER BY created_at DESC LIMIT 5;'
