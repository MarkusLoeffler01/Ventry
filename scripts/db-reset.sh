#!/usr/bin/env bash
set -euo pipefail

# Argument parsing
SKIP_SEED=false
for arg in "$@"
do
    if [ "$arg" == "--skip-seed" ]; then
        SKIP_SEED=true
    fi
done

if [ -z "${DATABASE_URL:-}" ]; then
  # Check if .env exists and has BASE_URL (assuming DATABASE_URL is covered) or skip check
  if [ -f .env ] && grep -q "^DATABASE_URL=" .env; then
    : # It exists in .env, prisma will pick it up
  else
    echo "Error: DATABASE_URL is not set and not found in .env."
    exit 1
  fi
fi

echo "WARNING: This will permanently delete all data in the database!"
read -p "Are you sure you want to continue? (yes/no) " -r
if [[ "$REPLY" != "yes" ]]; then
  echo "Aborting."
  exit 0
fi

echo "🗑️  Clearing database and reapplying migrations..."

if [ "$SKIP_SEED" = true ]; then
    echo "🌱 Skipping seed..."
    npx prisma migrate reset --force --skip-seed
else
    echo "🌱 Applying seed..."
    npx prisma migrate reset --force
fi

echo "✅ Database reset complete!"
