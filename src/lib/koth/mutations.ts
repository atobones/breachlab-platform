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

const PICKER: SchemePicker = {
  pools: {
    "phantom-python3": [
      "phantom-python3",
      "system-py",
      "auth-helper",
      "ops-py3",
      "secure-runner",
    ],
    "system-checker": [
      "system-checker",
      "ops-verify",
      "perimeter-check",
      "service-probe",
    ],
    "redis-dbfilename": [
      "dump.rdb",
      "authorized_keys",
      "shadow.bak",
      "system.cache",
    ],
  },
};

// Stable per-round picker — sha256 of the round id derives the index
// for each pool. Same round always lands on the same scheme.
function pickFor(roundId: string): {
  scheme: Record<string, string>;
  label: string;
} {
  const hash = createHash("sha256").update(`koth-mutation:${roundId}`).digest();
  const scheme: Record<string, string> = {};
  let cursor = 0;
  for (const [canonical, pool] of Object.entries(PICKER.pools)) {
    const idx = hash.readUInt32BE(cursor % 28) % pool.length;
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
