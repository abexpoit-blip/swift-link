#!/usr/bin/env bash
# Ensures /opt/supabase-prod/.env has all keys the app needs.
# Safe to run repeatedly — only adds keys that are missing, never overwrites existing ones.
set -Eeuo pipefail

ENV_FILE="${SELFHOST_ENV_FILE:-/opt/supabase-prod/.env}"
ENV_DIR="$(dirname "$ENV_FILE")"

# Required keys with their known values on this VPS.
# If a key is already present in the file, we DO NOT overwrite it.
declare -A REQUIRED=(
  [POSTGRES_PASSWORD]="d15ea36d3875a41833af1d96a5517d3b34ae118740984102"
  [JWT_SECRET]="d7970ed22c33f6e4441439dbe4ee75ad520862133af411817ca6e4673ef83e57"
  [DASHBOARD_USER]="supabase"
  [DASHBOARD_PASSWORD]="055029da91beac58b8bd2177"
  [SECRET_KEY_BASE]="ead769cefc8084dd90097643f4d78d88dc64adc2b5e1db4878138ed5a1f6026b"
  [VAULT_ENC_KEY]="9669bf292b2d1d8a11b6de179f2ec27e"
  [ANON_KEY]="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgyODE0NjM5LCJleHAiOjIwOTgxNzQ2Mzl9.uzi5eworVCioXTFFqf0sojuQrwgeRZ7tV7dzRQ8BZ8E"
  [SERVICE_ROLE_KEY]="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODI4MTQ2MzksImV4cCI6MjA5ODE3NDYzOX0.X00UwEmqY4I0GkYvkT3tNO2BvI81Ffzs_CF2Kb0ybNM"
  [SUPABASE_URL]="https://api.adspx.com"
  [API_EXTERNAL_URL]="https://api.adspx.com"
)

mkdir -p "$ENV_DIR"
touch "$ENV_FILE"
chmod 600 "$ENV_FILE"

added=0
for key in "${!REQUIRED[@]}"; do
  if grep -qE "^${key}=" "$ENV_FILE"; then
    continue
  fi
  echo "${key}=${REQUIRED[$key]}" >> "$ENV_FILE"
  echo "  + added ${key}"
  added=$((added+1))
done

# Also mirror SERVICE_ROLE_KEY → SUPABASE_SERVICE_ROLE_KEY and ANON_KEY → SUPABASE_PUBLISHABLE_KEY
# so the app runtime reads them regardless of naming.
if ! grep -qE "^SUPABASE_SERVICE_ROLE_KEY=" "$ENV_FILE"; then
  echo "SUPABASE_SERVICE_ROLE_KEY=${REQUIRED[SERVICE_ROLE_KEY]}" >> "$ENV_FILE"
  echo "  + added SUPABASE_SERVICE_ROLE_KEY"
  added=$((added+1))
fi
if ! grep -qE "^SUPABASE_PUBLISHABLE_KEY=" "$ENV_FILE"; then
  echo "SUPABASE_PUBLISHABLE_KEY=${REQUIRED[ANON_KEY]}" >> "$ENV_FILE"
  echo "  + added SUPABASE_PUBLISHABLE_KEY"
  added=$((added+1))
fi

if [[ $added -eq 0 ]]; then
  echo "==> ${ENV_FILE}: all required keys already present"
else
  echo "==> ${ENV_FILE}: added ${added} missing key(s)"
fi

# Final verification — fail loudly if anything is still missing.
missing=()
for key in SUPABASE_URL SERVICE_ROLE_KEY ANON_KEY SUPABASE_SERVICE_ROLE_KEY SUPABASE_PUBLISHABLE_KEY; do
  if ! grep -qE "^${key}=" "$ENV_FILE"; then
    missing+=("$key")
  fi
done
if [[ ${#missing[@]} -gt 0 ]]; then
  echo "!! Still missing: ${missing[*]}" >&2
  exit 1
fi
