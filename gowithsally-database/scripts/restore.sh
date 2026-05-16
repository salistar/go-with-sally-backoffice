#!/bin/bash
# GoWithSally - MongoDB Restore Script
# Usage: ./restore.sh <backup_file> [--drop]

set -euo pipefail

MONGO_HOST="${MONGO_HOST:-mongodb}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_USER="${MONGO_ROOT_USER:-gowithsally_admin}"
MONGO_PASS="${MONGO_ROOT_PASSWORD:-sally_secure_2024}"
MONGO_DB="${MONGO_DB_NAME:-gowithsally}"
BACKUP_FILE="${1:?Backup file required}"
DROP_FLAG="${2:-}"

AUTH_ARGS="--host=$MONGO_HOST --port=$MONGO_PORT --username=$MONGO_USER --password=$MONGO_PASS --authenticationDatabase=admin"

echo "========================================="
echo "GoWithSally - MongoDB Restore"
echo "========================================="

if [ ! -f "$BACKUP_FILE" ]; then
  echo "[ERROR] Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "[INFO] Restoring from: $BACKUP_FILE"

if [[ "$BACKUP_FILE" == *.tar.gz ]]; then
  TEMP_DIR=$(mktemp -d)
  tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"
  RESTORE_PATH=$(find "$TEMP_DIR" -name "$MONGO_DB" -type d | head -1)
  RESTORE_DIR=$(dirname "$RESTORE_PATH")

  if [ "$DROP_FLAG" == "--drop" ]; then
    echo "[WARN] Dropping existing database before restore!"
    mongorestore $AUTH_ARGS --db=$MONGO_DB --drop "$RESTORE_DIR/$MONGO_DB" --gzip
  else
    mongorestore $AUTH_ARGS --db=$MONGO_DB "$RESTORE_DIR/$MONGO_DB" --gzip
  fi
  rm -rf "$TEMP_DIR"
elif [[ "$BACKUP_FILE" == *.gz ]]; then
  if [ "$DROP_FLAG" == "--drop" ]; then
    mongorestore $AUTH_ARGS --db=$MONGO_DB --drop --archive="$BACKUP_FILE" --gzip
  else
    mongorestore $AUTH_ARGS --db=$MONGO_DB --archive="$BACKUP_FILE" --gzip
  fi
fi

echo "[OK] Restore complete!"
echo "========================================="
