#!/bin/bash
# GoWithSally - MongoDB Backup Script
# Usage: ./backup.sh [full|collections|specific COLLECTION_NAME]

set -euo pipefail

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MONGO_HOST="${MONGO_HOST:-mongodb}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_USER="${MONGO_ROOT_USER:-gowithsally_admin}"
MONGO_PASS="${MONGO_ROOT_PASSWORD:-sally_secure_2024}"
MONGO_DB="${MONGO_DB_NAME:-gowithsally}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

AUTH_ARGS="--host=$MONGO_HOST --port=$MONGO_PORT --username=$MONGO_USER --password=$MONGO_PASS --authenticationDatabase=admin"

echo "========================================="
echo "GoWithSally - MongoDB Backup"
echo "Time: $(date)"
echo "========================================="

backup_full() {
  echo "[INFO] Starting full database backup..."
  DEST="$BACKUP_DIR/full_${TIMESTAMP}"
  mongodump $AUTH_ARGS --db=$MONGO_DB --out=$DEST --gzip
  tar -czf "$DEST.tar.gz" -C "$BACKUP_DIR" "full_${TIMESTAMP}"
  rm -rf "$DEST"
  echo "[OK] Full backup saved: $DEST.tar.gz"
  echo "[INFO] Size: $(du -sh "$DEST.tar.gz" | cut -f1)"
}

backup_collections() {
  echo "[INFO] Backing up individual collections..."
  for col in users drivers rides messages conversations services badges priceproposals notifications; do
    DEST="$BACKUP_DIR/${col}_${TIMESTAMP}.gz"
    mongodump $AUTH_ARGS --db=$MONGO_DB --collection=$col --archive=$DEST --gzip
    echo "  -> $col: $(du -sh "$DEST" | cut -f1)"
  done
  echo "[OK] All collections backed up"
}

backup_specific() {
  local COLLECTION=$1
  echo "[INFO] Backing up collection: $COLLECTION..."
  DEST="$BACKUP_DIR/${COLLECTION}_${TIMESTAMP}.gz"
  mongodump $AUTH_ARGS --db=$MONGO_DB --collection=$COLLECTION --archive=$DEST --gzip
  echo "[OK] Saved: $DEST ($(du -sh "$DEST" | cut -f1))"
}

cleanup_old() {
  echo "[INFO] Cleaning backups older than $RETENTION_DAYS days..."
  find $BACKUP_DIR -type f -name "*.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
  find $BACKUP_DIR -type f -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
  echo "[OK] Cleanup done"
}

# Main
case "${1:-full}" in
  full)        backup_full ;;
  collections) backup_collections ;;
  specific)    backup_specific "${2:?Collection name required}" ;;
  *)           echo "Usage: $0 [full|collections|specific COLLECTION]" ; exit 1 ;;
esac

cleanup_old

echo "========================================="
echo "Backup complete!"
echo "========================================="
