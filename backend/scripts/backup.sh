#!/bin/bash
# backend/scripts/backup.sh
# Automates PostgreSQL database backup using pg_dump.

# Configuration
DB_NAME="todo_db"
DB_USER="postgres"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_backup_${TIMESTAMP}.sql"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

echo "Starting database backup for $DB_NAME..."

# Run pg_dump (requires PGPASSWORD to be set in environment if password is used)
pg_dump -U "$DB_USER" -d "$DB_NAME" -f "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "✅ Backup successful: $BACKUP_FILE"
  
  # Optional: Compress the backup
  gzip "$BACKUP_FILE"
  echo "✅ Backup compressed: ${BACKUP_FILE}.gz"
  
  # Delete backups older than 7 days
  find "$BACKUP_DIR" -type f -name "*.gz" -mtime +7 -exec rm {} \;
  echo "Cleaned up old backups."
else
  echo "❌ Backup failed!"
  exit 1
fi
