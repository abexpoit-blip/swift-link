#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="${APP_NAME:-adspx}"
APP_DIR="${APP_DIR:-/var/www/adspx}"

cd "$APP_DIR"

echo "==> Updating source"
git pull origin main

echo "==> Ensuring self-hosted backend env has all required keys"
bash scripts/ensure-selfhost-env.sh

echo "==> Repairing self-hosted auth data before deploy"
bash scripts/repair-selfhost-auth-data.sh

echo "==> Loading self-hosted backend env for the browser build"
set -a
# shellcheck disable=SC1091
source /opt/supabase-prod/.env
set +a
export BACKEND_SUPABASE_URL="${SUPABASE_URL:-${API_EXTERNAL_URL:-https://api.adspx.com}}"
# Browser auth goes through the main site. This avoids client-side timeouts when
# api.adspx.com is blocked by firewall/proxy rules from some networks.
export VITE_SUPABASE_URL="${APP_PUBLIC_URL:-https://adspx.com}"
export VITE_SUPABASE_PUBLISHABLE_KEY="${ANON_KEY:-${SUPABASE_PUBLISHABLE_KEY:-}}"
export VITE_SUPABASE_PROJECT_ID="${VITE_SUPABASE_PROJECT_ID:-selfhost}"
export SUPABASE_URL="${BACKEND_SUPABASE_URL}"
export SUPABASE_PUBLISHABLE_KEY="${VITE_SUPABASE_PUBLISHABLE_KEY}"
export SUPABASE_SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY:-${SUPABASE_SERVICE_ROLE_KEY:-}}"
echo "Build env: VITE_SUPABASE_URL=${VITE_SUPABASE_URL} BACKEND_SUPABASE_URL=$([[ -n "${BACKEND_SUPABASE_URL:-}" ]] && echo set || echo missing) VITE_SUPABASE_PUBLISHABLE_KEY=$([[ -n "${VITE_SUPABASE_PUBLISHABLE_KEY:-}" ]] && echo set || echo missing)"

echo "==> Checking self-hosted auth accepts the anon key"
auth_status="$(curl -sS -o /tmp/adspx-auth-settings.json -w "%{http_code}" \
  "${BACKEND_SUPABASE_URL%/}/auth/v1/settings" \
  -H "apikey: ${VITE_SUPABASE_PUBLISHABLE_KEY}" \
  -H "Authorization: Bearer ${VITE_SUPABASE_PUBLISHABLE_KEY}" || true)"
if [[ "$auth_status" == "401" || "$auth_status" == "403" ]]; then
  echo "!! Auth API rejected the anon key with HTTP ${auth_status}."
  echo "!! Restart the self-hosted backend containers so /opt/supabase-prod/.env is loaded, then rerun this deploy."
  exit 1
fi
echo "Auth API check: HTTP ${auth_status}"

echo "==> Stopping ${APP_NAME} before replacing build files"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 stop "$APP_NAME"
fi

echo "==> Removing stale build artifacts"
rm -rf .output node_modules/.vite

echo "==> Installing dependencies"
bun install --frozen-lockfile

echo "==> Building fresh output"
bun run build

echo "==> Starting ${APP_NAME}"
echo "==> Clearing old PM2 logs"
pm2 flush "$APP_NAME" >/dev/null 2>&1 || true

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 delete "$APP_NAME"
  pm2 start "bun run serve:selfhost" --name "$APP_NAME" --update-env
else
  pm2 start "bun run serve:selfhost" --name "$APP_NAME" --update-env
fi

echo "==> Waiting for local app health"
for i in {1..20}; do
  health_status="$(curl -sS -o /tmp/adspx-local-health.html -w "%{http_code}" http://127.0.0.1:3000/ || true)"
  if [[ "$health_status" =~ ^2|3 ]]; then
    echo "Local app health: HTTP ${health_status}"
    break
  fi
  if [[ "$i" -eq 20 ]]; then
    echo "!! Local app did not become healthy. Last HTTP: ${health_status}"
    pm2 logs "$APP_NAME" --lines 80 --nostream
    exit 1
  fi
  sleep 1
done

echo "==> Verifying same-origin backend proxy"
proxy_headers="$(curl -sS -X GET -D - -o /dev/null \
  -H "apikey: ${VITE_SUPABASE_PUBLISHABLE_KEY}" \
  -H "Authorization: Bearer ${VITE_SUPABASE_PUBLISHABLE_KEY}" \
  http://127.0.0.1:3000/auth/v1/settings || true)"
if ! grep -qi "x-adspx-backend-proxy: selfhost" <<<"$proxy_headers"; then
  echo "!! Same-origin backend proxy is not active. Expected x-adspx-backend-proxy: selfhost" >&2
  echo "$proxy_headers" >&2
  pm2 logs "$APP_NAME" --lines 80 --nostream
  exit 1
fi
if ! grep -qiE "^HTTP/[0-9.]+ 2[0-9][0-9]" <<<"$proxy_headers"; then
  echo "!! Same-origin backend proxy did not return HTTP 2xx for /auth/v1/settings" >&2
  echo "$proxy_headers" >&2
  pm2 logs "$APP_NAME" --lines 80 --nostream
  exit 1
fi
echo "Backend proxy check: OK"

echo "==> Saving PM2 process list"
pm2 save

echo "==> Recent logs"
pm2 logs "$APP_NAME" --lines 30 --nostream