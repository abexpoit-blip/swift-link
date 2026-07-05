#!/usr/bin/env bash
# Test shortlink: create a link, then curl it as bot / human / mobile
# Usage: bash scripts/test-shortlink.sh
set -euo pipefail

APP_URL="${APP_URL:-https://adspx.com}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@adspx.com}"
SLUG="${SLUG:-test$(date +%s | tail -c 5)}"
MONEY_URL="${MONEY_URL:-https://www.profitableratecpm.com/kfx1a4x8ff?key=test-offer}"
SAFE_URL="${SAFE_URL:-https://en.wikipedia.org/wiki/Digital_marketing}"

SUPA_ENV="/opt/supabase-prod/.env"
if [[ ! -f "$SUPA_ENV" ]]; then
  echo "ERROR: $SUPA_ENV not found. Run this on the VPS." >&2
  exit 1
fi
POSTGRES_PASSWORD=$(grep '^POSTGRES_PASSWORD=' "$SUPA_ENV" | cut -d= -f2-)
ANON_KEY=$(grep '^ANON_KEY=' "$SUPA_ENV" | cut -d= -f2-)

echo "==> Getting admin user id"
ADMIN_ID=$(docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" supabase-db \
  psql -U supabase_admin -d postgres -tAc \
  "SELECT id FROM auth.users WHERE email='${ADMIN_EMAIL}' LIMIT 1;" | tr -d '[:space:]')
if [[ -z "$ADMIN_ID" ]]; then echo "Admin not found"; exit 1; fi
echo "    admin_id=$ADMIN_ID"

echo "==> Creating shortlink slug=$SLUG"
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" supabase-db \
  psql -U supabase_admin -d postgres -c \
  "INSERT INTO public.links (user_id, short_code, title, adsterra_url, safe_url, is_active, prelanding_template)
   VALUES ('${ADMIN_ID}', '${SLUG}', 'Test link', '${MONEY_URL}', '${SAFE_URL}', true, 'default')
   ON CONFLICT (short_code) DO UPDATE SET adsterra_url=EXCLUDED.adsterra_url, safe_url=EXCLUDED.safe_url, is_active=true;"

URL="${APP_URL}/r/${SLUG}"
echo ""
echo "======================================================"
echo "Shortlink: $URL"
echo "======================================================"

hdr() {
  echo ""
  echo "----- $1 -----"
}

test_ua() {
  local label="$1"; local ua="$2"; local extra="${3:-}"
  hdr "$label"
  # -sS silent w/ errors, -o /dev/null discard body, -w prints info; -I would be HEAD, we want GET
  curl -sS -o /tmp/rr_body.html -D /tmp/rr_head.txt \
    -A "$ua" $extra "$URL" || true
  echo "STATUS:  $(head -1 /tmp/rr_head.txt)"
  echo "LOC:     $(grep -i '^location:' /tmp/rr_head.txt | head -1)"
  echo "SIZE:    $(wc -c < /tmp/rr_body.html) bytes"
  echo "SNIPPET: $(head -c 140 /tmp/rr_body.html | tr '\n' ' ')"
}

test_ua "1) HARD BOT (facebookexternalhit)" \
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"

test_ua "2) HARD BOT (Googlebot)" \
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"

test_ua "3) HARD BOT (curl)" \
  "curl/8.0.0"

test_ua "4) HUMAN mobile Chrome + fbclid" \
  "Mozilla/5.0 (Linux; Android 13; SM-G990B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36" \
  "-H 'Accept-Language: en-US,en;q=0.9' -H 'sec-ch-ua: \"Chromium\";v=\"126\", \"Not.A/Brand\";v=\"24\"' -H 'sec-ch-ua-mobile: ?1' -H 'sec-ch-ua-platform: \"Android\"' -H 'Referer: https://l.facebook.com/'"

# The above extra headers won't parse as multiple args via string; do explicit call:
hdr "4b) HUMAN mobile Chrome + fbclid (proper headers)"
curl -sS -o /tmp/rr_body.html -D /tmp/rr_head.txt \
  -A "Mozilla/5.0 (Linux; Android 13; SM-G990B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36" \
  -H 'Accept-Language: en-US,en;q=0.9' \
  -H 'sec-ch-ua: "Chromium";v="126", "Not.A/Brand";v="24"' \
  -H 'sec-ch-ua-mobile: ?1' \
  -H 'sec-ch-ua-platform: "Android"' \
  -H 'Referer: https://l.facebook.com/' \
  "${URL}?fbclid=IwAR_test_click_123" || true
echo "STATUS:  $(head -1 /tmp/rr_head.txt)"
echo "LOC:     $(grep -i '^location:' /tmp/rr_head.txt | head -1)"
echo "SIZE:    $(wc -c < /tmp/rr_body.html) bytes"

hdr "5) HUMAN desktop Chrome (no fbclid, no referer)"
curl -sS -o /tmp/rr_body.html -D /tmp/rr_head.txt \
  -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36" \
  -H 'Accept-Language: en-US,en;q=0.9' \
  -H 'sec-ch-ua: "Chromium";v="126", "Not.A/Brand";v="24"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "Windows"' \
  "$URL" || true
echo "STATUS:  $(head -1 /tmp/rr_head.txt)"
echo "LOC:     $(grep -i '^location:' /tmp/rr_head.txt | head -1)"
echo "SIZE:    $(wc -c < /tmp/rr_body.html) bytes"

echo ""
echo "==> DB stats for slug=$SLUG"
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" supabase-db \
  psql -U supabase_admin -d postgres -c \
  "SELECT short_code, clicks_count, bot_clicks_count, is_active FROM public.links WHERE short_code='${SLUG}';"

echo ""
echo "==> Last 10 click rows"
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" supabase-db \
  psql -U supabase_admin -d postgres -c \
  "SELECT created_at, is_bot, is_human, decision, country, LEFT(user_agent,60) AS ua
     FROM public.clicks
     WHERE link_id = (SELECT id FROM public.links WHERE short_code='${SLUG}')
     ORDER BY created_at DESC LIMIT 10;"

echo ""
echo "======================================================"
echo "Expected results:"
echo "  1-3 (bots):    200 + inline safe HTML  (NO 302 to money URL)"
echo "  4b (human+fbclid mobile): 302 -> $MONEY_URL"
echo "  5  (human, no fbclid): 302 -> safe_url  OR 200 safe HTML"
echo "======================================================"
