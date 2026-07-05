#!/usr/bin/env bash
# Repairs self-hosted Auth database rows that can make the Auth API return HTTP 500.
# Safe to run repeatedly.
set -Eeuo pipefail

DB_CONTAINER="${SELFHOST_DB_CONTAINER:-supabase-db}"

echo "==> Repairing self-hosted auth data safety defaults"

if ! docker inspect "$DB_CONTAINER" >/dev/null 2>&1; then
  echo "Missing database container: ${DB_CONTAINER}" >&2
  exit 1
fi

docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE
  token_columns text[] := ARRAY[
    'confirmation_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token',
    'reauthentication_token',
    'email_change',
    'phone_change'
  ];
  text_column text;
BEGIN
  FOREACH text_column IN ARRAY token_columns LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'auth'
        AND table_name = 'users'
        AND column_name = text_column
    ) THEN
      EXECUTE format('UPDATE auth.users SET %I = '''' WHERE %I IS NULL', text_column, text_column);
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'auth'
      AND table_name = 'users'
      AND column_name = 'raw_app_meta_data'
  ) THEN
    UPDATE auth.users
       SET raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', ARRAY['email'])
     WHERE raw_app_meta_data IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'auth'
      AND table_name = 'users'
      AND column_name = 'raw_user_meta_data'
  ) THEN
    UPDATE auth.users
       SET raw_user_meta_data = '{}'::jsonb
     WHERE raw_user_meta_data IS NULL;
  END IF;
END $$;

SELECT
  COUNT(*) FILTER (WHERE confirmation_token IS NULL) AS null_confirmation_tokens,
  COUNT(*) FILTER (WHERE recovery_token IS NULL) AS null_recovery_tokens,
  COUNT(*) AS total_auth_users
FROM auth.users;
SQL

echo "==> Auth data repair complete"