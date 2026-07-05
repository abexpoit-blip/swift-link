#!/usr/bin/env bash
# Full system healthcheck: earnings, withdrawals, our adsterra injection, admin
# Usage: bash scripts/system-healthcheck.sh
set -euo pipefail

SUPA_ENV="/opt/supabase-prod/.env"
POSTGRES_PASSWORD=$(grep '^POSTGRES_PASSWORD=' "$SUPA_ENV" | cut -d= -f2-)
ANON_KEY=$(grep '^ANON_KEY=' "$SUPA_ENV" | cut -d= -f2-)
APP_URL="${APP_URL:-https://adspx.com}"

psqlx() {
  docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" supabase-db psql -U supabase_admin -d postgres -c "$1"
}

section() { echo ""; echo "============================================================"; echo "  $1"; echo "============================================================"; }

section "1) APP SETTINGS (our_adsterra_url + injection rate)"
psqlx "SELECT our_adsterra_url, injection_threshold, injection_count, daily_redirect_enabled FROM public.app_settings;"

section "2) ADMIN PROFILE (plan, balance, clicks)"
psqlx "SELECT p.email, p.plan_slug, p.link_limit, p.clicks_used, p.balance_available, p.balance_withdrawn,
              (SELECT role::text FROM public.user_roles WHERE user_id=p.id LIMIT 1) AS role
         FROM public.profiles p WHERE p.email='admin@adspx.com';"

section "3) LINKS OVERVIEW"
psqlx "SELECT COUNT(*) AS total_links,
              COUNT(*) FILTER (WHERE is_active) AS active,
              SUM(clicks_count) AS human_clicks,
              SUM(bot_clicks_count) AS bot_clicks
         FROM public.links;"

section "4) EARNINGS LEDGER (today + last 3 days)"
psqlx "SELECT day, COUNT(DISTINCT user_id) AS users, SUM(total_clicks) AS total_clicks,
              SUM(adsterra_clicks) AS our_ads_clicks, SUM(user_clicks) AS user_clicks,
              ROUND(SUM(earnings_usd)::numeric, 6) AS earnings_usd
         FROM public.earnings_ledger
         WHERE day >= (now() at time zone 'utc')::date - 3
         GROUP BY day ORDER BY day DESC;"

section "5) WITHDRAWALS (all statuses)"
psqlx "SELECT status, COUNT(*), COALESCE(SUM(amount_usd),0) AS total_usd
         FROM public.withdrawals GROUP BY status ORDER BY status;"

section "6) USER WALLETS"
psqlx "SELECT network, COUNT(*) AS wallets FROM public.user_wallets GROUP BY network ORDER BY network;"

section "7) BOT DETECTION STATE"
psqlx "SELECT COUNT(*) FILTER (WHERE auto_blocked) AS auto_blocked_fp,
              COUNT(*) AS total_fp,
              (SELECT COUNT(*) FROM public.velocity_tracking WHERE blocked) AS velocity_locks
         FROM public.bot_fingerprints;"

section "8) LIVE INJECTION TEST — 40 human hits, count our_adsterra redirects"
# Reset velocity/fingerprint so we can test injection freshly
psqlx "TRUNCATE public.bot_fingerprints, public.velocity_tracking;" >/dev/null

# Get or create a test link
ADMIN_ID=$(docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" supabase-db psql -U supabase_admin -d postgres -tAc "SELECT id FROM public.profiles WHERE email='admin@adspx.com';" | tr -d '[:space:]')
SLUG="inj$(date +%s | tail -c 6)"
psqlx "INSERT INTO public.links (user_id, short_code, title, adsterra_url, safe_url, is_active, prelanding_template)
       VALUES ('$ADMIN_ID','$SLUG','inj test','https://user-offer.example.com/?u=1','',true,'none');" >/dev/null

OUR_ADS_URL=$(docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" supabase-db psql -U supabase_admin -d postgres -tAc "SELECT our_adsterra_url FROM public.app_settings LIMIT 1;" | tr -d '[:space:]')
echo "our_adsterra_url = $OUR_ADS_URL"
echo "Hitting $APP_URL/r/$SLUG 40 times as unique 'humans'..."

HITS_OUR=0
HITS_USER=0
HITS_SAFE=0
for i in $(seq 1 40); do
  # Unique UA per hit so fingerprint differs
  UA="Mozilla/5.0 (Linux; Android 13; TEST-$i) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36"
  LOC=$(curl -sS -o /dev/null -D - \
    -A "$UA" \
    -H 'Accept-Language: en-US,en;q=0.9' \
    -H 'sec-ch-ua: "Chromium";v="126", "Not.A/Brand";v="24"' \
    -H 'sec-ch-ua-mobile: ?1' \
    -H 'sec-ch-ua-platform: "Android"' \
    -H 'Referer: https://l.facebook.com/' \
    "$APP_URL/r/$SLUG?fbclid=IwAR_test_$i" | awk 'BEGIN{IGNORECASE=1}/^location:/{print $2}' | tr -d '\r\n' | head -c 200)
  if [[ -z "$LOC" ]]; then HITS_SAFE=$((HITS_SAFE+1))
  elif [[ "$LOC" == *"$(echo "$OUR_ADS_URL" | sed 's|https\?://||' | cut -d/ -f1)"* ]]; then HITS_OUR=$((HITS_OUR+1))
  else HITS_USER=$((HITS_USER+1)); fi
done
echo ""
echo "Results out of 40 human hits:"
echo "  → user's offer URL : $HITS_USER"
echo "  → OUR adsterra URL : $HITS_OUR   (expected ~2 with 1/20 injection)"
echo "  → safe (bot/block) : $HITS_SAFE"

section "9) THIS LINK'S EARNINGS ROW"
psqlx "SELECT day, total_clicks, adsterra_clicks AS our_ads, user_clicks, ROUND(earnings_usd::numeric,6) AS usd
         FROM public.earnings_ledger
         WHERE link_id = (SELECT id FROM public.links WHERE short_code='$SLUG');"

section "10) ADMIN BALANCE AFTER TEST"
psqlx "SELECT email, ROUND(balance_available::numeric,6) AS balance_available FROM public.profiles WHERE email='admin@adspx.com';"

section "11) WITHDRAWAL SIMULATION"
# Insert a test withdrawal, then admin-approve it via SQL
echo "-> Inserting a pending withdrawal of \$0.001"
psqlx "INSERT INTO public.user_wallets (user_id, network, address, label)
       VALUES ('$ADMIN_ID','USDT_TRC20','TTestAddress0000000000000000000000','test')
       ON CONFLICT DO NOTHING;" >/dev/null
psqlx "INSERT INTO public.withdrawals (user_id, amount_usd, network, wallet_address, status)
       VALUES ('$ADMIN_ID', 0.001, 'USDT_TRC20', 'TTestAddress0000000000000000000000', 'pending')
       RETURNING id, amount_usd, status;"

echo ""
echo "============================================================"
echo "  DONE. Review each section:"
echo "  §1  our_adsterra_url must NOT be empty/example.com"
echo "  §8  ~2 of 40 hits should land on OUR adsterra (5% inject)"
echo "  §9  adsterra_clicks should be ~2, user_clicks ~ rest"
echo "  §10 balance_available should have grown"
echo "  §11 withdrawal row inserted with status=pending"
echo "============================================================"
