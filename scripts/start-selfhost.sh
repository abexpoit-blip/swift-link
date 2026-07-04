#!/usr/bin/env bash
set -Eeuo pipefail

HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-3000}"

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ ! -f ".output/server/index.mjs" ]]; then
  echo "Missing .output/server/index.mjs. Run: bun run build" >&2
  exit 1
fi

exec node .output/server/index.mjs --host "$HOST" --port "$PORT"