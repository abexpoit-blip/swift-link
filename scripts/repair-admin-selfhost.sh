#!/usr/bin/env bash
# Repair/create the self-hosted AdsPx admin account using the Auth Admin API,
# then verify email+password login through the public Auth API.
set -Eeuo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

ADMIN_EMAIL="${ADSPX_ADMIN_EMAIL:-admin@adspx.com}"
ADMIN_PASSWORD="${ADSPX_ADMIN_PASSWORD:-}"

if [[ -z "$ADMIN_PASSWORD" ]]; then
  if [[ -t 0 ]]; then
    read -rsp "Admin password for ${ADMIN_EMAIL}: " ADMIN_PASSWORD
    echo
  else
    echo "Set ADSPX_ADMIN_PASSWORD before running this script." >&2
    exit 1
  fi
fi

echo "==> Ensuring backend env keys exist"
bash scripts/ensure-selfhost-env.sh

set -a
# shellcheck disable=SC1091
source /opt/supabase-prod/.env
set +a

SUPABASE_URL="${SUPABASE_URL:-${API_EXTERNAL_URL:-https://api.adspx.com}}"
ANON_KEY="${ANON_KEY:-${SUPABASE_PUBLISHABLE_KEY:-}}"
SERVICE_KEY="${SERVICE_ROLE_KEY:-${SUPABASE_SERVICE_ROLE_KEY:-}}"

if [[ -z "$SUPABASE_URL" || -z "$ANON_KEY" || -z "$SERVICE_KEY" ]]; then
  echo "Missing SUPABASE_URL, ANON_KEY, or SERVICE_ROLE_KEY in /opt/supabase-prod/.env" >&2
  exit 1
fi

json_payload() {
  node -e 'process.stdout.write(JSON.stringify(JSON.parse(process.argv[1])))' "$1"
}

admin_headers=(
  -H "apikey: ${SERVICE_KEY}"
  -H "Authorization: Bearer ${SERVICE_KEY}"
  -H "Content-Type: application/json"
)

echo "==> Finding existing admin auth user"
users_file="/tmp/adspx-auth-users.json"
curl -sS "${SUPABASE_URL%/}/auth/v1/admin/users?page=1&per_page=1000" \
  "${admin_headers[@]}" \
  -o "$users_file"

ADMIN_UID="$(ADMIN_EMAIL="$ADMIN_EMAIL" node -e '
  const fs = require("fs");
  const email = process.env.ADMIN_EMAIL.toLowerCase();
  const payload = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  const users = Array.isArray(payload?.users) ? payload.users : Array.isArray(payload) ? payload : [];
  const user = users.find((u) => String(u.email || "").toLowerCase() === email);
  process.stdout.write(user?.id || "");
' "$users_file")"

create_or_update_body="$(ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_PASSWORD" node -e '
  process.stdout.write(JSON.stringify({
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Admin" },
    app_metadata: { provider: "email", providers: ["email"] }
  }));
')"

if [[ -z "$ADMIN_UID" ]]; then
  echo "==> Creating admin auth user"
  create_file="/tmp/adspx-admin-create.json"
  create_status="$(curl -sS -o "$create_file" -w "%{http_code}" \
    "${SUPABASE_URL%/}/auth/v1/admin/users" \
    "${admin_headers[@]}" \
    --data "$create_or_update_body")"
  if [[ "$create_status" != "200" && "$create_status" != "201" ]]; then
    echo "Auth admin create failed: HTTP ${create_status}" >&2
    cat "$create_file" >&2
    exit 1
  fi
  ADMIN_UID="$(node -e 'const fs=require("fs"); const p=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); process.stdout.write(p.id || p.user?.id || "")' "$create_file")"
else
  echo "==> Resetting admin password and confirming email"
  update_file="/tmp/adspx-admin-update.json"
  update_status="$(curl -sS -X PUT -o "$update_file" -w "%{http_code}" \
    "${SUPABASE_URL%/}/auth/v1/admin/users/${ADMIN_UID}" \
    "${admin_headers[@]}" \
    --data "$create_or_update_body")"
  if [[ "$update_status" != "200" ]]; then
    echo "Auth admin update failed: HTTP ${update_status}" >&2
    cat "$update_file" >&2
    exit 1
  fi
fi

if [[ -z "$ADMIN_UID" ]]; then
  echo "Could not resolve admin user id." >&2
  exit 1
fi

echo "==> Ensuring public admin profile and role"
docker exec -i supabase-db psql -U postgres -d postgres \
  -v ON_ERROR_STOP=1 \
  -v admin_uid="$ADMIN_UID" \
  -v admin_email="$ADMIN_EMAIL" <<'SQL'
INSERT INTO public.profiles (id, email, full_name, plan_slug, click_quota, link_limit, created_at, updated_at)
VALUES (:'admin_uid'::uuid, lower(:'admin_email'), 'Admin', 'lifetime', NULL, NULL, now(), now())
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(public.profiles.full_name, ''), 'Admin'),
    plan_slug = 'lifetime',
    click_quota = NULL,
    link_limit = NULL,
    updated_at = now();

INSERT INTO public.user_roles (user_id, role)
VALUES (:'admin_uid'::uuid, 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

SELECT p.email, EXISTS (
  SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role = 'admin'
) AS is_admin, p.plan_slug
FROM public.profiles p
WHERE p.id = :'admin_uid'::uuid;
SQL

echo "==> Testing password login through Auth API"
login_body="$(ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_PASSWORD" node -e '
  process.stdout.write(JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }));
')"
login_file="/tmp/adspx-admin-login.json"
login_status="$(curl -sS -o "$login_file" -w "%{http_code}" \
  "${SUPABASE_URL%/}/auth/v1/token?grant_type=password" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  --data "$login_body")"

if [[ "$login_status" != "200" ]]; then
  echo "Admin password login still failed: HTTP ${login_status}" >&2
  cat "$login_file" >&2
  exit 1
fi

rm -f "$login_file" "$users_file"
echo "==> Admin login OK for ${ADMIN_EMAIL}"