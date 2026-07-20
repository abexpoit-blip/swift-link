# Project Memory

## Core
Production DB = self-hosted Supabase on user's own VPS (NOT Lovable Cloud, NOT pslvdopdgyvkyuzypmkw.supabase.co). Never query Lovable Cloud DB for production data. For real click/traffic data, give psql commands to run on the VPS against self-hosted Supabase.
Click/traffic storage MUST be space-efficient (hybrid): keep row count/columns minimal — aggregate counters on `links` (clicks_count, bot_clicks_count) + daily rollup in `earnings_ledger`; only store lean rows in `clicks`/`traffic_logs` (avoid wide columns / long text). Do NOT add new wide columns to clicks tables without asking.
User deploys manually on VPS. Always give exact deploy + log-check commands after backend code change.
Explanations in Bangla, beginner-friendly step-by-step.

## Memories
- [VPS specs](mem://infra/vps-specs) — 12 core / 48GB RAM, PM2 fork 4 workers ports 3000-3003, self-hosted Supabase `supabase-db` container

