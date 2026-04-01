#!/usr/bin/env bash
set -euo pipefail

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "Error: pg_restore is not installed or not in PATH."
  exit 1
fi

BACKUP_FILE="${1:-backups/json/latest.json}"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: Backup file does not exist: ${BACKUP_FILE}"
  exit 1
fi

echo "Restoring Prisma JSON data from: ${BACKUP_FILE}"
npx tsx prisma/restore.ts "${BACKUP_FILE}"

echo "Restore complete."
