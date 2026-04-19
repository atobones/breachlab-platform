#!/bin/bash
# Daily Postgres backup for the BreachLab platform DB.
#
# - Dumps the running compose `db` container via `docker exec ... pg_dump`
# - Compresses with gzip
# - Writes to BACKUP_DIR with a date-stamped filename
# - Retains the last RETAIN days, deletes older
# - Exits non-zero on any failure (so a wrapping systemd unit / cron job
#   surfaces a real signal instead of silently rotting)
#
# Install on prod (one-time):
#   sudo cp scripts/systemd/breachlab-db-backup.service /etc/systemd/system/
#   sudo cp scripts/systemd/breachlab-db-backup.timer   /etc/systemd/system/
#   sudo systemctl daemon-reload
#   sudo systemctl enable --now breachlab-db-backup.timer
#
# Verify the timer:
#   systemctl list-timers breachlab-db-backup.timer
#
# Restore from a backup:
#   gunzip -c /opt/backups/breachlab-db/breachlab-2026-04-20.sql.gz \
#     | docker exec -i breachlab-platform-db-1 psql -U "$POSTGRES_USER" "$POSTGRES_DB"

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/backups/breachlab-db}"
CONTAINER="${CONTAINER:-breachlab-platform-db-1}"
RETAIN_DAYS="${RETAIN_DAYS:-14}"
ENV_FILE="${ENV_FILE:-/opt/breachlab-platform/.env}"

# shellcheck disable=SC1090
[ -f "$ENV_FILE" ] && set -a && . "$ENV_FILE" && set +a

: "${POSTGRES_USER:?POSTGRES_USER not set (load $ENV_FILE)}"
: "${POSTGRES_DB:?POSTGRES_DB not set (load $ENV_FILE)}"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

DATE="$(date +%Y-%m-%d)"
OUT="$BACKUP_DIR/breachlab-${DATE}.sql.gz"
TMP="$OUT.partial"

# Dump → gzip → atomic rename. The .partial tmpfile guards against half-
# written backups if the host loses power mid-dump.
docker exec "$CONTAINER" pg_dump \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --no-owner --no-privileges --clean --if-exists \
    | gzip -9 > "$TMP"

mv "$TMP" "$OUT"
chmod 600 "$OUT"

# Retention — keep the newest N daily backups, delete the rest.
find "$BACKUP_DIR" -name 'breachlab-*.sql.gz' -type f -mtime "+${RETAIN_DAYS}" -delete

# Sanity log line — picked up by journalctl when run from systemd.
SIZE="$(stat -c%s "$OUT" 2>/dev/null || stat -f%z "$OUT")"
echo "backup ok: $OUT (${SIZE} bytes) | retain ${RETAIN_DAYS}d | $(ls "$BACKUP_DIR" | wc -l) total"
