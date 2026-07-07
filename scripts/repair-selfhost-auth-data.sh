#!/usr/bin/env bash
# Repairs self-hosted Auth database rows that can make the Auth API return HTTP 500.
# Safe to run repeatedly.
set -Eeuo pipefail

DB_CONTAINER="${SELFHOST_DB_CONTAINER:-supabase-db}"
PRIMARY_ADMIN_EMAIL="${PRIMARY_ADMIN_EMAIL:-admin@adspx.com}"

echo "==> Repairing self-hosted auth data safety defaults"

if ! docker inspect "$DB_CONTAINER" >/dev/null 2>&1; then
  echo "Missing database container: ${DB_CONTAINER}" >&2
  exit 1
fi

docker exec -i \
  -e PRIMARY_ADMIN_EMAIL="$PRIMARY_ADMIN_EMAIL" \
  "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -v primary_admin_email="$PRIMARY_ADMIN_EMAIL" <<'SQL'
SET adspx.primary_admin_email TO :'primary_admin_email';

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

DO $$
DECLARE
  primary_admin_email text := lower(current_setting('adspx.primary_admin_email', true));
  primary_admin_id uuid;
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

  IF primary_admin_email IS NULL OR primary_admin_email = '' THEN
    primary_admin_email := 'admin@adspx.com';
  END IF;

  SELECT id
    INTO primary_admin_id
    FROM auth.users
   WHERE lower(email) = primary_admin_email
   LIMIT 1;

  IF primary_admin_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, plan_slug, click_quota, link_limit)
    VALUES (primary_admin_id, primary_admin_email, 'admin', 'lifetime', NULL, NULL)
    ON CONFLICT (id) DO UPDATE
       SET email = EXCLUDED.email,
           plan_slug = 'lifetime',
           click_quota = NULL,
           link_limit = NULL;

    INSERT INTO public.user_roles (user_id, role)
    VALUES
      (primary_admin_id, 'admin'::public.app_role),
      (primary_admin_id, 'super_admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $fn$
  DECLARE
    v_email text := lower(COALESCE(NEW.email, ''));
    v_is_admin boolean := lower(COALESCE(NEW.email, '')) = 'admin@adspx.com';
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, telegram, plan_slug, click_quota, link_limit)
    VALUES (
      NEW.id,
      v_email,
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(v_email, '@', 1)),
      NULLIF(NEW.raw_user_meta_data->>'telegram', ''),
      CASE WHEN v_is_admin THEN 'lifetime' ELSE 'free' END,
      CASE WHEN v_is_admin THEN NULL ELSE 10000 END,
      CASE WHEN v_is_admin THEN NULL ELSE 100 END
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, CASE WHEN v_is_admin THEN 'admin'::public.app_role ELSE 'user'::public.app_role END)
    ON CONFLICT (user_id, role) DO NOTHING;

    IF v_is_admin THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'super_admin'::public.app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

    RETURN NEW;
  END
  $fn$;
END $$;

SELECT
  COUNT(*) FILTER (WHERE confirmation_token IS NULL) AS null_confirmation_tokens,
  COUNT(*) FILTER (WHERE recovery_token IS NULL) AS null_recovery_tokens,
  COUNT(*) AS total_auth_users
FROM auth.users;

SELECT u.email, r.role
  FROM auth.users u
  JOIN public.user_roles r ON r.user_id = u.id
 WHERE lower(u.email) = lower(current_setting('adspx.primary_admin_email', true))
 ORDER BY r.role;
SQL

echo "==> Auth data repair complete"