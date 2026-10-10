#!/bin/sh
# Восстановление из бэкапа: ./restore.sh /var/backups/betonpoli/db_2026-10-07_0330.dump [uploads_….tar.gz]
# ВНИМАНИЕ: перезаписывает текущую БД (и фото, если передан архив). Сайт на время останавливается.
set -eu
cd "$(dirname "$0")"
PROJECT="${PROJECT:-betonpoli}"
DUMP="$1"
UPLOADS="${2:-}"
[ -f "$DUMP" ] || { echo "нет файла $DUMP"; exit 1; }

docker compose -p "$PROJECT" stop app
docker compose -p "$PROJECT" exec -T db pg_restore -U betonpoli -d betonpoli --clean --if-exists --no-owner < "$DUMP"
if [ -n "$UPLOADS" ]; then
  rm -rf data/uploads.old && mv data/uploads data/uploads.old && mkdir -p data/uploads
  tar -xzf "$UPLOADS" -C data
  chown -R 100:101 data/uploads
fi
docker compose -p "$PROJECT" start app
echo "восстановлено из $DUMP"
