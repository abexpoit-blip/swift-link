#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

SELFHOST_ENV_FILE="${SELFHOST_ENV_FILE:-/opt/supabase-prod/.env}"

load_env_file() {
  local env_file="$1"
  if [[ -f "$env_file" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$env_file"
    set +a
  fi
}

if [[ -f "$SELFHOST_ENV_FILE" ]]; then
  load_env_file "$SELFHOST_ENV_FILE"

  BACKEND_SUPABASE_URL="${SUPABASE_URL:-${API_EXTERNAL_URL:-https://api.adspx.com}}"
  APP_BROWSER_URL="${APP_BROWSER_URL:-${PUBLIC_SITE_URL:-https://adspx.com}}"

  export BACKEND_SUPABASE_URL
  export VITE_SUPABASE_URL="${APP_BROWSER_URL%/}"
  export VITE_SUPABASE_PUBLISHABLE_KEY="${ANON_KEY:-${SUPABASE_PUBLISHABLE_KEY:-}}"
  export VITE_SUPABASE_PROJECT_ID="${VITE_SUPABASE_PROJECT_ID:-selfhost}"
  export SUPABASE_URL="${BACKEND_SUPABASE_URL%/}"
  export SUPABASE_PUBLISHABLE_KEY="$VITE_SUPABASE_PUBLISHABLE_KEY"
  export SUPABASE_SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY:-${SUPABASE_SERVICE_ROLE_KEY:-}}"

  echo "Build env: self-hosted backend active; browser auth origin=${VITE_SUPABASE_URL}"
else
  echo "Build env: ${SELFHOST_ENV_FILE} not found; using existing environment"
fi

vite build

if [[ -f "$SELFHOST_ENV_FILE" ]]; then
  if grep -Rqs "pslvdopdgyvkyuzypmkw\.supabase\.co" .output/public/assets 2>/dev/null; then
    echo "!! Browser bundle contains the old cloud auth URL." >&2
    echo "!! Refusing build: login would hit the wrong backend and show invalid credentials." >&2
    exit 1
  fi

  if grep -Rqs "https://api\.adspx\.com" .output/public/assets 2>/dev/null; then
    echo "!! Browser bundle contains direct API subdomain calls." >&2
    echo "!! Refusing build: browser auth must use same-origin proxy at https://adspx.com." >&2
    exit 1
  fi

  echo "Build check: browser bundle is using same-origin self-host auth"
fi