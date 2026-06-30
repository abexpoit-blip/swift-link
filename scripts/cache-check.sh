#!/usr/bin/env bash
# Cloudflare cache hit/miss checker for adspx.com
# Usage: ./scripts/cache-check.sh [domain]
#   ./scripts/cache-check.sh              # defaults to adspx.com
#   ./scripts/cache-check.sh adspx.com

set -u
DOMAIN="${1:-adspx.com}"
API_HOST="api.${DOMAIN}"

GREEN='\033[0;32m'; RED='\033[0;31m'; YEL='\033[1;33m'; CYA='\033[0;36m'; NC='\033[0m'

# 2nd hit-ই আসল cache status দেখায় (1st hit সাধারণত MISS/EXPIRED)
hit_check() {
  local url="$1" label="$2"
  echo -e "\n${CYA}── ${label}${NC}\n   ${url}"
  for i in 1 2 3; do
    out=$(curl -sI -o /dev/null -w "HTTP=%{http_code} TIME=%{time_total}s\n" -D /tmp/_h "$url")
    cf=$(grep -i '^cf-cache-status:' /tmp/_h | awk '{print $2}' | tr -d '\r')
    cc=$(grep -i '^cache-control:' /tmp/_h | cut -d: -f2- | tr -d '\r' | sed 's/^ //')
    age=$(grep -i '^age:' /tmp/_h | awk '{print $2}' | tr -d '\r')
    ray=$(grep -i '^cf-ray:' /tmp/_h | awk '{print $2}' | tr -d '\r')
    case "$cf" in
      HIT)        col="${GREEN}" ;;
      MISS|EXPIRED|REVALIDATED) col="${YEL}" ;;
      BYPASS|DYNAMIC) col="${CYA}" ;;
      *)          col="${RED}" ;;
    esac
    printf "   hit#%d  ${col}%-12s${NC}  %s  age=%s  cache-control='%s'  ray=%s\n" \
      "$i" "${cf:-NONE}" "$out" "${age:-0}" "${cc:-none}" "${ray:-none}"
  done
}

echo -e "${CYA}═══════════════════════════════════════════════"
echo -e " Cloudflare Cache Check  →  ${DOMAIN}"
echo -e "═══════════════════════════════════════════════${NC}"

# --- Static assets (should HIT after 1st request) ---
hit_check "https://${DOMAIN}/adspx-logo.png"     "Logo PNG (static)"
hit_check "https://${DOMAIN}/favicon-32.png"     "Favicon (static)"
hit_check "https://${DOMAIN}/og-default.jpg"     "OG image (static)"
hit_check "https://${DOMAIN}/manifest.json"      "Manifest (static)"

# --- HTML / SSR pages (short TTL, may HIT) ---
hit_check "https://${DOMAIN}/"                   "Home page (HTML/SSR)"
hit_check "https://${DOMAIN}/leaderboard"        "Leaderboard (HTML/SSR)"

# --- API / Supabase (MUST be BYPASS / DYNAMIC) ---
hit_check "https://${API_HOST}/rest/v1/"         "Supabase REST (must BYPASS)"
hit_check "https://${DOMAIN}/api/health"         "App API path (must BYPASS)"

echo -e "\n${CYA}═══════════════════════════════════════════════${NC}"
echo -e " ${GREEN}Expected:${NC}"
echo -e "   • Static assets   → ${GREEN}HIT${NC} from hit#2 onwards"
echo -e "   • HTML pages      → ${YEL}MISS→HIT${NC} (short TTL OK)"
echo -e "   • api.* / /api/*  → ${CYA}BYPASS or DYNAMIC${NC} (never HIT)"
echo -e "${CYA}═══════════════════════════════════════════════${NC}\n"

rm -f /tmp/_h
