import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { kothMutations } from "@/lib/db/schema";

// Crown Wars — Mutating Arena (Drift Mode).
//
// Each round picks a deterministic alias scheme so the same round
// always shows the same labels (so a player reloading the page sees
// stable copy). Deterministic on round_id, not random clock.
//
// Phase A: the platform-side database/seed/display layer. Arena
// container does NOT actually rename files yet — Phase B will wire
// the reset script to honour these aliases. Until then the scheme
// is informational on the dashboard (and players who read it can
// internalise "the same primitive lives at different file names
// across rounds, real ops, not playbook").

type SchemePicker = {
  // The list of identifiers that can rotate. Each key is the
  // canonical (house) label; the value is the alias pool we draw
  // from. The first item in the pool is the no-mutation baseline.
  pools: Record<string, readonly string[]>;
};

// Phase C — expanded pools + directory drift + decoy.
// Each pool's order is locked in; do NOT reorder, or sha256 indices
// will land on different aliases for the same round_id and arena
// drift-arena.sh will diverge from the platform-side scheme.
//
// Arena-side mirror lives at:
//   breachlab-koth:scripts/drift-arena.sh:POOLS
// Any change here MUST land there at the same deploy.
const PICKER: SchemePicker = {
  pools: {
    // Renamed binaries (canonical → alias).
    "phantom-python3": [
      "phantom-python3",
      "system-py",
      "auth-helper",
      "ops-py3",
      "secure-runner",
      "init-helper",
      "py-runtime",
      "diag-py",
      "service-runner",
      "sys-loader",
    ],
    "system-checker": [
      "system-checker",
      "ops-verify",
      "perimeter-check",
      "service-probe",
      "net-monitor",
      "health-checker",
      "diag-net",
      "uptime-probe",
      "reach-test",
      "ping-helper",
    ],
    "redis-dbfilename": [
      "dump.rdb",
      "authorized_keys",
      "shadow.bak",
      "system.cache",
      "audit.log",
      "session.dat",
      "metrics.dump",
      "telemetry.bin",
    ],
    // Directory drift — where the renamed binary actually lives.
    // /usr/local/bin stays at index 0 so the "naive" round keeps
    // binaries in the expected place; other dirs force a wider find.
    "phantom-python3-dir": [
      "/usr/local/bin",
      "/opt/svc/bin",
      "/usr/lib/utils",
      "/srv/local/sbin",
    ],
    "system-checker-dir": [
      "/usr/local/bin",
      "/opt/diag/bin",
      "/usr/sbin",
      "/var/lib/health",
    ],
    // Decoy SUID binary — one per round. Lands at /usr/local/bin
    // and is SUID-root so `find -perm -4000` shows it. Calling it
    // logs the attempt and prints a rejection. Decoy-hit lines show
    // up in the Guard's Eye via the audit-streamer.
    "decoy-name": [
      "audit-rotate",
      "perimeter-scan",
      "service-restart",
      "log-shipper",
      "metrics-collector",
      "uptime-monitor",
      "net-watchdog",
      "syslog-tail",
    ],
    // Phase D — exploit signature drift.
    // phantom-python3 accepts ONE exploit vector per round:
    //   pythonstartup → PYTHONSTARTUP env (needs `-i`)
    //   pythonpath    → PYTHONPATH env + sitecustomize.py
    //   argv-c        → `-c "<code>"` argv injection
    // The wrapper enforces this by stripping unsafe argv flags
    // (-c, -m, positional script) in the env-based signatures, and
    // stripping all PYTHON* env vars in the argv-c signature.
    // Players who guess wrong get python3 with no exploit surface —
    // their payload silently doesn't trigger.
    "phantom-python3-signature": [
      "pythonstartup",
      "pythonpath",
      "argv-c",
    ],
    // system-checker accepts ONE shell metachar per round. argv[1] is
    // scanned; if it contains any non-active metachar from the banned
    // set, the binary refuses with "input rejected". Player must use
    // the active separator.
    "system-checker-signature": [
      "semicolon",
      "pipe",
      "backtick",
      "dollar-paren",
    ],
  },
};

// Stable per-round picker — sha256 of the round id derives the index
// for each pool. Same round always lands on the same scheme.
function pickFor(roundId: string): {
  scheme: Record<string, string>;
  label: string;
} {
  // sha256 = 32 bytes; we can carry up to 8 pools at 4 bytes each
  // without overlapping. Pool order is locked in and the arena's
  // drift-arena.sh mirrors this byte-for-byte — if you add a pool,
  // both sides must land together. Adding a pool past index 7 would
  // need a different keying scheme (e.g., domain-separated sha256
  // per pool name) — do that, don't wrap the offset.
  const hash = createHash("sha256").update(`koth-mutation:${roundId}`).digest();
  const scheme: Record<string, string> = {};
  let cursor = 0;
  for (const [canonical, pool] of Object.entries(PICKER.pools)) {
    if (cursor + 4 > hash.length) {
      throw new Error("koth/mutations: too many pools for 32-byte digest");
    }
    const idx = hash.readUInt32BE(cursor) % pool.length;
    scheme[canonical] = pool[idx];
    cursor += 4;
  }
  // Label = the python alias for now; it's the most player-visible.
  const label = scheme["phantom-python3"];
  return { scheme, label };
}

export async function getOrCreateMutationForRound(
  roundId: string,
): Promise<{
  schemeLabel: string;
  scheme: Record<string, string>;
  generatedAt: Date;
}> {
  const existing = await db
    .select()
    .from(kothMutations)
    .where(eq(kothMutations.roundId, roundId))
    .limit(1);
  if (existing.length > 0) {
    return {
      schemeLabel: existing[0].schemeLabel,
      scheme: existing[0].scheme as Record<string, string>,
      generatedAt: existing[0].generatedAt,
    };
  }
  const picked = pickFor(roundId);
  await db
    .insert(kothMutations)
    .values({
      roundId,
      schemeLabel: picked.label,
      scheme: picked.scheme,
    })
    .onConflictDoNothing({ target: kothMutations.roundId });
  return {
    schemeLabel: picked.label,
    scheme: picked.scheme,
    generatedAt: new Date(),
  };
}

// Resolve a canonical name to its active alias under the given
// mutation (or fall back to the canonical name if the scheme doesn't
// cover it / no mutation exists yet).
export function aliasOf(
  scheme: Record<string, string> | null | undefined,
  canonical: string,
): string {
  if (!scheme) return canonical;
  return scheme[canonical] ?? canonical;
}
