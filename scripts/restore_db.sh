#!/usr/bin/env bash
# =============================================================================
# ProjectPilot Database Restore & Verification Script
# =============================================================================
set -e

BACKUP_FILE="$1"
CONTAINER_NAME="${DB_CONTAINER:-projectpilot_prod_postgres}"
DB_USER="${POSTGRES_USER:-projectpilot}"
DB_NAME="${POSTGRES_DB:-projectpilot_prod}"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <path_to_backup_file.sql.gz>"
    echo "Example: $0 ./backups/projectpilot_backup_20260816_120000.sql.gz"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file '$BACKUP_FILE' not found!"
    exit 1
fi

echo "=== [ProjectPilot Restore] Preparing Database Restoration ==="
echo "Target Container: $CONTAINER_NAME"
echo "Database: $DB_NAME"
echo "Source Backup: $BACKUP_FILE"

read -p "⚠️ WARNING: This will overwrite existing data in '$DB_NAME'. Proceed? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restore aborted by user."
    exit 1
fi

echo "[ProjectPilot Restore] Decompressing and importing backup into database..."
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME"

echo "=== [ProjectPilot Restore] Database Restored Successfully! ==="
