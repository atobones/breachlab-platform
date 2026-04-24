/**
 * Example shape for canonical-flags.local.ts.
 *
 * Copy to `canonical-flags.local.ts` (gitignored) and fill in real flag
 * values. Source of truth:
 *   breachlab-ghost/Dockerfile           — `echo "ghostN:<pwd>" | chpasswd`
 *   breachlab-phantom/Dockerfile         — same pattern
 *   breachlab-ghost/services/level22-gatekeeper.py   — Ghost graduation
 *   breachlab-phantom/services/verify-graduation.sh  — Phantom graduation
 */
import type { CanonicalFlags } from "./canonical-flags";

export const GHOST_FLAGS: Record<number, string> = {
  // 0: "W3lc0m3T0Gh0st",
  // 1: "...",
};

export const PHANTOM_FLAGS: Record<number, string> = {
  // 0: "bl_phtm0_...",
  // 1: "bl_phtm1_...",
};

export const CANONICAL_FLAGS: CanonicalFlags = {
  ghost: GHOST_FLAGS,
  phantom: PHANTOM_FLAGS,
};
