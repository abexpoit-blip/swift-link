#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="${APP_NAME:-adspx}"
APP_DIR="${APP_DIR:-/var/www/adspx}"

cd "$APP_DIR"

echo "==> Updating source"
git fetch origin main
if ! git merge --ff-only origin/main; then
  echo "==> Fast-forward blocked; discarding generated route tree and retrying"
  git checkout -- src/routeTree.gen.ts 2>/dev/null || true
  git merge --ff-only origin/main
fi

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
# Browser auth MUST go through the main site (/auth/v1, /rest/v1, /storage/v1).
# Do not reuse APP_PUBLIC_URL from the backend env here: self-hosted backend
# setups often set it to https://api.adspx.com, which makes browsers call the
# API subdomain directly and fail with TypeError: Failed to fetch.
export APP_BROWSER_URL="${APP_BROWSER_URL:-${PUBLIC_SITE_URL:-https://adspx.com}}"
export VITE_SUPABASE_URL="${APP_BROWSER_URL%/}"
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

echo "==> Zero-downtime deploy: keeping ${APP_NAME} running during build (rolling reload after)"
# NOTE: previously we stopped the app before build. That caused ~30s of 502s
# on /r/:code redirects and lost click stats during every deploy. We now build
# in place and use `pm2 reload` (cluster rolling restart) so at least one
# worker is always serving traffic.

echo "==> Removing stale build artifacts (keeps running workers untouched)"
# CRITICAL: wipe .output entirely. Otherwise chunks from previous partial builds
# stay behind while the new SSR manifest references NEW hashes. If the new build
# fails to emit a chunk (or an earlier build was aborted), the browser downloads
# HTML referencing NEW hashes, but the /assets/<hash>.js file is missing on disk,
# causing 500 "unhandled" for lazy route chunks (login, create-link, withdraw…).
# Users then see "Something went wrong — Failed to fetch dynamically imported module".
rm -rf .output .output.new node_modules/.vite


echo "==> Installing dependencies"
bun install --frozen-lockfile

echo "==> Building fresh output"
bun run build

echo "==> Verifying production server wrapper is bundled"
wrapper_bundle_file="$(node - <<'JS'
const { existsSync, readFileSync, readdirSync, statSync } = require('node:fs');
const { join } = require('node:path');

const root = '.output/server';
const markers = ['x-adspx-route', 'handleBackendProxy'];
let match = '';

function scan(dir) {
  if (!existsSync(dir) || match) return;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      scan(path);
      if (match) return;
      continue;
    }
    if (!/\.(mjs|js|cjs)$/.test(name)) continue;
    const text = readFileSync(path, 'utf8');
    if (markers.every((marker) => text.includes(marker))) {
      match = path;
      return;
    }
  }
}

scan(root);
process.stdout.write(match);
JS
)"
if [[ -z "$wrapper_bundle_file" ]]; then
  echo "!! Production server entry is not the AdsPx wrapper." >&2
  echo "!! Refusing deploy because HTML injection, /r safe routing, and backend proxy would not run." >&2
  echo "!! Checked all server bundle files under .output/server for AdsPx wrapper markers." >&2
  echo "!! Check vite.config.ts tanstackStart.server.entry points to the custom src/server.ts wrapper." >&2
  exit 1
fi
echo "Server wrapper bundle check: OK (${wrapper_bundle_file})"

echo "==> Verifying every SSR-referenced asset chunk exists on disk"
missing_chunks="$(node - <<'JS'
const { readFileSync, readdirSync, statSync, existsSync } = require('node:fs');
const { join } = require('node:path');
const assetsDir = '.output/public/assets';
if (!existsSync(assetsDir)) { console.log('MISSING_ASSETS_DIR'); process.exit(0); }
const onDisk = new Set(readdirSync(assetsDir));
const refs = new Set();
function scan(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) { scan(p); continue; }
    if (!/\.(js|mjs|cjs|html|json)$/.test(name)) continue;
    const txt = readFileSync(p, 'utf8');
    for (const m of txt.matchAll(/assets\/([A-Za-z0-9_.\-]+\.js)/g)) refs.add(m[1]);
  }
}
scan('.output/server');
scan(assetsDir);
const missing = [...refs].filter((f) => !onDisk.has(f));
if (missing.length) console.log(missing.join('\n'));
JS
)"
if [[ -n "$missing_chunks" ]]; then
  echo "!! Build produced SSR/manifest references to asset chunks that are missing on disk:" >&2
  echo "$missing_chunks" >&2
  echo "!! Refusing deploy — users would hit 500 on lazy route chunks (Failed to fetch dynamically imported module)." >&2
  exit 1
fi
echo "Asset integrity check: OK ($(ls .output/public/assets | wc -l) chunks on disk)"

echo "==> Verifying browser build uses same-origin backend proxy"
if grep -Rqs "https://api\.adspx\.com" .output/public/assets 2>/dev/null; then
  echo "!! Browser bundle still contains https://api.adspx.com." >&2
  echo "!! Refusing deploy because signup/login would fail in browsers." >&2
  echo "!! Set APP_BROWSER_URL=https://adspx.com and rerun deploy." >&2
  exit 1
fi
echo "Browser backend URL check: OK (${VITE_SUPABASE_URL})"

echo "==> Starting ${APP_NAME}"
echo "==> Clearing old PM2 logs"
pm2 flush "$APP_NAME" >/dev/null 2>&1 || true

# Load the same env that scripts/start-selfhost.sh loads, so PM2 can boot
# node .output/server/index.mjs directly in cluster mode (one worker per CPU).
load_env_file() { if [[ -f "$1" ]]; then set -a; source "$1"; set +a; fi; }
load_env_file "/opt/supabase-prod/.env"
SELFHOST_SUPABASE_URL="${SUPABASE_URL:-${API_EXTERNAL_URL:-https://api.adspx.com}}"
SELFHOST_PUBLISHABLE_KEY="${ANON_KEY:-${SUPABASE_PUBLISHABLE_KEY:-}}"
SELFHOST_SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY:-${SUPABASE_SERVICE_ROLE_KEY:-}}"
load_env_file "$(pwd)/.env"
export SUPABASE_URL="${SELFHOST_SUPABASE_URL:-${SUPABASE_URL:-${API_EXTERNAL_URL:-https://api.adspx.com}}}"
export SUPABASE_PUBLISHABLE_KEY="${SELFHOST_PUBLISHABLE_KEY:-${SUPABASE_PUBLISHABLE_KEY:-${ANON_KEY:-}}}"
export SUPABASE_SERVICE_ROLE_KEY="${SELFHOST_SERVICE_ROLE_KEY:-${SUPABASE_SERVICE_ROLE_KEY:-${SERVICE_ROLE_KEY:-}}}"
export HOST="${HOST:-0.0.0.0}"
export PORT="${PORT:-3000}"
export BACKEND_SUPABASE_URL="${SUPABASE_URL}"

if [[ ! -f ".output/server/index.mjs" ]]; then
  echo "!! Missing .output/server/index.mjs. Build failed?" >&2
  exit 1
fi

expected_entry="$(pwd)/.output/server/index.mjs"
pm2_entry() {
  pm2 jlist 2>/dev/null | PM2_APP_NAME="$APP_NAME" node -e '
let input = "";
process.stdin.on("data", (chunk) => { input += chunk; });
process.stdin.on("end", () => {
  try {
    const app = JSON.parse(input).find((item) => item?.name === process.env.PM2_APP_NAME);
    process.stdout.write(app?.pm2_env?.pm_exec_path || "");
  } catch {}
});
'
}

delete_legacy_pm2_apps() {
  local legacy_names
  legacy_names="$(pm2 jlist 2>/dev/null | PM2_APP_NAME="$APP_NAME" node -e '
let input = "";
process.stdin.on("data", (chunk) => { input += chunk; });
process.stdin.on("end", () => {
  try {
    const base = process.env.PM2_APP_NAME;
    const names = [...new Set(JSON.parse(input)
      .map((item) => item?.name)
      .filter((name) => typeof name === "string" && name.startsWith(`${base}-`) && /^\d+$/.test(name.slice(base.length + 1))))];
    process.stdout.write(names.join("\n"));
  } catch {}
});
' || true)"

  if [[ -z "$legacy_names" ]]; then
    echo "Legacy per-port PM2 apps: none"
    return
  fi

  echo "==> Removing legacy per-port PM2 apps so port ${PORT} serves the fresh wrapper"
  while IFS= read -r legacy_name; do
    [[ -z "$legacy_name" ]] && continue
    pm2 delete "$legacy_name" || true
  done <<< "$legacy_names"
}

delete_legacy_pm2_apps

current_entry="$(pm2_entry || true)"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  if [[ "$current_entry" == "$expected_entry" ]]; then
    echo "==> Rolling reload with current server entry"
    pm2 reload "$APP_NAME" --update-env
  else
    echo "==> PM2 points at old entry (${current_entry:-unknown}); recreating once"
    pm2 delete "$APP_NAME"
    echo "==> Starting cluster mode with current build"
    pm2 start "$expected_entry" \
      --name "$APP_NAME" \
      --interpreter node \
      -i max \
      --update-env \
      -- --host "$HOST" --port "$PORT"
  fi
else
  echo "==> Starting cluster mode with current build"
  pm2 start "$expected_entry" \
    --name "$APP_NAME" \
    --interpreter node \
    -i max \
    --update-env \
    -- --host "$HOST" --port "$PORT"
fi

actual_entry="$(pm2_entry || true)"
if [[ "$actual_entry" != "$expected_entry" ]]; then
  echo "!! PM2 is not serving the fresh server entry." >&2
  echo "Expected: $expected_entry" >&2
  echo "Actual:   ${actual_entry:-unknown}" >&2
  pm2 logs "$APP_NAME" --lines 80 --nostream
  exit 1
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

echo "==> Verifying chunk-recovery script is served from origin"
recovery_headers="$(mktemp)"
recovery_body="$(mktemp)"
curl -sS -D "$recovery_headers" -H "Host: adspx.com" "http://127.0.0.1:3000/?deploy_check=$(date +%s)" -o "$recovery_body" || true
recovery_count="$(grep -a -c "adspx_chunk_reload" "$recovery_body" || true)"
if ! grep -qi "x-adspx-route: ssr" "$recovery_headers"; then
  echo "!! Origin request is not passing through AdsPx SSR wrapper. Headers:" >&2
  grep -iE 'http/|content-type|x-adspx|server|location' "$recovery_headers" >&2 || true
  exit 1
fi
if ! grep -qi "x-adspx-chunk-recovery: 1" "$recovery_headers"; then
  echo "!! AdsPx wrapper ran, but chunk recovery injection did not complete. Headers:" >&2
  grep -iE 'http/|content-type|x-adspx|server|location' "$recovery_headers" >&2 || true
  echo "Body marker count: $recovery_count" >&2
  exit 1
fi
if [[ "$recovery_count" -lt "1" ]]; then
  echo "!! Origin HTML does not include adspx_chunk_reload (count=$recovery_count). Refusing deploy." >&2
  grep -iE 'http/|content-type|x-adspx|server|location' "$recovery_headers" >&2 || true
  head -c 500 "$recovery_body" >&2 || true
  exit 1
else
  echo "Chunk recovery check: OK"
fi
rm -f "$recovery_headers" "$recovery_body"


echo "==> Verifying same-origin backend proxy"
proxy_headers="$(curl -sS -X GET -D - -o /dev/null \
  -H "Host: adspx.com" \
  -H "apikey: ${VITE_SUPABASE_PUBLISHABLE_KEY}" \
  -H "Authorization: Bearer ${VITE_SUPABASE_PUBLISHABLE_KEY}" \
  http://127.0.0.1:3000/auth/v1/settings || true)"
if ! grep -qi "x-adspx-backend-proxy: selfhost" <<<"$proxy_headers"; then
  echo "!! Same-origin backend proxy is not active. Expected x-adspx-backend-proxy: selfhost" >&2
  echo "$proxy_headers" >&2
  pm2 logs "$APP_NAME" --lines 80 --nostream
  exit 1
fi
if ! grep -qiE "^HTTP/[0-9.]+ (2[0-9][0-9]|401)" <<<"$proxy_headers"; then
  echo "!! Same-origin backend proxy returned an unexpected status for /auth/v1/settings" >&2
  echo "$proxy_headers" >&2
  pm2 logs "$APP_NAME" --lines 80 --nostream
  exit 1
fi
if grep -qiE "^content-(encoding|length):" <<<"$proxy_headers"; then
  echo "!! Same-origin backend proxy is forwarding stale compression headers." >&2
  echo "!! This causes browser auth to fail with TypeError: Failed to fetch." >&2
  echo "$proxy_headers" >&2
  pm2 logs "$APP_NAME" --lines 80 --nostream
  exit 1
fi
echo "Backend proxy check: OK"

echo "==> Saving PM2 process list"
pm2 save

echo "==> Recent logs"
pm2 logs "$APP_NAME" --lines 30 --nostream