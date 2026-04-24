/**
 * Canonical-flags type definitions.
 *
 * Prior shape of this file held plaintext flag values per track/level as a
 * "mirror" of the container Dockerfiles. Because this repo is public, that
 * file leaked every Ghost and Phantom flag to anyone who ran
 * `git clone atobones/breachlab-platform && cat
 *  src/lib/tracks/canonical-flags.ts`. Cheater galile0 (2026-04-23) used
 * exactly this path to submit Ghost L14→L22 in 40 seconds and Phantom
 * L1→L4 in 14 seconds.
 *
 * Values now live in `canonical-flags.local.ts` next to this file
 * (gitignored). The seed script `scripts/sync-flags.ts` dynamically
 * imports them at operator-run time. This file keeps only the *types*
 * so the runtime bundle contains nothing secret, and the loader lives
 * exclusively in the Node-only `scripts/` tree so Next.js' webpack pass
 * doesn't need to resolve the gitignored path.
 *
 * Runtime submit validation goes through the `flags` DB table (hashed),
 * which was always the source of truth — this file was always just a
 * dev-side mirror.
 */

export type FlagMap = Record<number, string>;
export type CanonicalFlags = Record<string, FlagMap>;
