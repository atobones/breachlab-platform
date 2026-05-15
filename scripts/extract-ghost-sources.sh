#!/bin/bash
# Run on host. Extracts every baked-from-image file under /home/ghost*
# (per /etc/ghost-baked-manifest) into /etc/breachlab-ghost-watchdog/sources/snapshot/
# keeping the path structure. Captures per-file metadata (owner:group + mode).
# Idempotent — safe to re-run after image rebuild.
set -e
DEST=/etc/breachlab-ghost-watchdog/sources/snapshot
META=/etc/breachlab-ghost-watchdog/sources/snapshot.meta
CONTAINER=breachlab-ghost

rm -rf "$DEST"
mkdir -p "$DEST"
> "$META"

# Pull manifest content from container (it's mode 444 but readable).
MANIFEST=$(docker exec "$CONTAINER" cat /etc/ghost-baked-manifest)

# Walk manifest line by line. Skip shell init files — losing them doesn't
# break a level and rewriting them is teaching-irrelevant residue territory.
echo "$MANIFEST" | while IFS= read -r path; do
    [ -z "$path" ] && continue
    base=$(basename "$path")
    case "$base" in
        .bash_logout|.bashrc|.profile|.bash_history|known_hosts) continue ;;
    esac
    # Capture metadata before copy
    meta=$(docker exec "$CONTAINER" stat -c '%U:%G %a' "$path" 2>/dev/null || echo "")
    [ -z "$meta" ] && continue
    target="$DEST$path"
    mkdir -p "$(dirname "$target")"
    docker cp "$CONTAINER:$path" "$target" 2>/dev/null || continue
    printf '%s\t%s\n' "$path" "$meta" >> "$META"
done

# Ghost21 repo is a full git directory (100+ files). Pull whole tree.
if docker exec "$CONTAINER" test -d /home/ghost21/repo 2>/dev/null; then
    rm -rf "$DEST/home/ghost21/repo"
    docker cp "$CONTAINER:/home/ghost21/repo" "$DEST/home/ghost21/repo"
    # Record marker entry — watchdog handles dirs differently
    printf '%s\t%s\n' "/home/ghost21/repo" "ghost21:ghost21 DIR" >> "$META"
fi

# Permissions on the snapshot stay restrictive — only root reads.
chmod -R go-rwx "$DEST" "$META"

echo "snapshot: $(find "$DEST" -type f | wc -l) files, $(du -sh "$DEST" | awk '{print $1}')"
echo "metadata: $(wc -l < "$META") entries"
