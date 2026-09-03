#!/bin/bash
# ============================================================================
# ZARUDA PLATFORM: DATABASE BACKUP SCRIPT
# Version: 1.0
# 
# Creates timestamped PostgreSQL backups with optional compression
# and automatic retention management.
#
# Usage:
#   ./server/scripts/backup-database.sh                    # Standard backup
#   ./server/scripts/backup-database.sh --compress         # Compressed backup
#   ./server/scripts/backup-database.sh --retention 7      # Keep 7 days of backups
#   ./server/scripts/backup-database.sh --output /backups  # Custom output directory
# ============================================================================

set -euo pipefail

# Default configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
COMPRESS=false
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="zaruda_backup_${TIMESTAMP}.sql"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --compress)
            COMPRESS=true
            BACKUP_FILENAME="zaruda_backup_${TIMESTAMP}.sql.gz"
            shift
            ;;
        --retention)
            RETENTION_DAYS="$2"
            shift 2
            ;;
        --output)
            BACKUP_DIR="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--compress] [--retention DAYS] [--output DIR]"
            exit 1
            ;;
    esac
done

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "======================================================================"
echo "🗄️  ZARUDA PLATFORM: DATABASE BACKUP"
echo "======================================================================"
echo "Timestamp:    $(date)"
echo "Output Dir:   $BACKUP_DIR"
echo "Compressed:   $COMPRESS"
echo "Retention:    $RETENTION_DAYS days"
echo "======================================================================"

# Get database connection info from environment or use defaults
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-mhub_db}"
DB_USER="${DB_USER:-postgres}"

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
    echo "❌ Error: pg_dump not found. Install PostgreSQL client tools."
    exit 1
fi

# Create backup
echo ""
echo "🔌 Connecting to PostgreSQL at ${DB_HOST}:${DB_PORT}/${DB_NAME}..."
echo "📦 Creating backup: ${BACKUP_FILENAME}"

if [ "$COMPRESS" = true ]; then
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --no-owner --no-privileges --clean --if-exists \
        | gzip > "${BACKUP_DIR}/${BACKUP_FILENAME}"
else
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --no-owner --no-privileges --clean --if-exists \
        > "${BACKUP_DIR}/${BACKUP_FILENAME}"
fi

# Check if backup was successful
if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILENAME}" | cut -f1)
    echo "✅ Backup created successfully!"
    echo "   File: ${BACKUP_DIR}/${BACKUP_FILENAME}"
    echo "   Size: ${BACKUP_SIZE}"
else
    echo "❌ Backup failed!"
    exit 1
fi

# Clean up old backups based on retention policy
echo ""
echo "🧹 Cleaning up backups older than ${RETENTION_DAYS} days..."
DELETED_COUNT=$(find "$BACKUP_DIR" -name "zaruda_backup_*.sql*" -type f -mtime "+${RETENTION_DAYS}" -print -delete | wc -l)
echo "   Deleted ${DELETED_COUNT} old backup(s)"

# Show current backups
echo ""
echo "📋 Current backups in ${BACKUP_DIR}:"
ls -lh "${BACKUP_DIR}"/zaruda_backup_*.sql* 2>/dev/null || echo "   No backups found"
echo ""
echo "✅ Backup complete!"
