#!/usr/bin/env bash
# Out-of-band DB-write detector.
#
# Reads security_writes_log (populated by the trigger in
# drizzle/0011_security_writes_audit.sql) and reports any rows whose
# application_name is not 'breachlab-platform' — i.e. writes from outside
# the platform process (psql shell, drizzle CLI, ad-hoc job, etc).
#
# Runs on the prod HOST against the db compose container; intentionally
# not inside the web container because the standalone Next.js build
# image doesn't ship scripts/. Pure psql + bash keeps the dep surface
# zero.
#
# Wired up via scripts/systemd/breachlab-audit-alarm.{service,timer}.
# Exits 1 on suspicious rows so systemd flags the unit as failed.

set -euo pipefail

PLATFORM_APP_NAME="${PLATFORM_APP_NAME:-breachlab-platform}"
WINDOW_MIN="${WINDOW_MIN:-60}"
COMPOSE_FILE="${COMPOSE_FILE:-/opt/breachlab-platform/docker-compose.yml}"
DB_SERVICE="${DB_SERVICE:-db}"
DB_USER="${DB_USER:-breachlab}"
DB_NAME="${DB_NAME:-breachlab}"
WEBHOOK="${AUDIT_ALARM_DISCORD_WEBHOOK:-}"

QUERY=$(cat <<SQL
SELECT to_char(created_at, 'YYYY-MM-DD HH24:MI:SS TZ') || E'\t' ||
       op || E'\t' ||
       table_name || E'\t' ||
       coalesce(row_pk, '?') || E'\t' ||
       coalesce(application_name, '(null)') || E'\t' ||
       session_user || E'\t' ||
       coalesce(client_addr::text, 'unix') || E'\t' ||
       coalesce(app_audit_actor, '(null)')
FROM security_writes_log
WHERE created_at > now() - (${WINDOW_MIN}::int * interval '1 minute')
  AND (application_name IS DISTINCT FROM '${PLATFORM_APP_NAME}')
ORDER BY created_at DESC
LIMIT 200;
SQL
)

# -At = unaligned, tuples-only (no header). Each row is a single tab-
# delimited line. -v ON_ERROR_STOP makes psql exit non-zero on SQL error.
output=$(docker-compose -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" \
    psql -U "$DB_USER" -d "$DB_NAME" -At -v ON_ERROR_STOP=1 -c "$QUERY")

if [ -z "$output" ]; then
    echo "[audit-alarm] clean — no out-of-band writes in last ${WINDOW_MIN}m"
    exit 0
fi

count=$(printf '%s\n' "$output" | wc -l | tr -d ' ')
echo "[audit-alarm] FOUND ${count} out-of-band write(s) in last ${WINDOW_MIN}m:"
printf '%s\n' "$output" | while IFS=$'\t' read -r ts op tbl pk app user addr actor; do
    printf '  %s  %-7s  %s#%s  app="%s"  user=%s  addr=%s  actor=%s\n' \
        "$ts" "$op" "$tbl" "$pk" "$app" "$user" "$addr" "$actor"
done

if [ -n "$WEBHOOK" ]; then
    top=$(printf '%s\n' "$output" | head -5 | while IFS=$'\t' read -r ts op tbl pk app user _ _; do
        printf '`%s` **%s** `%s`#`%s` app=`%s` user=`%s`\n' "$ts" "$op" "$tbl" "$pk" "$app" "$user"
    done)
    overflow=""
    if [ "$count" -gt 5 ]; then
        overflow=$'\n_(+'"$((count - 5))"$' more — see security_writes_log)_'
    fi
    msg=":rotating_light: **Out-of-band DB write detected** (${count} in last ${WINDOW_MIN}m) — application_name != \`${PLATFORM_APP_NAME}\`"$'\n'"${top}${overflow}"
    payload=$(printf '%s' "$msg" | python3 -c 'import json,sys; print(json.dumps({"content": sys.stdin.read()}))')
    curl -fsS -X POST -H 'Content-Type: application/json' \
        -d "$payload" "$WEBHOOK" >/dev/null 2>&1 || \
        echo "[audit-alarm] discord post failed"
fi

exit 1
