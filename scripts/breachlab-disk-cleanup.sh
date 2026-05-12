#!/bin/bash
# breachlab-disk-cleanup.sh — periodic safe Docker storage reclaim.
#
# What it does (in order, each step independent):
#   1. Prunes dangling (untagged <none>:<none>) images. These accumulate
#      from rebuilds — the new image gets the :latest tag, the old layer
#      stays as <none>. Never touches tagged images.
#   2. Prunes ALL unused build cache (`-a` flag, 2026-05-09 tweak). Just
#      throw-away layers from `docker build`, not actual image content.
#      Removing tagged-but-unused cache is safe — next build pays cache
#      miss but produces correct images.
#   3. ROTATE-BACKUP-TAGS (2026-05-10): rmi tagged images whose tag
#      matches a known-temporary backup pattern AND are older than
#      ROTATE_AFTER_DAYS. Patterns: `:before-*`, `:rollback-*`,
#      `:bak-*`, `:bk-*`, `:snapshot-*`. These tags are recovery
#      artifacts created by hand before risky changes — useful for ~2
#      weeks, then dead weight. NEVER matches level/track image tags
#      (specter-paper-trail:latest, breachlab-phantom:latest, etc.) —
#      pattern requires a hyphen-suffix following one of the keywords.
#   4. ROTATE-LEGACY-RENAMES (2026-05-10): rmi tags matching
#      `*-build-*:latest` (the docker-compose-generated build name from
#      old service names) when an image with the canonical
#      `*:latest` rename also exists. These are exact duplicate IDs
#      from a rename event — pure waste. Always safe regardless of age.
#
# What it does NOT do (intentional, never automate these):
#   - `docker volume prune` — anonymous volumes COULD hold real data
#     (postgres init artefacts, mounted-at-build state). Always do this
#     manually after eyeballing `docker volume ls --filter dangling=true`
#     and inspecting the mountpoint contents.
#   - `docker container prune` — running containers are skipped by
#     definition, but stopped containers might be intentional (debugging,
#     post-mortem). Manual call only.
#   - `docker network prune` — never. Removing a network mid-deploy
#     races docker-compose's create-recreate cycle on next `up`.
#   - `docker system prune` — too broad. Mixes volumes/networks into
#     the same flag set as images/cache.
#   - Blanket `docker image prune -a` — could delete cached phase
#     images for ephemeral spawns that haven't run recently; next spawn
#     fails until rebuild. Pass 3 is the targeted alternative.
#
# Output: appends /var/log/breachlab-disk-cleanup.log + Telegram alerts
#   on still-over-threshold OR success-with-reclaim. Reuses the
#   invariant-monitor's TG credentials.

set -u

ROOT_FS="${ROOT_FS:-/}"
RUN_THRESHOLD="${RUN_THRESHOLD:-60}"          # only act if disk usage >= this %
ALERT_THRESHOLD="${ALERT_THRESHOLD:-85}"      # alert if usage >= this % post-cleanup
ROTATE_AFTER_DAYS="${ROTATE_AFTER_DAYS:-14}"  # backup-tag rotation age threshold
LOG="${LOG:-/var/log/breachlab-disk-cleanup.log}"
ENV_FILE="${ENV_FILE:-/etc/breachlab-invariants.env}"  # reuses TG token from invariant monitor

ts() { date -Iseconds; }

usage_pct() {
    df --output=pcent "$ROOT_FS" 2>/dev/null | tail -1 | tr -dc '0-9'
}

# Human "1.38GB" / "459MB" → bytes (rough, for summing reclaim totals).
size_to_bytes() {
    local s="${1:-0B}"
    local num="${s%[KMGT]B}"
    local unit="${s#$num}"
    case "$unit" in
        B)  awk -v n="$num" 'BEGIN{printf "%d", n}' ;;
        kB|KB) awk -v n="$num" 'BEGIN{printf "%d", n*1024}' ;;
        MB) awk -v n="$num" 'BEGIN{printf "%d", n*1024*1024}' ;;
        GB) awk -v n="$num" 'BEGIN{printf "%d", n*1024*1024*1024}' ;;
        TB) awk -v n="$num" 'BEGIN{printf "%d", n*1024*1024*1024*1024}' ;;
        *) echo 0 ;;
    esac
}

bytes_to_human() {
    local b="${1:-0}"
    awk -v b="$b" 'BEGIN{
        if (b<1024)             { printf "%dB",      b;             exit }
        if (b<1024*1024)        { printf "%.1fkB",   b/1024;        exit }
        if (b<1024*1024*1024)   { printf "%.1fMB",   b/1048576;     exit }
        printf "%.1fGB", b/1073741824
    }'
}

before=$(usage_pct)
if [ -z "$before" ]; then
    echo "$(ts) ERROR: could not read disk usage for $ROOT_FS" >> "$LOG"
    exit 1
fi

if [ "$before" -lt "$RUN_THRESHOLD" ]; then
    echo "$(ts) skip: usage=${before}% (< RUN_THRESHOLD=${RUN_THRESHOLD}%)" >> "$LOG"
    exit 0
fi

echo "$(ts) start: usage=${before}%" >> "$LOG"

# ── Pass 1+2: dangling + build cache ────────────────────────────────────
img_reclaimed=$(docker image prune -f 2>/dev/null | grep -oE 'reclaimed space:.*' | head -1)
build_reclaimed=$(docker builder prune -a -f 2>/dev/null | grep -oE 'reclaimed space:.*' | head -1)

# ── Pass 3: rotate stale backup tags ────────────────────────────────────
# Patterns are anchored on a hyphen suffix to avoid matching legitimate
# track tags (e.g. `:before-launch` is fine — `:before` alone wouldn't
# match the pattern).
backup_tags_rotated=0
backup_bytes_total=0
now_epoch=$(date +%s)
cutoff_epoch=$(( now_epoch - ROTATE_AFTER_DAYS * 86400 ))

while IFS='|' read -r tag created size; do
    [ -z "$tag" ] && continue
    case "$tag" in
        *:before-*|*:rollback-*|*:bak-*|*:bk-*|*:snapshot-*) ;;
        *) continue ;;
    esac
    # CreatedAt format: "2026-05-07 22:35:06 +0000 UTC". Strip "UTC" suffix
    # so coreutils `date -d` parses cleanly.
    ts_str=${created% UTC}
    ts_epoch=$(date -d "$ts_str" +%s 2>/dev/null) || continue
    [ "$ts_epoch" -ge "$cutoff_epoch" ] && continue
    age_days=$(( (now_epoch - ts_epoch) / 86400 ))
    bytes=$(size_to_bytes "$size")
    if docker rmi "$tag" >/dev/null 2>&1; then
        backup_tags_rotated=$(( backup_tags_rotated + 1 ))
        backup_bytes_total=$(( backup_bytes_total + bytes ))
        echo "$(ts) backup-rotate: rmi $tag (age=${age_days}d size=${size})" >> "$LOG"
    else
        echo "$(ts) backup-rotate: FAILED $tag (in use?)" >> "$LOG"
    fi
done < <(docker images --format '{{.Repository}}:{{.Tag}}|{{.CreatedAt}}|{{.Size}}')

# ── Pass 4: drop legacy *-build-* duplicates ────────────────────────────
# Detects images where:
#   - tag matches `<repo>-build-<service>:latest` (compose-generated
#     name from the docker-compose service that produced the image)
#   - same image ID also has a non-`-build-` tag (the canonical rename)
# Always safe to untag the legacy one — bytes only count once on disk
# but the tag wastes inventory and confuses humans.
legacy_tags_dropped=0
legacy_bytes_total=0

# Build a map: image-id -> comma-separated tags
mapfile -t img_lines < <(docker images --format '{{.ID}}|{{.Repository}}:{{.Tag}}|{{.Size}}' | sort -u)
declare -A id_tags id_size
for line in "${img_lines[@]}"; do
    id="${line%%|*}"
    rest="${line#*|}"
    tag="${rest%%|*}"
    size="${rest##*|}"
    id_tags[$id]="${id_tags[$id]:+${id_tags[$id]},}${tag}"
    id_size[$id]="$size"
done

for id in "${!id_tags[@]}"; do
    tags="${id_tags[$id]}"
    [[ "$tags" != *","* ]] && continue  # only one tag — skip
    legacy=""; canonical=""
    IFS=',' read -ra tag_arr <<< "$tags"
    for t in "${tag_arr[@]}"; do
        if [[ "$t" == *"-build-"*":latest" ]]; then
            legacy="$t"
        else
            canonical="$t"
        fi
    done
    [ -z "$legacy" ] || [ -z "$canonical" ] && continue
    bytes=$(size_to_bytes "${id_size[$id]}")
    if docker rmi "$legacy" >/dev/null 2>&1; then
        legacy_tags_dropped=$(( legacy_tags_dropped + 1 ))
        # Only count bytes once per image-id; in this case the canonical
        # keeps the bytes alive, so reclaim is technically 0 — but inventory
        # gets cleaner. Track count separately, not bytes.
        echo "$(ts) legacy-rename: rmi $legacy (kept canonical=$canonical id=${id:0:12})" >> "$LOG"
    else
        echo "$(ts) legacy-rename: FAILED $legacy" >> "$LOG"
    fi
done

# ── Summary ─────────────────────────────────────────────────────────────
after=$(usage_pct)
backup_human=$(bytes_to_human "$backup_bytes_total")
echo "$(ts) done: usage=${before}% -> ${after}%  images=[${img_reclaimed:-none}] build_cache=[${build_reclaimed:-none}] backup_tags=${backup_tags_rotated}/${backup_human} legacy_renames=${legacy_tags_dropped}" >> "$LOG"

# ── Telegram notifications ──────────────────────────────────────────────
[ -r "$ENV_FILE" ] && . "$ENV_FILE"

send_tg() {
    local msg="$1"
    if [ -z "${ALERT_TG_TOKEN:-}" ] || [ -z "${ALERT_TG_CHAT_ID:-}" ]; then
        echo "$(ts) tg SKIPPED (no creds in $ENV_FILE)" >> "$LOG"
        return 0
    fi
    curl -sS --max-time 5 \
        -X POST \
        -d "chat_id=${ALERT_TG_CHAT_ID}" \
        -d "text=${msg}" \
        -d "parse_mode=Markdown" \
        "https://api.telegram.org/bot${ALERT_TG_TOKEN}/sendMessage" >/dev/null 2>&1 \
        && echo "$(ts) tg sent" >> "$LOG" \
        || echo "$(ts) tg FAILED" >> "$LOG"
}

img_size="${img_reclaimed##* }"
build_size="${build_reclaimed##* }"

extra_lines=""
[ "$backup_tags_rotated" -gt 0 ] && extra_lines="${extra_lines}%0ABackup tags rotated: \`${backup_tags_rotated}\` (\`${backup_human}\`)."
[ "$legacy_tags_dropped" -gt 0 ] && extra_lines="${extra_lines}%0ALegacy renames dropped: \`${legacy_tags_dropped}\`."

if [ "$after" -ge "$ALERT_THRESHOLD" ]; then
    msg="*⚠️ BreachLab disk alert*%0ARoot fs at \`${after}%%\` after auto-cleanup (was \`${before}%%\`).%0AReclaim ran: images=[${img_reclaimed:-none}] cache=[${build_reclaimed:-none}].${extra_lines}%0AInspect: \`docker system df\` + \`du -sh /var/lib/docker/*\`."
    send_tg "$msg"
elif [ "${img_size:-0B}" != "0B" ] || [ "${build_size:-0B}" != "0B" ] || [ "$backup_tags_rotated" -gt 0 ] || [ "$legacy_tags_dropped" -gt 0 ]; then
    msg="*✅ BreachLab disk cleanup*%0ARoot fs: \`${before}%%\` → \`${after}%%\`.%0ABuild cache: \`${build_size:-0B}\`.%0ADangling images: \`${img_size:-0B}\`.${extra_lines}%0ANext check in ≤6h."
    send_tg "$msg"
fi
