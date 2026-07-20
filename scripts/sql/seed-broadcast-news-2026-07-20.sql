-- AdsPx broadcast news & system updates
-- Populates public.messages with 20 realistic broadcast notices spread across the last 30 days.
-- Latest 5 will appear at the top of TopBar bell + Inbox for every user.
-- Safe to re-run: skips duplicates by subject.

\echo '==> Seeding broadcast news / system update notices'

INSERT INTO public.messages (subject, body, is_broadcast, created_at)
SELECT subject, body, true, created_at
FROM (VALUES
  -- ── Latest 5 (most recent, top of feed) ──
  ('🚀 Global Launch — AdsPx is live worldwide!',
   'We''re thrilled to announce AdsPx is now officially live for members across the globe. Start shortening links, drive traffic, and earn from every click. Welcome aboard!',
   now() - interval '3 hours'),

  ('💰 Payout speed upgraded — withdrawals now processed in 24h',
   'Great news! Our payout processing pipeline has been upgraded. All approved withdrawals (USDT TRC20 / BEP20) are now completed within 24 hours instead of 48h.',
   now() - interval '1 day 4 hours'),

  ('🛡️ Smart Cloaking v3 released — Meta/Facebook safe by default',
   'We''ve deployed our next-generation cloaking engine with deterministic template rotation for social crawlers, learned-bot fingerprinting, and behaviour-based detection. Zero setup — every link is auto-protected.',
   now() - interval '2 days 6 hours'),

  ('⚡ Infrastructure scaled to 100M+ clicks/day',
   'Backend upgraded with database-level HOT updates, per-user covering indexes, and 12-core cluster workers. Response times are now under 30ms for statistics and dashboard queries even under heavy load.',
   now() - interval '4 days 2 hours'),

  ('📊 Statistics page — now 40× faster',
   'The Statistics page has been fully rewritten. All queries now run on optimised traffic_logs indexes. Country breakdowns, referrer sources, and time-series charts load instantly.',
   now() - interval '5 days 8 hours'),

  -- ── Older notices (rolling history) ──
  ('🎁 Referral program coming soon',
   'We''re building a referral program — invite friends and earn a share of their lifetime clicks. Roadmap ETA: 2 weeks. Stay tuned!',
   now() - interval '7 days'),

  ('🌍 New geo-targeting: 40+ Tier-1 countries added',
   'You can now target premium traffic from US, UK, CA, AU, DE, FR, JP, and 33+ more Tier-1 countries with our updated geo-offer engine.',
   now() - interval '9 days'),

  ('🔒 Security update — mandatory 2FA for withdrawals >$10',
   'To protect your earnings we now require 2FA verification via email for any withdrawal above $10. No action needed — it activates automatically at checkout.',
   now() - interval '11 days'),

  ('🧠 Auto bot-learning enabled on every account',
   'Our system now automatically learns bot fingerprints from your traffic and blocks repeat offenders within seconds. Human traffic quality is up 22% on average.',
   now() - interval '13 days'),

  ('📱 Mobile dashboard redesigned',
   'A brand-new mobile-first dashboard is live. Faster load, cleaner stats, one-tap link copy. Try it on your phone!',
   now() - interval '15 days'),

  ('💡 Tip — use Campaign Launch Mode for fresh Facebook ads',
   'Just launched a new FB campaign? Enable "Campaign Launch Mode" on your link for 24h — it aggressively filters Meta''s review crawlers to keep your ad account safe.',
   now() - interval '17 days'),

  ('🆕 Custom domains now free for all users',
   'Every member can now connect an unlimited number of custom domains at zero cost. Head to Settings → Domains to add yours.',
   now() - interval '19 days'),

  ('📈 Real-time click validation widget added to Dashboard',
   'Your dashboard now shows a live 48-hour widget with human vs bot split, auto-refreshing every 15 seconds. No page reload needed.',
   now() - interval '21 days'),

  ('🔥 Server upgrade complete — 12 CPU / 48GB RAM cluster live',
   'Migration to our new high-performance cluster is finished with zero downtime. Expect noticeably faster redirects and instant dashboards.',
   now() - interval '23 days'),

  ('📬 Inbox system launched',
   'You can now receive personal messages from the AdsPx team plus system-wide broadcasts. Filter by type, mark as read, and never miss an important update.',
   now() - interval '25 days'),

  ('🌐 IPv6 support enabled on all shortener domains',
   'Every AdsPx short link now resolves over both IPv4 and IPv6 for better global reach and faster mobile carrier delivery.',
   now() - interval '27 days'),

  ('🛠️ Maintenance notice — completed successfully',
   'Scheduled DB maintenance for index optimisation finished ahead of schedule with zero downtime. All systems fully operational.',
   now() - interval '28 days'),

  ('🎯 New: Bulk link creation via CSV',
   'Power users can now create up to 500 links at once by uploading a CSV. Available under Create Link → Bulk Import.',
   now() - interval '29 days'),

  ('💬 Telegram support channel now live',
   'Join our official Telegram community for real-time support, tips, and updates from other AdsPx members.',
   now() - interval '30 days'),

  ('👋 Welcome to AdsPx — read this first',
   'New here? Check out our quick-start guide: create your first link, add your wallet, launch a Facebook campaign, and monitor live clicks. It takes 5 minutes.',
   now() - interval '32 days')
) AS v(subject, body, created_at)
WHERE NOT EXISTS (
  SELECT 1 FROM public.messages m
  WHERE m.is_broadcast = true AND m.subject = v.subject
);

\echo '==> Verifying — latest 5 broadcast notices'
SELECT to_char(created_at, 'YYYY-MM-DD HH24:MI') AS posted, subject
FROM public.messages
WHERE is_broadcast = true
ORDER BY created_at DESC
LIMIT 5;

\echo '✅ Broadcast news seeded'
