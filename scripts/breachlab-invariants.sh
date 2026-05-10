#!/bin/bash
# breachlab-invariants.sh — drift detector for Ghost / Phantom / Specter tracks.
#
# Read-only checker. Compares current prod state of flag files, SUID
# binaries, cron files, daemons, and chattr immutable bits against a
# baked-in baseline snapshot (`/var/lib/breachlab-invariants/baseline-
# <track>.json`). Drift triggers a Telegram DM alert to the operator.
#
# Originated from the post-mortem on three reactive incidents
# (0xd15tr4ckt3d phantom2 flag overwrite, Antropy Jack phantom6 leak,
# self-inflicted SUID delete) — Boss wanted detection BEFORE players
# report it. See Projects/BreachLab Invariant Monitor TODO.md.
#
# Usage:
#   breachlab-invariants.sh init <track>      # capture current state as baseline
#   breachlab-invariants.sh check <track>     # diff current state vs baseline
#   breachlab-invariants.sh check-all         # check every configured track
#
# Tracks: phantom, ghost, specter
#
# Configuration via env (or /etc/breachlab-invariants.env if present):
#   ALERT_TG_TOKEN     Telegram bot token (DM-capable)
#   ALERT_TG_CHAT_ID   Boss's chat ID (numeric)
#   ALERT_DISCORD_URL  fallback Discord webhook URL (private channel)
#   STATE_DIR          baseline + log dir (default /var/lib/breachlab-invariants)
#   LOG_FILE           detailed log (default /var/log/breachlab-invariants.log)
#   DRY_RUN            "1" suppresses alerts, just logs
#
# Safety: this script never modifies live state. It only reads.
# Worst case = noisy log. Cannot break flags, daemons, or networks.

set -u

CMD="${1:-help}"
TRACK="${2:-}"

STATE_DIR="${STATE_DIR:-/var/lib/breachlab-invariants}"
LOG_FILE="${LOG_FILE:-/var/log/breachlab-invariants.log}"
DRY_RUN="${DRY_RUN:-0}"

# Source operator-supplied alert credentials if file exists. Keep them
# out of the script body so the script can ship in git without secrets.
if [ -r /etc/breachlab-invariants.env ]; then
    set -a
    # shellcheck disable=SC1091
    . /etc/breachlab-invariants.env
    set +a
fi

mkdir -p "$STATE_DIR"
touch "$LOG_FILE"

ts() { date -Iseconds; }
log() { printf '%s %s\n' "$(ts)" "$*" >> "$LOG_FILE"; }

# ---------------------------------------------------------------------------
# Alert sink: Telegram DM primary, Discord fallback. Either alert path is
# best-effort — failure to deliver is logged but does not fail the check
# (we'd rather have a noisy log than the checker silently dying).
# ---------------------------------------------------------------------------
alert() {
    local subject="$1"
    local body="$2"
    local msg
    msg=$(printf '*%s*\n%s' "$subject" "$body")

    if [ "$DRY_RUN" = "1" ]; then
        log "DRY-RUN-ALERT subject=$subject"
        log "DRY-RUN-ALERT-BODY $body"
        return 0
    fi

    local sent=0
    if [ -n "${ALERT_TG_TOKEN:-}" ] && [ -n "${ALERT_TG_CHAT_ID:-}" ]; then
        if curl -sS -m 10 \
            --data-urlencode "chat_id=${ALERT_TG_CHAT_ID}" \
            --data-urlencode "text=${msg}" \
            --data-urlencode "parse_mode=Markdown" \
            "https://api.telegram.org/bot${ALERT_TG_TOKEN}/sendMessage" \
            >/dev/null 2>&1; then
            log "ALERT-TG-SENT subject=$subject"
            sent=1
        else
            log "ALERT-TG-FAIL subject=$subject"
        fi
    fi
    if [ "$sent" = "0" ] && [ -n "${ALERT_DISCORD_URL:-}" ]; then
        local payload
        payload=$(printf '{"content": "**%s**\\n%s"}' \
            "$(printf '%s' "$subject" | sed 's/"/\\"/g')" \
            "$(printf '%s' "$body" | sed 's/"/\\"/g; s/$/\\n/' | tr -d '\n')")
        if curl -sS -m 10 -H 'Content-Type: application/json' \
            -d "$payload" "$ALERT_DISCORD_URL" >/dev/null 2>&1; then
            log "ALERT-DISCORD-SENT subject=$subject"
            sent=1
        else
            log "ALERT-DISCORD-FAIL subject=$subject"
        fi
    fi
    if [ "$sent" = "0" ]; then
        log "ALERT-NO-SINK-CONFIGURED subject=$subject"
    fi
}

# ---------------------------------------------------------------------------
# Per-file fingerprint — md5 + mode + owner + chattr immutable bit. We
# capture the four because they cover the four classes of drift we've
# actually been bitten by:
#   - md5 catches content overwrite (vim :wq)
#   - mode catches chmod attacks
#   - owner catches chown attacks
#   - immutable bit catches the protection itself being lifted
# Output: tab-separated, one line.
# ---------------------------------------------------------------------------
fingerprint_in_container() {
    local container="$1"
    local path="$2"
    docker exec "$container" sh -c "
        if [ ! -e '$path' ]; then
            printf 'MISSING\tMISSING\tMISSING\tMISSING\n'
            exit 0
        fi
        md=\$(md5sum '$path' 2>/dev/null | awk '{print \$1}')
        mode=\$(stat -c '%a' '$path' 2>/dev/null)
        owner=\$(stat -c '%U:%G' '$path' 2>/dev/null)
        # `lsattr -d` (no -d) produces 'lsattr: Inappropriate ioctl' on
        # tmpfs/proc/etc; mask to '?' so we don't false-alarm. Real
        # ext4/overlay files give a clean 16-char attr string.
        attr=\$(lsattr -d '$path' 2>/dev/null | awk '{print \$1}')
        [ -z \"\$attr\" ] && attr='unknown'
        printf '%s\t%s\t%s\t%s\n' \"\$md\" \"\$mode\" \"\$owner\" \"\$attr\"
    " 2>/dev/null
}

# ---------------------------------------------------------------------------
# Phantom track invariants. The most incident-prone container — own its
# own canonical state map.
# ---------------------------------------------------------------------------
PHANTOM_CONTAINER="breachlab-phantom"

PHANTOM_FLAG_FILES=(
    "/home/flagkeeper1/level1_flag"
    "/var/lib/phantom-flags/level2_flag"
    "/var/lib/phantom-flags/level3_flag"
    "/var/lib/phantom-flags/level4_flag"
    "/var/lib/phantom-flags/level5_flag"
    "/var/lib/phantom-flags/level6_flag"
    "/var/lib/phantom-flags/level7_flag"
    "/var/lib/phantom-flags/level8_flag"
    "/var/lib/phantom-flags/level9_flag"
)

PHANTOM_SUID_BINARIES=(
    "/usr/local/bin/phantom-python3"
    "/usr/local/bin/kern-tool"
    "/usr/local/bin/phantom-find"
    "/usr/local/bin/system-checker"
    "/usr/local/bin/phantom-wipe-l12-wrapper"
    "/usr/local/bin/phantom-wipe-history-wrapper"
    "/usr/local/bin/phantom-verify"
    "/usr/local/bin/leaky-vessels"
    "/opt/maintenance/cleanup.sh"
)

PHANTOM_CRON_FILES=(
    "/etc/cron.d/phantom-flag-leak-sweep"
    "/etc/cron.d/system-maintenance"
)

# Hardened files: chattr +i protects bash, sudoers, shadow, etc against
# even root-from-inside-container modification. If a player or operator
# (re-)applies a chmod or `chattr -i`, the +i bit drops and the
# fingerprint changes. Catches the protection itself being lifted.
# Added 2026-05-10 to expand Phantom mono coverage from 9-flag-only to
# baseline-hardening-also.
PHANTOM_HARDENED_FILES=(
    "/etc/sudoers"
    "/etc/shadow"
    "/etc/passwd"
    "/etc/ssh/sshd_config"
    "/usr/bin/bash"
    "/etc/cron.d"
)

# All player accounts on Phantom mono. phantom9 intentionally omitted
# (removed from mono 2026-05-06 — L9 lives on phantom-deep ephemeral
# port 2228 only). phantom13/14/15/30 have shell=/usr/local/bin/
# phantom-deep-redirect (they punt to ephemeral); the rest /bin/bash.
# phantom31 is the graduation account. Drift = passwd line changed
# (deletion, UID/GID flip, shell swap, home rewrite) — any of which is
# either an attack or a botched deploy.
PHANTOM_USERS=(
    phantom0  phantom1  phantom2  phantom3  phantom4
    phantom5  phantom6  phantom7  phantom8
                                            phantom10
    phantom11 phantom12 phantom13 phantom14 phantom15
    phantom16 phantom17 phantom18 phantom19 phantom20
    phantom21 phantom22 phantom23 phantom24 phantom25
    phantom26 phantom27 phantom28 phantom29 phantom30
    phantom31
)

# Whitelist of paths flagkeeperN files are *expected* to live at. Anything
# outside this list = leak. The `*` is a sentinel meaning "anywhere under".
PHANTOM_LEAK_WHITELIST=(
    "/var/lib/phantom-flags/*"
    "/home/flagkeeper*/*"
    "/opt/maintenance/*"
    "/usr/local/bin/*"
    "/usr/local/share/phantom-files/*"
    "/proc/*"  # /proc lookups by uid hit ~/proc/PID — never a real leak
    "/sys/*"
)

# ---------------------------------------------------------------------------
# Ghost track invariants. Mono-container, OverTheWire-style; flags + ssh
# password files per ghostN home + level service daemons on 30000-41337.
# ---------------------------------------------------------------------------
GHOST_CONTAINER="breachlab-ghost"

GHOST_MISSION_FILES=(
    "/home/ghost13/flag"
    "/home/ghost16/passwords.new"
    "/home/ghost16/passwords.old"
    "/home/ghost17/flag"
    "/home/ghost19/flag"
)

GHOST_SERVICE_PORTS=(30000 30001 30002 30100 30101 31339 31790 41337)

# All player accounts on Ghost mono (L0-L22 = 23 accounts). Drift =
# passwd entry tampered. Added 2026-05-10 alongside Phantom user check
# so every player-facing account on every mono is fingerprinted.
GHOST_USERS=(
    ghost0  ghost1  ghost2  ghost3  ghost4  ghost5  ghost6
    ghost7  ghost8  ghost9  ghost10 ghost11 ghost12 ghost13
    ghost14 ghost15 ghost16 ghost17 ghost18 ghost19 ghost20
    ghost21 ghost22
)

# ---------------------------------------------------------------------------
# Phantom-Deep track invariants. Ephemeral architecture (deep-roots,
# shadow, clean, clean-exit, stack-day) — orchestrator on 2224-2228 +
# shared phantom-mgmt at 10.13.37.30. Mgmt is multi-tenant for phantom
# lite and phantom-deep both, so we just probe its liveness; per-flag
# fingerprinting lives under the phantom track and won't double-count.
# ---------------------------------------------------------------------------
PHANTOM_DEEP_ORCH_PORTS=(2224 2225 2226 2227 2228)
PHANTOM_DEEP_NET="breachlab-phantom_phantom-net"
PHANTOM_DEEP_MGMT_IP="10.13.37.30"

# phantom-deep ephemeral architecture uses a single shared image with
# the level distinguished by a baked /etc/phantom-deep/level marker
# (per orchestrator/spawn.sh: IMAGE=${PHANTOM_DEEP_IMAGE:-phantom-deep:latest}).
# Plus the orchestrator container's own image. Fingerprint both — drift
# = either was rebuilt (legit deploy → re-init baseline) or deleted
# (catastrophic; spawn.sh would fail until rebuild). Added 2026-05-10.
PHANTOM_DEEP_IMAGES=(
    "phantom-deep:latest"                # ephemeral level image (shared)
    "phantom-deep-orchestrator:latest"   # the listener
)

# ---------------------------------------------------------------------------
# Specter track invariants. Ephemerals are stateless by design, so the
# only persistent things to monitor are the orchestrator's socat
# listeners and the mgmt oracle's liveness.
# ---------------------------------------------------------------------------
SPECTER_ORCH_PORTS=(2230 2231 2232 2233 2234 2235 2236 2237)

# Per-level Specter ephemeral images. Fingerprinted by image ID via
# `docker image inspect`; image IDs change only on rebuild so this is
# stable across container restarts. Added 2026-05-10 to close the
# "level image silently goes missing" gap (previously only caught at
# player-spawn time). Pre-launch L11/L12/L13 (telegram-intel,
# adversarial-osint, berkeley-protocol) intentionally omitted — those
# images don't exist yet; add when Specter II ships.
SPECTER_LEVEL_IMAGES=(
    "specter-paper-trail:latest"        # L0
    "specter-search-operator:latest"    # L1
    "specter-code-hunter:latest"        # L2
    "specter-js-recon:latest"           # L3
    "specter-people-recon:latest"       # L4
    "specter-sock-puppet:latest"        # L5
    "specter-image-geo:latest"          # L6
    "specter-reverse-image:latest"      # L7
    "specter-travel-pattern:latest"     # L8
    "specter-corporate-intel:latest"    # L9
    "specter-leak-broker:phase8"        # L10
)

# ---------------------------------------------------------------------------
# Snapshot collection
# ---------------------------------------------------------------------------
collect_phantom() {
    local out="$1"
    : > "$out"
    {
        printf 'TRACK\tphantom\n'
        printf 'TIMESTAMP\t%s\n' "$(ts)"
        for p in "${PHANTOM_FLAG_FILES[@]}"; do
            fp=$(fingerprint_in_container "$PHANTOM_CONTAINER" "$p")
            printf 'FLAG\t%s\t%s\n' "$p" "$fp"
        done
        for p in "${PHANTOM_SUID_BINARIES[@]}"; do
            fp=$(fingerprint_in_container "$PHANTOM_CONTAINER" "$p")
            printf 'SUID\t%s\t%s\n' "$p" "$fp"
        done
        for p in "${PHANTOM_CRON_FILES[@]}"; do
            fp=$(fingerprint_in_container "$PHANTOM_CONTAINER" "$p")
            printf 'CRON\t%s\t%s\n' "$p" "$fp"
        done
        # Hardened files (chattr +i invariants). Same fingerprinter as
        # FLAG/SUID — md5 + mode + owner + immutable bit. The +i bit
        # is the load-bearing one here; if it drops, attacker (or
        # operator drift) can rewrite the file next.
        for p in "${PHANTOM_HARDENED_FILES[@]}"; do
            fp=$(fingerprint_in_container "$PHANTOM_CONTAINER" "$p")
            printf 'HARDENED\t%s\t%s\n' "$p" "$fp"
        done
        # Player account inventory — `getent passwd <user>` per user.
        # Drift = entry deleted, UID/GID changed, shell flipped, home
        # rewrite. Stored as the full passwd line minus the bcrypt
        # hash (which is in /shadow, not /passwd). Missing user yields
        # MISSING via the literal `getent` exit code.
        for u in "${PHANTOM_USERS[@]}"; do
            local entry
            entry=$(docker exec "$PHANTOM_CONTAINER" getent passwd "$u" 2>/dev/null)
            [ -z "$entry" ] && entry="MISSING"
            printf 'USER\t%s\t%s\n' "$u" "$entry"
        done
        # Daemon liveness — sshd and any phantom-specific watchdog'd
        # services. Just check sshd PID 1 is alive (entrypoint guarantees
        # it); deeper watchdog checks land in Phase 1.5.
        if docker exec "$PHANTOM_CONTAINER" pgrep -f "sshd: /usr/sbin/sshd" >/dev/null 2>&1 \
            || docker exec "$PHANTOM_CONTAINER" pgrep sshd >/dev/null 2>&1; then
            printf 'DAEMON\tsshd\tALIVE\n'
        else
            printf 'DAEMON\tsshd\tDEAD\n'
        fi
        # Leak invariant — count flagkeeper files outside whitelist.
        # NOTE: `-xdev` is INTENTIONALLY OMITTED — tmpfs mounts like /dev/shm
        # and /run are separate filesystems, and that's exactly where leaks
        # surface (see Antropy Jack /dev/shm/f6.txt 2026-05-02). Instead we
        # prune the kernel virtual fs and per-user runtime dirs explicitly.
        local prune_args="-path /proc -prune -o -path /sys -prune -o -path '/run/user/*' -prune -o"
        for w in "${PHANTOM_LEAK_WHITELIST[@]}"; do
            prune_args="$prune_args -path '$w' -prune -o"
        done
        local leak_count
        leak_count=$(docker exec "$PHANTOM_CONTAINER" sh -c "
            total=0
            for n in 1 2 3 4 5 6 7 8 9; do
                c=\$(find / $prune_args -user flagkeeper\${n} -type f -print 2>/dev/null | wc -l)
                total=\$(( total + c ))
            done
            printf '%d' \$total
        " 2>/dev/null || printf '?')
        printf 'LEAK\tcount\t%s\n' "$leak_count"
    } >> "$out"
}

collect_ghost() {
    local out="$1"
    : > "$out"
    {
        printf 'TRACK\tghost\n'
        printf 'TIMESTAMP\t%s\n' "$(ts)"
        for p in "${GHOST_MISSION_FILES[@]}"; do
            fp=$(fingerprint_in_container "$GHOST_CONTAINER" "$p")
            printf 'MISSION\t%s\t%s\n' "$p" "$fp"
        done
        if docker exec "$GHOST_CONTAINER" pgrep sshd >/dev/null 2>&1; then
            printf 'DAEMON\tsshd\tALIVE\n'
        else
            printf 'DAEMON\tsshd\tDEAD\n'
        fi
        for port in "${GHOST_SERVICE_PORTS[@]}"; do
            if docker exec "$GHOST_CONTAINER" ss -tln 2>/dev/null | awk '{print $4}' | grep -q ":${port}\$"; then
                printf 'PORT\t%d\tLISTEN\n' "$port"
            else
                printf 'PORT\t%d\tDOWN\n' "$port"
            fi
        done
        # Player account inventory (added 2026-05-10).
        for u in "${GHOST_USERS[@]}"; do
            local entry
            entry=$(docker exec "$GHOST_CONTAINER" getent passwd "$u" 2>/dev/null)
            [ -z "$entry" ] && entry="MISSING"
            printf 'USER\t%s\t%s\n' "$u" "$entry"
        done
    } >> "$out"
}

collect_phantom_deep() {
    local out="$1"
    : > "$out"
    {
        printf 'TRACK\tphantom-deep\n'
        printf 'TIMESTAMP\t%s\n' "$(ts)"
        for port in "${PHANTOM_DEEP_ORCH_PORTS[@]}"; do
            if ss -tln 2>/dev/null | awk '{print $4}' | grep -q ":${port}\$"; then
                printf 'PORT\t%d\tLISTEN\n' "$port"
            else
                printf 'PORT\t%d\tDOWN\n' "$port"
            fi
        done
        # Container liveness — orchestrator must be running for any new
        # spawn to succeed; phantom-mgmt is the shared oracle.
        if docker ps --format '{{.Names}}' | grep -q '^phantom-deep-orchestrator$'; then
            printf 'CONTAINER\tphantom-deep-orchestrator\tALIVE\n'
        else
            printf 'CONTAINER\tphantom-deep-orchestrator\tDEAD\n'
        fi
        if docker ps --format '{{.Names}}' | grep -q '^phantom-mgmt$'; then
            printf 'CONTAINER\tphantom-mgmt\tALIVE\n'
        else
            printf 'CONTAINER\tphantom-mgmt\tDEAD\n'
        fi
        # phantom-net IP utilisation — same shape as specter's
        # oracle-net check; threshold tuned in absolute_checks.
        local attached
        attached=$(docker network inspect "$PHANTOM_DEEP_NET" \
            --format '{{len .Containers}}' 2>/dev/null || echo '?')
        printf 'NET\tphantom-net-attached\t%s\n' "$attached"
        # Per-image fingerprints (added 2026-05-10).
        for img in "${PHANTOM_DEEP_IMAGES[@]}"; do
            local img_id
            img_id=$(docker image inspect "$img" --format '{{.Id}}' 2>/dev/null)
            [ -z "$img_id" ] && img_id="MISSING"
            printf 'IMAGE\t%s\t%s\n' "$img" "$img_id"
        done
    } >> "$out"
}

collect_specter() {
    local out="$1"
    : > "$out"
    {
        printf 'TRACK\tspecter\n'
        printf 'TIMESTAMP\t%s\n' "$(ts)"
        # Specter ephemerals are stateless by design — the only thing to
        # monitor is whether the orchestrator socat listeners are up and
        # specter-mgmt's /health responds.
        for port in "${SPECTER_ORCH_PORTS[@]}"; do
            if ss -tln 2>/dev/null | awk '{print $4}' | grep -q ":${port}\$"; then
                printf 'PORT\t%d\tLISTEN\n' "$port"
            else
                printf 'PORT\t%d\tDOWN\n' "$port"
            fi
        done
        # /health probe via the oracle network — drop into a curl image so
        # we don't depend on curl being installed on the host.
        local mgmt_ok
        mgmt_ok=$(docker run --rm --network breachlab-specter_specter-oracle-net \
            curlimages/curl:latest -sS -m 5 -o /dev/null -w '%{http_code}' \
            http://10.13.69.250:8765/health 2>/dev/null || echo '000')
        printf 'MGMT\thealth\t%s\n' "$mgmt_ok"
        # oracle-net IP utilisation — alert if attached count > 220 (so we
        # see the slope before subnet exhaustion bites again).
        local attached
        attached=$(docker network inspect breachlab-specter_specter-oracle-net \
            --format '{{len .Containers}}' 2>/dev/null || echo '?')
        printf 'NET\toracle-attached\t%s\n' "$attached"
        # Per-level image fingerprints. `docker image inspect --format
        # {{.Id}}` returns the canonical sha256:<64hex>; absence yields
        # MISSING (drift). Image rebuild produces a new ID — that's a
        # legit deploy event and the operator must run `init specter`
        # to re-baseline. Same discipline as flag/SUID changes.
        for img in "${SPECTER_LEVEL_IMAGES[@]}"; do
            local img_id
            img_id=$(docker image inspect "$img" --format '{{.Id}}' 2>/dev/null)
            [ -z "$img_id" ] && img_id="MISSING"
            printf 'IMAGE\t%s\t%s\n' "$img" "$img_id"
        done
    } >> "$out"
}

snapshot_for() {
    local track="$1"
    local out="$2"
    case "$track" in
        phantom)      collect_phantom      "$out" ;;
        phantom-deep) collect_phantom_deep "$out" ;;
        ghost)        collect_ghost        "$out" ;;
        specter)      collect_specter      "$out" ;;
        *) log "snapshot_for unknown track: $track"; return 1 ;;
    esac
}

# ---------------------------------------------------------------------------
# Diff vs baseline. Lines that differ trigger a single grouped alert.
# Special line types (LEAK, NET, MGMT) get threshold-based logic so we
# don't alert on every tiny attached-count tick.
# ---------------------------------------------------------------------------
diff_against_baseline() {
    local track="$1"
    local current="$2"
    local baseline="${STATE_DIR}/baseline-${track}.json"

    if [ ! -r "$baseline" ]; then
        log "diff: no baseline for $track at $baseline"
        printf 'NO-BASELINE\n'
        return 0
    fi

    # Compare line by line. We exclude lines that are inherently
    # variable but already covered by absolute_checks via threshold:
    #   TIMESTAMP                — always changes
    #   NET\toracle-attached     — fluctuates with player traffic
    #   NET\tphantom-net-attached — same
    #   LEAK\tcount              — covered by absolute_checks (must be 0)
    # The diff path is for catching qualitative drift (md5 changes,
    # mode/owner changes, ports going DOWN, daemons dying).
    # Use $'...' quoting so \t expands to a literal tab — grep -E
    # doesn't interpret \t inside single-quoted patterns.
    local exclude=$'^(TIMESTAMP|NET\toracle-attached|NET\tphantom-net-attached|LEAK\tcount)'
    local diffs
    diffs=$(diff <(grep -vE "$exclude" "$baseline") <(grep -vE "$exclude" "$current") \
        | grep -E '^[<>]' | head -40)
    if [ -z "$diffs" ]; then
        printf 'CLEAN\n'
        return 0
    fi
    printf '%s\n' "$diffs"
}

# ---------------------------------------------------------------------------
# Per-track threshold checks that aren't really "drift" but rather
# "absolute health": e.g. mgmt /health == 200, leak count == 0,
# oracle-net attached < 220.
# ---------------------------------------------------------------------------
absolute_checks() {
    local track="$1"
    local current="$2"
    local violations=""

    case "$track" in
        phantom)
            local leak
            leak=$(awk -F'\t' '/^LEAK\tcount/ {print $3}' "$current")
            if [ -n "$leak" ] && [ "$leak" != "0" ]; then
                violations="${violations}phantom: ${leak} flagkeeper file(s) outside whitelist (leak)\n"
            fi
            local sshd
            sshd=$(awk -F'\t' '/^DAEMON\tsshd/ {print $3}' "$current")
            if [ "$sshd" = "DEAD" ]; then
                violations="${violations}phantom: sshd not running\n"
            fi
            ;;
        ghost)
            local sshd
            sshd=$(awk -F'\t' '/^DAEMON\tsshd/ {print $3}' "$current")
            if [ "$sshd" = "DEAD" ]; then
                violations="${violations}ghost: sshd not running\n"
            fi
            local down_ports
            down_ports=$(awk -F'\t' '/^PORT/ && $3=="DOWN" {print $2}' "$current" | paste -sd,)
            if [ -n "$down_ports" ]; then
                violations="${violations}ghost: level service ports down: ${down_ports}\n"
            fi
            ;;
        phantom-deep)
            local orch
            orch=$(awk -F'\t' '/^CONTAINER\tphantom-deep-orchestrator/ {print $3}' "$current")
            if [ "$orch" = "DEAD" ]; then
                violations="${violations}phantom-deep: orchestrator container not running\n"
            fi
            local mgmt_alive
            mgmt_alive=$(awk -F'\t' '/^CONTAINER\tphantom-mgmt/ {print $3}' "$current")
            if [ "$mgmt_alive" = "DEAD" ]; then
                violations="${violations}phantom-deep: phantom-mgmt container not running\n"
            fi
            local down_ports
            down_ports=$(awk -F'\t' '/^PORT/ && $3=="DOWN" {print $2}' "$current" | paste -sd,)
            if [ -n "$down_ports" ]; then
                violations="${violations}phantom-deep: orchestrator ports down: ${down_ports}\n"
            fi
            local pdattached
            pdattached=$(awk -F'\t' '/^NET\tphantom-net-attached/ {print $3}' "$current")
            # phantom-net is shared (phantom-lite + phantom-deep + mgmt + db
            # + web + active ephemerals). Threshold tuned higher than
            # specter's because baseline utilisation here is naturally
            # smaller (no specter-style ephemeral sprawl).
            if [ -n "$pdattached" ] && [ "$pdattached" != "?" ] && [ "$pdattached" -gt 200 ]; then
                violations="${violations}phantom-deep: phantom-net at ${pdattached}/254 — watch for subnet exhaustion\n"
            fi
            ;;
        specter)
            local mgmt
            mgmt=$(awk -F'\t' '/^MGMT\thealth/ {print $3}' "$current")
            if [ "$mgmt" != "200" ]; then
                violations="${violations}specter: mgmt /health returned ${mgmt} (expected 200)\n"
            fi
            local attached
            attached=$(awk -F'\t' '/^NET\toracle-attached/ {print $3}' "$current")
            if [ -n "$attached" ] && [ "$attached" != "?" ] && [ "$attached" -gt 220 ]; then
                violations="${violations}specter: oracle-net at ${attached}/254 — approaching subnet exhaustion\n"
            fi
            local down_ports
            down_ports=$(awk -F'\t' '/^PORT/ && $3=="DOWN" {print $2}' "$current" | paste -sd,)
            if [ -n "$down_ports" ]; then
                violations="${violations}specter: orchestrator ports down: ${down_ports}\n"
            fi
            ;;
    esac
    printf '%b' "$violations"
}

# ---------------------------------------------------------------------------
# Top-level commands
# ---------------------------------------------------------------------------
cmd_init() {
    local track="$1"
    [ -z "$track" ] && { echo "usage: $0 init <track>" >&2; exit 2; }
    local out="${STATE_DIR}/baseline-${track}.json"
    log "init: capturing baseline for $track → $out"
    snapshot_for "$track" "$out"
    log "init: baseline written ($(wc -l < "$out") lines)"
    printf 'baseline written: %s\n' "$out"
}

cmd_check() {
    local track="$1"
    [ -z "$track" ] && { echo "usage: $0 check <track>" >&2; exit 2; }
    local current="${STATE_DIR}/current-${track}.json"
    log "check: collecting current state for $track"
    snapshot_for "$track" "$current"

    local diffs
    diffs=$(diff_against_baseline "$track" "$current")
    local absolute
    absolute=$(absolute_checks "$track" "$current")

    if [ "$diffs" = "CLEAN" ] && [ -z "$absolute" ]; then
        log "check $track: CLEAN"
        return 0
    fi
    if [ "$diffs" = "NO-BASELINE" ]; then
        log "check $track: SKIP (no baseline yet — run 'init $track' first)"
        return 0
    fi

    local body=""
    if [ -n "$absolute" ]; then
        body="${body}Absolute violations:\n${absolute}\n"
    fi
    if [ "$diffs" != "CLEAN" ]; then
        body="${body}Drift vs baseline:\n${diffs}\n"
    fi

    log "check $track: VIOLATIONS"
    log "check $track payload:\n${body}"
    alert "BreachLab invariant alert: ${track}" "$(printf '%b' "$body" | head -c 3500)"
}

cmd_check_host() {
    # Host-level checks: disk fill, journal size. Anything that's not
    # per-track but still wants a Telegram alert.
    local violations=""
    local pct
    pct=$(df --output=pcent / 2>/dev/null | tail -1 | tr -dc '0-9')
    if [ -n "$pct" ] && [ "$pct" -ge "${HOST_DISK_ALERT_PCT:-85}" ]; then
        local avail
        avail=$(df -h --output=avail / 2>/dev/null | tail -1 | tr -d ' ')
        violations="${violations}host: root fs at ${pct}% (avail=${avail}) — disk-cleanup runs every 6h but not keeping up; investigate /var/lib/docker\n"
    fi
    if [ -n "$violations" ]; then
        log "check host: VIOLATIONS"
        log "check host payload:\nAbsolute violations:\n${violations}"
        alert "BreachLab invariant alert: host" "Absolute violations:\n${violations}"
    else
        log "check host: CLEAN"
    fi
}

cmd_check_all() {
    local rc=0
    for t in phantom phantom-deep ghost specter; do
        cmd_check "$t" || rc=$?
    done
    cmd_check_host || rc=$?
    return "$rc"
}

# ---------------------------------------------------------------------------
# Daily summary — single consolidated TG message reporting watchdog state
# across all tracks. Unlike `check-all` which alerts ONLY on violations,
# `summary` always sends a message (✅ status when green, ❌ when red),
# answering Boss's "I want to see daily that everything is OK" ask.
#
# Internal-only: walks per-track snapshot + diff + absolute_checks but
# does NOT call alert() for individual track issues. Builds one
# consolidated payload, sends one TG message.
#
# Designed to run from a daily systemd timer; manual invocation also fine.
# ---------------------------------------------------------------------------
cmd_summary() {
    local report=""
    local overall_ok=1

    for t in phantom phantom-deep ghost specter; do
        local current="${STATE_DIR}/current-${t}.json"
        snapshot_for "$t" "$current"
        local diffs absolute
        diffs=$(diff_against_baseline "$t" "$current")
        absolute=$(absolute_checks "$t" "$current")

        if [ "$diffs" = "NO-BASELINE" ]; then
            report="${report}⚪ \`${t}\`: no baseline (run init)%0A"
            continue
        fi

        # Per-track stats line — count what's tracked so the summary
        # actually proves coverage rather than just saying "OK".
        local stats
        case "$t" in
            phantom)
                local n_flag=$(grep -c $'^FLAG\t' "$current" || echo 0)
                local n_suid=$(grep -c $'^SUID\t' "$current" || echo 0)
                local n_cron=$(grep -c $'^CRON\t' "$current" || echo 0)
                local n_hard=$(grep -c $'^HARDENED\t' "$current" || echo 0)
                local n_user=$(grep -c $'^USER\t' "$current" || echo 0)
                local n_user_missing=$(awk -F'\t' '/^USER/ && $3=="MISSING"' "$current" | wc -l)
                local leak=$(awk -F'\t' '/^LEAK\tcount/ {print $3}' "$current")
                stats="${n_flag} flags, ${n_suid} SUIDs, ${n_cron} cron, ${n_hard} hardened, ${n_user} users ($((n_user - n_user_missing)) present), leak=${leak:-?}"
                ;;
            ghost)
                local n_mission=$(grep -c $'^MISSION\t' "$current" || echo 0)
                local n_ports_up=$(awk -F'\t' '/^PORT/ && $3=="LISTEN"' "$current" | wc -l)
                local n_user=$(grep -c $'^USER\t' "$current" || echo 0)
                local n_user_missing=$(awk -F'\t' '/^USER/ && $3=="MISSING"' "$current" | wc -l)
                stats="${n_mission} mission files, ${n_ports_up} ports listening, ${n_user} users ($((n_user - n_user_missing)) present)"
                ;;
            phantom-deep)
                local n_ports_up=$(awk -F'\t' '/^PORT/ && $3=="LISTEN"' "$current" | wc -l)
                local pd_alive=$(awk -F'\t' '/^CONTAINER\tphantom-deep-orchestrator/ {print $3}' "$current")
                local n_img=$(grep -c $'^IMAGE\t' "$current" || echo 0)
                local n_img_missing=$(awk -F'\t' '/^IMAGE/ && $3=="MISSING"' "$current" | wc -l)
                stats="${n_ports_up} orch ports, orchestrator=${pd_alive}, ${n_img} images ($((n_img - n_img_missing)) intact)"
                ;;
            specter)
                local n_ports_up=$(awk -F'\t' '/^PORT/ && $3=="LISTEN"' "$current" | wc -l)
                local mgmt=$(awk -F'\t' '/^MGMT\thealth/ {print $3}' "$current")
                local n_img=$(grep -c $'^IMAGE\t' "$current" || echo 0)
                local n_img_missing=$(awk -F'\t' '/^IMAGE/ && $3=="MISSING"' "$current" | wc -l)
                stats="${n_ports_up} ports, mgmt=${mgmt}, ${n_img} images ($((n_img - n_img_missing)) intact)"
                ;;
        esac

        if [ "$diffs" = "CLEAN" ] && [ -z "$absolute" ]; then
            report="${report}✅ \`${t}\`: ${stats}%0A"
        else
            overall_ok=0
            local issue_summary=""
            if [ -n "$absolute" ]; then
                # Take first violation line, truncate
                local first_abs
                first_abs=$(printf '%b' "$absolute" | head -1 | head -c 120)
                issue_summary="${first_abs}"
            fi
            if [ "$diffs" != "CLEAN" ]; then
                local n_drift
                n_drift=$(printf '%s\n' "$diffs" | grep -cE '^[<>]')
                [ -n "$issue_summary" ] && issue_summary="${issue_summary}; "
                issue_summary="${issue_summary}drift on ${n_drift} line(s)"
            fi
            report="${report}❌ \`${t}\`: ${stats} — ${issue_summary}%0A"
        fi
    done

    # Host disk
    local disk_pct disk_avail
    disk_pct=$(df --output=pcent / 2>/dev/null | tail -1 | tr -dc '0-9')
    disk_avail=$(df -h --output=avail / 2>/dev/null | tail -1 | tr -d ' ')
    local disk_icon="✅"
    if [ -n "$disk_pct" ] && [ "$disk_pct" -ge "${HOST_DISK_ALERT_PCT:-85}" ]; then
        disk_icon="❌"
        overall_ok=0
    fi
    report="${report}${disk_icon} \`host disk\`: ${disk_pct:-?}% (avail=${disk_avail:-?})%0A"

    # Reaper kill counts last 24h, scraped from journalctl
    local sp_kills pd_kills
    sp_kills=$(journalctl -u breachlab-specter-reaper --since "24 hours ago" --no-pager 2>/dev/null \
        | awk -F'killed=' '/killed=/{split($2,a," "); s+=a[1]} END{print s+0}')
    pd_kills=$(journalctl -u breachlab-phantom-deep-reaper --since "24 hours ago" --no-pager 2>/dev/null \
        | awk -F'killed=' '/killed=/{split($2,a," "); s+=a[1]} END{print s+0}')
    report="${report}🧹 \`reapers (24h)\`: specter=${sp_kills:-0}, phantom-deep=${pd_kills:-0}%0A"

    local header_icon="✅"
    [ "$overall_ok" = "0" ] && header_icon="⚠️"

    local subject="BreachLab daily watchdog"
    local msg="*${header_icon} ${subject} ($(date +%Y-%m-%d))*%0A%0A${report}"

    log "summary: overall_ok=${overall_ok}"
    log "summary payload:%0A${msg}"

    if [ "$DRY_RUN" = "1" ]; then
        printf '%s\n' "$msg" | sed 's/%0A/\n/g'
        return 0
    fi

    if [ -n "${ALERT_TG_TOKEN:-}" ] && [ -n "${ALERT_TG_CHAT_ID:-}" ]; then
        curl -sS --max-time 5 \
            -X POST \
            -d "chat_id=${ALERT_TG_CHAT_ID}" \
            -d "text=${msg}" \
            -d "parse_mode=Markdown" \
            "https://api.telegram.org/bot${ALERT_TG_TOKEN}/sendMessage" >/dev/null 2>&1 \
            && log "summary: tg sent" \
            || log "summary: tg FAILED"
    else
        log "summary: SKIPPED (no TG creds)"
    fi
}

case "$CMD" in
    init)      cmd_init "$TRACK" ;;
    check)     cmd_check "$TRACK" ;;
    check-all) cmd_check_all ;;
    summary)   cmd_summary ;;
    help|*)
        cat <<EOF
breachlab-invariants.sh — drift detector

Commands:
  init <track>       capture current state as baseline (run after legit deploy)
  check <track>      diff current state vs baseline + absolute checks
  check-all          check phantom + ghost + specter
  summary            consolidated daily watchdog report (always sends TG)

Tracks: phantom, ghost, specter, phantom-deep

Env (or /etc/breachlab-invariants.env):
  ALERT_TG_TOKEN, ALERT_TG_CHAT_ID  Telegram DM (preferred)
  ALERT_DISCORD_URL                 Discord webhook (fallback)
  STATE_DIR                         baseline + current dir (default /var/lib/breachlab-invariants)
  LOG_FILE                          (default /var/log/breachlab-invariants.log)
  DRY_RUN=1                         suppress alerts, just log
  HOST_DISK_ALERT_PCT               disk usage threshold (default 85)
EOF
        ;;
esac
