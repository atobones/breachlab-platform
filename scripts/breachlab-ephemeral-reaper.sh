#!/bin/bash
# breachlab-ephemeral-reaper.sh — periodic cleanup of orphan player
# ephemeral containers across Specter and Phantom-Deep tracks.
#
# Why this exists:
#   PAM session_close (which fires the per-image self-destruct hook)
#   doesn't run reliably on abnormal SSH disconnects — terminal SIGKILL,
#   network drop, browser pane closure. Orphan containers accumulate
#   and eventually exhaust the /24 oracle-net subnet, at which point
#   new spawns fail with `Connection reset by peer` (caught 2026-05-03,
#   ~250 orphan ephemerals out of 254-IP capacity).
#
# Safety model — explicit allow-list ONLY:
#   - Match exact level slugs with random hex suffix (the orchestrator
#     spawn naming pattern). Anything that doesn't match is untouched.
#   - Persistent containers (breachlab-ghost, breachlab-phantom,
#     specter-mgmt, specter-orchestrator, phantom-deep-mgmt,
#     phantom-deep-orchestrator, *-mgmt, breachlab-platform-*) and
#     fixed-name sidecars (specter-dns, specter-l<N>-<service>) have
#     no random suffix and never match the patterns below.
#   - Containers younger than $AGE_MIN minutes are NEVER removed,
#     regardless of name match. This protects active players mid-level.
#
# What it does NOT do:
#   - Does NOT delete flag files (those live in persistent containers
#     for ghost/phantom; Specter mints flags per-spawn via HMAC, so
#     killing an idle ephemeral does not lose flag state).
#   - Does NOT touch Docker images, build cache, or volumes.
#   - Does NOT prune networks.
#
# Output: appends to $LOG with one line per removal + a summary line.

set -u

AGE_MIN="${AGE_MIN:-180}"            # backstop: nuke any matching container older than this regardless of state
ORPHAN_MIN_AGE="${ORPHAN_MIN_AGE:-2}" # how old an "orphan" must be before we touch it (minutes) — protects fresh spawns mid-auth
DRY_RUN="${DRY_RUN:-0}"              # 1 = log what would be removed, don't do it
LOG="${LOG:-/var/log/breachlab-reaper.log}"

ALLOW_PATTERNS=(
    # Specter I — L0..L7 ephemeral level images
    '^specter-paper-trail-[a-z0-9]{6,12}$'
    '^specter-search-operator-[a-z0-9]{6,12}$'
    '^specter-code-hunter-[a-z0-9]{6,12}$'
    '^specter-js-recon-[a-z0-9]{6,12}$'
    '^specter-people-recon-[a-z0-9]{6,12}$'
    '^specter-sock-puppet-[a-z0-9]{6,12}$'
    '^specter-image-geo-[a-z0-9]{6,12}$'
    '^specter-reverse-image-[a-z0-9]{6,12}$'
    # Phantom-Deep — current ephemeral level images
    '^phantom-l13-[a-z0-9]{6,12}$'
    '^phantom-l14-[a-z0-9]{6,12}$'
    '^phantom-l15-[a-z0-9]{6,12}$'
    '^phantom-l30-[a-z0-9]{6,12}$'
)

is_allowed() {
    local name="$1"
    for pat in "${ALLOW_PATTERNS[@]}"; do
        [[ "$name" =~ $pat ]] && return 0
    done
    return 1
}

now_epoch=$(date +%s)
killed=0
killed_orphan=0
skipped_young=0
skipped_active=0
inspected=0

ts() { date -Iseconds; }

# Batch-fetch (id, name, ISO-8601 StartedAt) for every running container in one
# `docker inspect` call. Parsing `docker ps --format {{.CreatedAt}}` is
# unreliable across Docker versions (the trailing " UTC" trips GNU date),
# so we go through inspect which returns RFC3339 directly.
running_ids=$(docker ps -q)
if [ -z "$running_ids" ]; then
    echo "$(ts) summary inspected=0 killed=0 skipped_young=0 dry_run=$DRY_RUN age_min=$AGE_MIN" >> "$LOG"
    exit 0
fi

while IFS='|' read -r cid name started_at; do
    [ -z "$cid" ] && continue
    inspected=$((inspected + 1))

    # Strip leading slash that docker inspect prepends to .Name.
    name="${name#/}"

    if ! is_allowed "$name"; then
        continue
    fi

    started_epoch=$(date -d "$started_at" +%s 2>/dev/null || echo 0)
    if [ "$started_epoch" -le 0 ]; then
        # Bail out instead of treating an unparseable timestamp as "very old"
        # — that would make the age_min safety check vacuous and we'd nuke
        # every matching container regardless of how fresh it is.
        echo "$(ts) SKIP-UNPARSEABLE-START $name id=${cid:0:12} raw=$started_at" >> "$LOG"
        continue
    fi
    age_min=$(( (now_epoch - started_epoch) / 60 ))

    # Two paths to a kill:
    #
    # Path A — old backstop: anything matching age >= AGE_MIN (default 180m)
    #   gets nuked unconditionally. This is the "your session has run too
    #   long, sorry" rule and assumes nobody legitimately sits in a single
    #   ephemeral for hours.
    #
    # Path B — orphan probe (new 2026-05-03): count sshd processes inside.
    #   sshd=1 means only the listener daemon is alive — no shell child,
    #   so no player is actually attached. PAM session_close was supposed
    #   to kill PID 1 in that case but on unclean disconnects it doesn't
    #   always fire (the bug class that caused 250/253 specter-oracle-net
    #   exhaustion 2026-05-03). Catching sshd=1 lets us reap orphans the
    #   moment they're left behind, without waiting 3h for AGE_MIN.
    #
    # An active session shows sshd>=2 (one listener + one child per real
    #   ssh connection) and we leave it alone regardless of age, until
    #   AGE_MIN finally fires Path A as a hard ceiling.
    #
    # ORPHAN_MIN_AGE (default 2m) avoids killing freshly-spawned containers
    #   that haven't completed PAM auth yet — at spawn time sshd is the
    #   only process and we'd race the player.

    sshd_count=$(docker exec "$cid" sh -c 'pgrep sshd | wc -l' 2>/dev/null || echo "?")

    reason=""
    if [ "$age_min" -ge "$AGE_MIN" ]; then
        reason="age>=${AGE_MIN}m"
    elif [ "$sshd_count" = "1" ] && [ "$age_min" -ge "$ORPHAN_MIN_AGE" ]; then
        reason="orphan(sshd=1) age=${age_min}m"
    fi

    if [ -z "$reason" ]; then
        if [ "$age_min" -lt "$ORPHAN_MIN_AGE" ]; then
            skipped_young=$((skipped_young + 1))
        else
            # sshd>=2 = active player in shell, leave it
            skipped_active=$((skipped_active + 1))
        fi
        continue
    fi

    if [ "$DRY_RUN" = "1" ]; then
        echo "$(ts) WOULD-KILL $name $reason id=${cid:0:12}" >> "$LOG"
    else
        if docker rm -f "$cid" >/dev/null 2>&1; then
            echo "$(ts) KILLED $name $reason id=${cid:0:12}" >> "$LOG"
            killed=$((killed + 1))
            case "$reason" in orphan*) killed_orphan=$((killed_orphan + 1));; esac
        else
            echo "$(ts) FAIL $name $reason id=${cid:0:12}" >> "$LOG"
        fi
    fi
done < <(docker inspect --format='{{.Id}}|{{.Name}}|{{.State.StartedAt}}' $running_ids 2>/dev/null)

echo "$(ts) summary inspected=$inspected killed=$killed killed_orphan=$killed_orphan skipped_young=$skipped_young skipped_active=$skipped_active dry_run=$DRY_RUN age_min=$AGE_MIN orphan_min_age=$ORPHAN_MIN_AGE" >> "$LOG"
