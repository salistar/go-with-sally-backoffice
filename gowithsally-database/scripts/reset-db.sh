#!/bin/bash
# GoWithSally - Database Reset Script
# WARNING: This will DELETE ALL DATA and reseed the database

set -euo pipefail

MONGO_HOST="${MONGO_HOST:-localhost}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_USER="${MONGO_ROOT_USER:-gowithsally_admin}"
MONGO_PASS="${MONGO_ROOT_PASSWORD:-sally_secure_2024}"
MONGO_DB="${MONGO_DB_NAME:-gowithsally}"

echo "========================================="
echo "GoWithSally - DATABASE RESET"
echo "========================================="
echo ""
echo "WARNING: This will DELETE ALL DATA in '$MONGO_DB'!"
echo ""

if [ "${1:-}" != "-y" ] && [ "${1:-}" != "--yes" ]; then
  read -p "Are you sure? Type 'RESET' to confirm: " confirm
  if [ "$confirm" != "RESET" ]; then
    echo "Aborted."
    exit 0
  fi
fi

echo ""
echo "[1/4] Dropping database..."
mongosh "mongodb://$MONGO_USER:$MONGO_PASS@$MONGO_HOST:$MONGO_PORT/$MONGO_DB?authSource=admin" \
  --eval "db.dropDatabase()" --quiet

echo "[2/4] Re-initializing database..."
mongosh "mongodb://$MONGO_USER:$MONGO_PASS@$MONGO_HOST:$MONGO_PORT/$MONGO_DB?authSource=admin" \
  --file /scripts/01-init-db.js

echo "[3/4] Creating indexes..."
mongosh "mongodb://$MONGO_USER:$MONGO_PASS@$MONGO_HOST:$MONGO_PORT/$MONGO_DB?authSource=admin" \
  --file /scripts/02-create-indexes.js

echo "[4/4] Seeding data..."
mongosh "mongodb://$MONGO_USER:$MONGO_PASS@$MONGO_HOST:$MONGO_PORT/$MONGO_DB?authSource=admin" \
  --file /scripts/03-seed-data.js

echo ""
echo "========================================="
echo "Database reset complete!"
echo "========================================="
