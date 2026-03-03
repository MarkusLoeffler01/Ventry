#!/usr/bin/env bash
set -euo pipefail

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "Error: pg_dump is not installed or not in PATH."
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Error: DATABASE_URL is not set."
  exit 1
fi

echo "Creating Prisma JSON backup..."
npx tsx prisma/backup.ts

echo "Backup complete."
