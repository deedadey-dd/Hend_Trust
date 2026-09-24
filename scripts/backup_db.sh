#!/usr/bin/env bash
# ==============================================================================
# HENDAXIS TRUST POSTGRESQL DATABASE BACKUP SCRIPT WITH BETTER STACK HEARTBEAT
# ==============================================================================
# Usage:
#   bash /var/www/hendaxis/Hend_Trust/scripts/backup_db.sh
# Can be scheduled via cron (e.g. daily at 02:00 AM):
#   0 2 * * * /var/www/hendaxis/Hend_Trust/scripts/backup_db.sh >> /var/log/hendaxis_backup.log 2>&1
# ==============================================================================

set -e

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="${BACKUP_DIR:-/var/backups/hendaxis_trust}"
BACKUP_FILE="${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql.gz"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# Load environment variables if available
PROJECT_ROOT="/var/www/hendaxis/Hend_Trust"
if [ -f "${PROJECT_ROOT}/backend/.env" ]; then
    set -a
    source "${PROJECT_ROOT}/backend/.env"
    set +a
elif [ -f "${PROJECT_ROOT}/.env" ]; then
    set -a
    source "${PROJECT_ROOT}/.env"
    set +a
fi

echo "===================================================="
echo "Starting PostgreSQL backup: $(date)"
echo "Target file: ${BACKUP_FILE}"
echo "===================================================="

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

# Determine database connection parameters from DATABASE_URL or environment
if [ -n "$DATABASE_URL" ]; then
    # Parse standard postgres://user:pass@host:port/dbname
    echo "Running pg_dump using DATABASE_URL..."
    pg_dump "$DATABASE_URL" --no-owner --clean --if-exists | gzip > "${BACKUP_FILE}"
elif [ -n "$POSTGRES_DB" ]; then
    echo "Running pg_dump using individual environment variables..."
    PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump -h "${POSTGRES_HOST:-localhost}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-hendaxis_user}" "${POSTGRES_DB}" --no-owner --clean --if-exists | gzip > "${BACKUP_FILE}"
else
    echo "Using default local database connection..."
    pg_dump -U hendaxis_user hendaxis_trust_db --no-owner --clean --if-exists | gzip > "${BACKUP_FILE}"
fi

# Verify backup file was created and is non-empty
if [ ! -s "${BACKUP_FILE}" ]; then
    echo "ERROR: Backup file ${BACKUP_FILE} is missing or empty!"
    exit 1
fi

BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "✓ Backup successfully created (${BACKUP_SIZE})"

# Clean up older backups beyond retention window
echo "Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -type f -name "db_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
echo "✓ Old backups pruned."

# PING BETTER STACK HEARTBEAT (Only after entire backup workflow completes successfully)
if [ -n "$BETTERSTACK_BACKUP_HEARTBEAT_URL" ]; then
    echo "Sending success heartbeat to Better Stack..."
    HEARTBEAT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "${BETTERSTACK_BACKUP_HEARTBEAT_URL}" || echo "000")
    if [ "$HEARTBEAT_STATUS" -ge 200 ] && [ "$HEARTBEAT_STATUS" -lt 300 ]; then
        echo "✓ Better Stack backup heartbeat pinged successfully (HTTP ${HEARTBEAT_STATUS})."
    else
        echo "WARNING: Better Stack heartbeat ping returned HTTP ${HEARTBEAT_STATUS}."
    fi
else
    echo "INFO: BETTERSTACK_BACKUP_HEARTBEAT_URL not configured. Skipping heartbeat ping."
fi

echo "===================================================="
echo "Backup workflow finished successfully: $(date)"
echo "===================================================="
