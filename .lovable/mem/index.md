# Project Memory

## Core
Deployment target: self-hosted Supabase at https://api.adspx.com on user's VPS (109.205.180.183). Lovable Cloud is used ONLY inside the Lovable editor — production overrides VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY at deploy time via sed in the VPS deploy script. Do NOT try to "remove" Lovable Cloud from the project — it's permanent in the editor; the override pattern is the correct approach.
Frontend domain: https://adspx.com (Nginx + PM2 running `.output/server/index.mjs`). API domain: https://api.adspx.com (Nginx → Kong → Supabase stack at /opt/supabase-prod).
Self-hosted Supabase ANON_KEY (safe to commit): eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgyODE0NjM5LCJleHAiOjIwOTgxNzQ2Mzl9.uzi5eworVCioXTFFqf0sojuQrwgeRZ7tV7dzRQ8BZ8E
SERVICE_ROLE_KEY and POSTGRES_PASSWORD live only in /opt/supabase-prod/.env on VPS — never commit.
Schema file: deploy/adspx_full_schema.sql (30 tables, 21 functions imported into self-hosted Postgres).
User prefers Bangla, beginner-friendly step-by-step deploy guidance. Always include exact deploy + log-check command after backend changes.

## Memories
(none yet)
