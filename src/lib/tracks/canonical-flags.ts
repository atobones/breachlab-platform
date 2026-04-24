/**
 * Canonical flags are no longer committed to this repo.
 *
 * Prior shape of this file held plaintext flag values per track/level as a
 * "mirror" of the container Dockerfiles. Because this repo is public, that
 * file leaked every Ghost and Phantom flag to anyone who ran
 * `git clone atobones/breachlab-platform && cat
 *  src/lib/tracks/canonical-flags.ts`. Cheater galile0 (2026-04-23) used
 * exactly this path to submit Ghost L14→L22 in 40 seconds and Phantom
 * L1→L4 in 14 seconds.
 *
 * Flags now live in `canonical-flags.local.ts` next to this file, which is
 * gitignored. Only the seed script (`scripts/sync-flags.ts`) reads them,
 * and only at operator-run time. Runtime submit validation goes through
 * the `flags` DB table (hashed), which was already the source of truth —
 * this file was always just a dev-side mirror.
 *
 * To seed/sync flags locally:
 *   cp src/lib/tracks/canonical-flags.local.example.ts \
 *      src/lib/tracks/canonical-flags.local.ts
 *   # edit .local.ts with current values (source of truth: the container
 *   # Dockerfiles + graduation verifier scripts)
 *   DATABASE_URL=... npx tsx scripts/sync-flags.ts
 */

export type FlagMap = Record<number, string>;
export type CanonicalFlags = Record<string, FlagMap>;

export async function loadCanonicalFlags(): Promise<CanonicalFlags> {
  try {
    // Dynamic import so the absence of the local file doesn't break
    // builds/tests that don't need it.
    const mod = await import("./canonical-flags.local");
    return (mod.CANONICAL_FLAGS ?? {}) as CanonicalFlags;
  } catch {
    throw new Error(
      "canonical-flags.local.ts not present. Create it from " +
        "canonical-flags.local.example.ts and fill in current flag values. " +
        "This file is intentionally NOT committed to the public repo."
    );
  }
}
