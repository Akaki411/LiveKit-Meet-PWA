#!/bin/sh
set -e

CONFIG_DIR=/app/config
CONFIG_FILE="$CONFIG_DIR/.env.local"

mkdir -p "$CONFIG_DIR"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "[entrypoint] No config found at $CONFIG_FILE."
  echo "[entrypoint] Creating it from the template (.env.example)."
  echo "[entrypoint] Fill in LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET and AUTH_SECRET, then restart the container."
  cp /app/.env.example "$CONFIG_FILE"
fi

cp "$CONFIG_FILE" /app/.env.local

exec "$@"
