#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="${APP_NAME:-adspx}"
APP_DIR="${APP_DIR:-/var/www/adspx}"

cd "$APP_DIR"

echo "==> Updating source"
git pull origin main

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
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME" --update-env
else
  pm2 start "bun run serve:selfhost" --name "$APP_NAME" --update-env
fi

echo "==> Saving PM2 process list"
pm2 save

echo "==> Recent logs"
pm2 logs "$APP_NAME" --lines 30 --nostream