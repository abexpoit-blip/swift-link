---
name: VPS specs
description: Production VPS hardware — 12 CPU cores, 48GB RAM, self-hosted Supabase + PM2 cluster. Use for tuning worker counts, pg pool, memory limits.
type: reference
---
Server: vmi3407408 (Hostinger/Contabo class)
CPU: 12 cores
RAM: 48 GB
Runtime: PM2 fork mode, 4 Node workers (ports 3000-3003), Nginx upstream load balance
DB: Self-hosted Supabase (container: `supabase-db`), NOT Lovable Cloud
Domain: adspx.com (Cloudflare in front), api.adspx.com (Supabase)
Deploy: `cd /var/www/adspx && git pull && bash deploy-vps.sh`
Headroom: can safely run 8-12 Node workers if traffic demands; keep pg `max_connections` ≥ 200.
