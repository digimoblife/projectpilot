#!/usr/bin/env bash
# =============================================================================
# ProjectPilot Database Automated Backup Script
# =============================================================================
set -e

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
CONTAINER_NAME="${DB_CONTAINER:-projectpilot_prod_postgres}"
DB_USER="${POSTGRES_USER:-projectpilot}"
DB_NAME="${POSTGRES_DB:-projectpilot_prod}"
BACKUP_FILE="${BACKUP_DIR}/projectpilot_backup_${TIMESTAMP}.sql.gz"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

mkdir -p "$BACKUP_DIR"

echo "=== [ProjectPilot Backup] Starting Database Backup at $(date) ==="
echo "Target Container: $CONTAINER_NAME"
echo "Database: $DB_NAME"
echo "Backup Destination: $BACKUP_FILE"

# Execute compressed pg_dump directly via Docker
docker exec -t "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

# Verify backup size
BACKUP_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
echo "=== [ProjectPilot Backup] Backup Completed Successfully ($BACKUP_SIZE) ==="

# Clean up backups older than RETENTION_DAYS
echo "[ProjectPilot Backup] Pruning backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "projectpilot_backup_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
echo "[ProjectPilot Backup] Backup retention cycle finished."
