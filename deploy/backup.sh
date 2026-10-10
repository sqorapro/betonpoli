#!/bin/sh
# Ежедневный бэкап БД и фото (ТЗ: не меньше 7 копий).
# cron: 30 3 * * * /opt/betonpoli/deploy/backup.sh >> /var/log/betonpoli-backup.log 2>&1
# Демо: PROJECT=betonpoli-demo DEST=/var/backups/betonpoli-demo ./backup.sh
set -eu
cd "$(dirname "$0")"
PROJECT="${PROJECT:-betonpoli}"
DEST="${DEST:-/var/backups/betonpoli}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP=$(date +%Y-%m-%d_%H%M)
mkdir -p "$DEST"

docker compose -p "$PROJECT" exec -T db pg_dump -U betonpoli -Fc betonpoli > "$DEST/db_$STAMP.dump.tmp"
mv "$DEST/db_$STAMP.dump.tmp" "$DEST/db_$STAMP.dump"
tar -czf "$DEST/uploads_$STAMP.tar.gz" -C data uploads

find "$DEST" -type f \( -name 'db_*.dump' -o -name 'uploads_*.tar.gz' \) -mtime +"$KEEP_DAYS" -delete
echo "$(date -Is) ok: $(ls "$DEST"/db_*.dump | wc -l) db, $(ls "$DEST"/uploads_*.tar.gz | wc -l) uploads"
