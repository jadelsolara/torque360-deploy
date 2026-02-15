#!/bin/bash
# ============================================
# TORQUE 360 — Automated Backup Script
# Usage: ./backup.sh
# Designed for cron: 0 2 * * * /path/to/backup.sh
# ============================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR=${BACKUP_LOCAL_PATH:-/data/backups}
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/torque360_$DATE.sql.gz"
LOG_FILE="$BACKUP_DIR/backup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

log() { echo -e "${GREEN}[BACKUP]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1" | tee -a "$LOG_FILE"; }
error() { echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1" | tee -a "$LOG_FILE"; }

# Create backup directory
mkdir -p "$BACKUP_DIR"

log "============================================"
log "TORQUE 360 — Starting backup"
log "============================================"

cd "$PROJECT_ROOT"

# PostgreSQL dump
log "Dumping PostgreSQL database..."
DUMP_START=$(date +%s)

if docker compose exec -T postgres pg_dump -U torque torque360 | gzip > "$BACKUP_FILE"; then
    DUMP_END=$(date +%s)
    DUMP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    DUMP_DURATION=$((DUMP_END - DUMP_START))
    log "Database dump completed: $BACKUP_FILE ($DUMP_SIZE in ${DUMP_DURATION}s)"
else
    error "Database dump FAILED!"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Verify backup integrity
log "Verifying backup integrity..."
if gzip -t "$BACKUP_FILE" 2>/dev/null; then
    log "Backup integrity verified (gzip OK)"
else
    error "Backup integrity check FAILED!"
    exit 1
fi

# Upload to Cloudflare R2 (if configured)
if [ -n "${R2_ACCESS_KEY_ID:-}" ] && [ -n "${R2_SECRET_ACCESS_KEY:-}" ]; then
    log "Uploading to Cloudflare R2..."

    R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
    R2_DEST="s3://${R2_BUCKET_NAME:-torque360-files}/backups/$(basename "$BACKUP_FILE")"

    if command -v aws &> /dev/null; then
        AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
        AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
        aws s3 cp "$BACKUP_FILE" "$R2_DEST" \
            --endpoint-url "$R2_ENDPOINT" \
            --no-sign-request=false && \
            log "Uploaded to R2: $R2_DEST" || \
            error "R2 upload failed (aws cli)"
    elif command -v rclone &> /dev/null; then
        rclone copy "$BACKUP_FILE" "r2:${R2_BUCKET_NAME:-torque360-files}/backups/" && \
            log "Uploaded to R2 via rclone" || \
            error "R2 upload failed (rclone)"
    else
        error "No S3-compatible CLI found (aws or rclone). Skipping R2 upload."
    fi
else
    log "R2 not configured — backup stored locally only"
fi

# Cleanup old local backups
log "Cleaning up backups older than $RETENTION_DAYS days..."
DELETED_COUNT=$(find "$BACKUP_DIR" -name "torque360_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
log "Deleted $DELETED_COUNT old backup(s)"

# Summary
TOTAL_BACKUPS=$(find "$BACKUP_DIR" -name "torque360_*.sql.gz" | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)

log "============================================"
log "Backup completed successfully!"
log "File: $BACKUP_FILE"
log "Total backups: $TOTAL_BACKUPS ($TOTAL_SIZE)"
log "============================================"
