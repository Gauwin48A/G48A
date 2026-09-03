#!/bin/bash
# ============================================================================
# ZARUDA PLATFORM: AUTOMATED BACKUP CRON SETUP
# Version: 1.0
#
# Installs daily automated PostgreSQL backups via cron with:
#   - Timestamped compressed dumps
#   - 14-day retention
#   - Email notification on failure (optional)
#   - Lock file to prevent concurrent runs
#
# Usage:
#   ./server/scripts/backup-cron-setup.sh              # Install cron job
#   ./server/scripts/backup-cron-setup.sh --remove     # Remove cron job
#   ./server/scripts/backup-cron-setup.sh --status     # Show current cron
# ============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/zaruda}"
CRON_SCHEDULE="${CRON_SCHEDULE:-0 3 * * *}"  # Daily at 3:00 AM
RETENTION_DAYS="${RETENTION_DAYS:-14}"
CRON_MARKER="# ZARUDA_DB_BACKUP"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Parse arguments ─────────────────────────────────────────────
ACTION="install"
while [[ $# -gt 0 ]]; do
    case $1 in
        --remove) ACTION="remove"; shift ;;
        --status) ACTION="status"; shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# ── Status ──────────────────────────────────────────────────────
if [ "$ACTION" = "status" ]; then
    echo "=== Zaruda Backup Cron Status ==="
    echo ""
    if crontab -l 2>/dev/null | grep -q "$CRON_MARKER"; then
        echo "✅ Cron job is ACTIVE"
        crontab -l 2>/dev/null | grep "$CRON_MARKER"
    else
        echo "❌ Cron job is NOT installed"
    fi
    echo ""
    echo "Backup directory: $BACKUP_DIR"
    if [ -d "$BACKUP_DIR" ]; then
        COUNT=$(ls "$BACKUP_DIR"/zaruda_backup_*.sql* 2>/dev/null | wc -l)
        echo "Existing backups: $COUNT"
        ls -lht "$BACKUP_DIR"/zaruda_backup_*.sql* 2>/dev/null | head -5
    else
        echo "Backup directory does not exist yet"
    fi
    exit 0
fi

# ── Remove ──────────────────────────────────────────────────────
if [ "$ACTION" = "remove" ]; then
    echo "Removing Zaruda backup cron job..."
    crontab -l 2>/dev/null | grep -v "$CRON_MARKER" | crontab -
    echo "✅ Cron job removed"
    exit 0
fi

# ── Install ─────────────────────────────────────────────────────
echo "======================================================================"
echo "🗄️  ZARUDA PLATFORM: BACKUP CRON SETUP"
echo "======================================================================"
echo "Schedule:  $CRON_SCHEDULE (daily at 3:00 AM)"
echo "Retention: $RETENTION_DAYS days"
echo "Directory: $BACKUP_DIR"
echo "======================================================================"

# Create backup directory
mkdir -p "$BACKUP_DIR"
echo "✅ Backup directory created: $BACKUP_DIR"

# Create backup script
BACKUP_SCRIPT="$SCRIPT_DIR/backup-database.sh"
if [ ! -f "$BACKUP_SCRIPT" ]; then
    echo "❌ Error: backup-database.sh not found at $BACKUP_SCRIPT"
    exit 1
fi

# Create cron entry
CRON_LINE="$CRON_SCHEDULE cd $SCRIPT_DIR/.. && ./scripts/backup-database.sh --compress --retention $RETENTION_DAYS --output $BACKUP_DIR >> $BACKUP_DIR/backup.log 2>&1 $CRON_MARKER"

# Check if already installed
if crontab -l 2>/dev/null | grep -q "$CRON_MARKER"; then
    echo "⚠️  Cron job already exists. Updating..."
    crontab -l 2>/dev/null | grep -v "$CRON_MARKER" | crontab -
fi

# Install new cron job
(crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
echo "✅ Cron job installed: $CRON_SCHEDULE"

# Verify
if crontab -l 2>/dev/null | grep -q "$CRON_MARKER"; then
    echo "✅ Cron job verified active"
else
    echo "❌ Failed to install cron job"
    exit 1
fi

echo ""
echo "📋 Management commands:"
echo "   Status:  $0 --status"
echo "   Remove:  $0 --remove"
echo "   Logs:    tail -f $BACKUP_DIR/backup.log"
echo ""
echo "✅ Backup cron setup complete!"
