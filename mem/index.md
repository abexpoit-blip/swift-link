# Project Memory

## Core
Self-hosted infrastructure ONLY. Self-hosted Supabase (docker on VPS) + VPS hosting (PM2 + bun). Nothing runs on Lovable Cloud/hosting. Never point `.env` at Lovable Cloud Supabase URL — always use local docker Supabase (Kong gateway) URL + keys.
Bangla explanations, beginner-friendly step-by-step deploy. Always include exact deploy + log-check commands after backend changes.
Domain: adspx.com. App: PM2 process `adspx` at `/var/www/adspx`, runs `.output/server/index.mjs` via bun. DB: `docker exec supabase-db psql -U postgres -d postgres`.
