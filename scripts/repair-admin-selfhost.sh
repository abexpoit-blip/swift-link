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

print_auth_diagnostics() {
  local body_file="$1"

  echo ""
  echo "--- Auth API response body ---" >&2
  if [[ -s "$body_file" ]]; then
    cat "$body_file" >&2
  else
    echo "(empty response body)" >&2
  fi
  echo "" >&2
  echo "--- Auth container logs (last 120 lines) ---" >&2
  if docker inspect supabase-auth >/dev/null 2>&1; then
    docker logs --tail 120 supabase-auth >&2 || true
  else
    docker ps --format '{{.Names}}' | grep -Ei 'auth|gotrue' | while read -r c; do
      echo "### ${c}" >&2
      docker logs --tail 120 "$c" >&2 || true
    done
  fi
  echo "" >&2
}

repair_auth_user_directly_in_db() {
  echo "==> Repairing admin auth row directly in database"
  docker exec -i supabase-db psql -U postgres -d postgres \
    -v ON_ERROR_STOP=1 \
    -v admin_email="$ADMIN_EMAIL" \
    -v admin_password="$ADMIN_PASSWORD" <<'SQL'
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  v_uid uuid;
  v_email text := lower(:'admin_email');
  v_identity_id_is_uuid boolean := false;
  v_has_provider_id boolean := false;
BEGIN
  SELECT id INTO v_uid
  FROM auth.users
  WHERE lower(email) = v_email
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_uid IS NOT NULL THEN
    -- Duplicate auth rows for one email can make the Auth API fail with HTTP 500.
    -- Keep the oldest admin account and move duplicate emails out of the login path.
    UPDATE auth.users
       SET email = 'duplicate-admin-' || id::text || '@adspx.local',
           updated_at = now()
     WHERE lower(email) = v_email
       AND id <> v_uid;
  END IF;

  IF v_uid IS NULL THEN
    v_uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_sent_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_uid,
      'authenticated', 'authenticated', v_email,
      extensions.crypt(:'admin_password', extensions.gen_salt('bf')),
      now(), now(),
      jsonb_build_object('provider', 'email', 'providers', array['email']),
      jsonb_build_object('full_name', 'Admin'),
      false, now(), now(), '', '', '', ''
    );
  ELSE
    UPDATE auth.users
    SET aud = 'authenticated',
        role = 'authenticated',
        email = v_email,
        encrypted_password = extensions.crypt(:'admin_password', extensions.gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        confirmation_sent_at = COALESCE(confirmation_sent_at, now()),
        raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', array['email']),
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', 'Admin'),
        confirmation_token = '',
        recovery_token = '',
        email_change_token_new = '',
        email_change = '',
        updated_at = now()
    WHERE id = v_uid;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'auth'
      AND table_name = 'identities'
      AND column_name = 'id'
      AND udt_name = 'uuid'
  ) INTO v_identity_id_is_uuid;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'auth'
      AND table_name = 'identities'
      AND column_name = 'provider_id'
  ) INTO v_has_provider_id;

  DELETE FROM auth.identities
   WHERE provider = 'email'
     AND (
       user_id = v_uid
       OR lower(COALESCE(identity_data->>'email', '')) = v_email
       OR (v_has_provider_id AND COALESCE(provider_id, '') IN (v_uid::text, v_email))
     );

  IF v_has_provider_id AND v_identity_id_is_uuid THEN
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (v_uid, v_uid, v_uid::text, jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true), 'email', now(), now(), now())
    ON CONFLICT DO NOTHING;
  ELSIF v_has_provider_id THEN
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (v_uid::text, v_uid, v_uid::text, jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true), 'email', now(), now(), now())
    ON CONFLICT DO NOTHING;
  ELSIF v_identity_id_is_uuid THEN
    INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (v_uid, v_uid, jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true), 'email', now(), now(), now())
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (v_uid::text, v_uid, jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true), 'email', now(), now(), now())
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, plan_slug, click_quota, link_limit, created_at, updated_at)
  VALUES (v_uid, v_email, 'Admin', 'lifetime', NULL, NULL, now(), now())
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(NULLIF(public.profiles.full_name, ''), 'Admin'),
      plan_slug = 'lifetime',
      click_quota = NULL,
      link_limit = NULL,
      updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE 'Admin auth/profile repaired: %', v_uid;
END $$;

SELECT u.email, u.email_confirmed_at IS NOT NULL AS confirmed,
       EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'admin') AS is_admin,
       EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email') AS has_email_identity
FROM auth.users u
WHERE lower(u.email) = lower(:'admin_email')
ORDER BY u.created_at ASC
LIMIT 1;
SQL
}

admin_headers=(
  -H "apikey: ${SERVICE_KEY}"
  -H "Authorization: Bearer ${SERVICE_KEY}"
  -H "Content-Type: application/json"
)

echo "==> Finding existing admin auth user"
users_file="/tmp/adspx-auth-users.json"
users_status="$(curl -sS -o "$users_file" -w "%{http_code}" "${SUPABASE_URL%/}/auth/v1/admin/users?page=1&per_page=1000" \
  "${admin_headers[@]}" \
  || true)"

if [[ "$users_status" != "200" ]]; then
  echo "Auth admin list failed: HTTP ${users_status}; falling back to direct DB repair." >&2
  print_auth_diagnostics "$users_file"
  repair_auth_user_directly_in_db
  ADMIN_UID="$(docker exec -i supabase-db psql -U postgres -d postgres -tA -v admin_email="$ADMIN_EMAIL" -c "SELECT id FROM auth.users WHERE lower(email)=lower(:'admin_email') ORDER BY created_at ASC LIMIT 1;")"
else

ADMIN_UID="$(ADMIN_EMAIL="$ADMIN_EMAIL" node -e '
  const fs = require("fs");
  const email = process.env.ADMIN_EMAIL.toLowerCase();
  const payload = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  const users = Array.isArray(payload?.users) ? payload.users : Array.isArray(payload) ? payload : [];
  const user = users.find((u) => String(u.email || "").toLowerCase() === email);
  process.stdout.write(user?.id || "");
' "$users_file")"
fi

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
    print_auth_diagnostics "$create_file"
    repair_auth_user_directly_in_db
    ADMIN_UID="$(docker exec -i supabase-db psql -U postgres -d postgres -tA -v admin_email="$ADMIN_EMAIL" -c "SELECT id FROM auth.users WHERE lower(email)=lower(:'admin_email') ORDER BY created_at ASC LIMIT 1;")"
  else
    ADMIN_UID="$(node -e 'const fs=require("fs"); const p=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); process.stdout.write(p.id || p.user?.id || "")' "$create_file")"
  fi
else
  echo "==> Resetting admin password and confirming email"
  update_file="/tmp/adspx-admin-update.json"
  update_status="$(curl -sS -X PUT -o "$update_file" -w "%{http_code}" \
    "${SUPABASE_URL%/}/auth/v1/admin/users/${ADMIN_UID}" \
    "${admin_headers[@]}" \
    --data "$create_or_update_body")"
  if [[ "$update_status" != "200" ]]; then
    echo "Auth admin update failed: HTTP ${update_status}" >&2
    print_auth_diagnostics "$update_file"
    repair_auth_user_directly_in_db
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
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  --data "$login_body")"

if [[ "$login_status" != "200" ]]; then
  echo "Admin password login still failed: HTTP ${login_status}" >&2
  print_auth_diagnostics "$login_file"
  exit 1
fi

rm -f "$login_file" "$users_file"
echo "==> Admin login OK for ${ADMIN_EMAIL}"