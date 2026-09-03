#!/bin/bash
# ============================================================================
# ZARUDA PLATFORM: DATABASE RESTORE SCRIPT
# Version: 1.0
#
# Restores a PostgreSQL backup with safety prompts and verification.
#
# Usage:
#   ./server/scripts/restore-database.sh backups/zaruda_backup_20250901_120000.sql
#   ./server/scripts/restore-database.sh backups/zaruda_backup_20250901_120000.sql.gz
#   ./server/scripts/restore-database.sh --list                     # List available backups
#   ./server/scripts/restore-database.sh --latest                   # Restore most recent backup
#
# WARNING: This will DROP and recreate all tables in the target database!
# ============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-mhub_db}"
DB_USER="${DB_USER:-postgres}"
FORCE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --list)
            echo "📋 Available backups in ${BACKUP_DIR}:"
            ls -lh "${BACKUP_DIR}"/zaruda_backup_*.sql* 2>/dev/null || echo "   No backups found"
            exit 0
            ;;
        --latest)
            BACKUP_FILE=$(ls -t "${BACKUP_DIR}"/zaruda_backup_*.sql* 2>/dev/null | head -1)
            if [ -z "$BACKUP_FILE" ]; then
                echo "❌ No backups found in ${BACKUP_DIR}"
                exit 1
            fi
            echo "📦 Using latest backup: ${BACKUP_FILE}"
            ;;
        --force)
            FORCE=true
            shift
            ;;
        -*)
            echo "Unknown option: $1"
            echo "Usage: $0 [BACKUP_FILE] [--force] [--list] [--latest]"
            exit 1
            ;;
        *)
            BACKUP_FILE="$1"
            shift
            ;;
    esac
done

if [ -z "${BACKUP_FILE:-}" ]; then
    echo "Usage: $0 [BACKUP_FILE] [--force] [--list] [--latest]"
    echo ""
    echo "Examples:"
    echo "  $0 backups/zaruda_backup_20250901_120000.sql"
    echo "  $0 --latest"
    echo "  $0 --list"
    exit 1
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

# Safety prompt
if [ "$FORCE" = false ]; then
    echo ""
    echo "⚠️  WARNING: This will DROP and recreate all tables in database '${DB_NAME}'!"
    echo ""
    echo "Backup file: ${BACKUP_FILE}"
    echo "Target database: ${DB_HOST}:${DB_PORT}/${DB_NAME}"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo "❌ Restore cancelled."
        exit 0
    fi
fi

echo ""
echo "======================================================================"
echo "🗄️  ZARUDA PLATFORM: DATABASE RESTORE"
echo "======================================================================"
echo "Timestamp:    $(date)"
echo "Backup File:  ${BACKUP_FILE}"
echo "Target DB:    ${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo "======================================================================"

# Check if pg_restore/psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql not found. Install PostgreSQL client tools."
    exit 1
fi

# Check if file is compressed
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo ""
    echo "📦 Restoring from compressed backup..."
    gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -q
else
    echo ""
    echo "📦 Restoring from SQL backup..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$BACKUP_FILE" -q
fi

# Check if restore was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database restored successfully!"
    echo ""
    echo "📊 Verifying table counts..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            COUNT(*) as total_tables,
            COUNT(*) FILTER (WHERE table_name = 'users') as users,
            COUNT(*) FILTER (WHERE table_name = 'posts') as posts,
            COUNT(*) FILTER (WHERE table_name = 'categories') as categories,
            COUNT(*) FILTER (WHERE table_name = 'rewards') as rewards
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE';
    "
    echo ""
    echo "✅ Restore complete!"
else
    echo "❌ Restore failed!"
    exit 1
fi
