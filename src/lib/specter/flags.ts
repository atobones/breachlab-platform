// Specter per-player flag/password derivation.
//
// flag(player_id, level) = "bl_" + HMAC_SHA256(SECRET, player_id || ":" || level)[:32 hex]
//
// The flag a player gets at L_n is also the SSH password they use to log
// into L_{n+1}. Same string serves both roles (OTW-Bandit-style chain),
// but per-player so leaking a flag in Discord doesn't unlock anything
// for the leaker — every player has their own.

import { createHmac, createHash } from "crypto";

// Deployed Specter level slugs in chain order. Update when adding levels.
// L0 = paper-trail, L1 = search-operator, L2 = code-hunter, L3 = js-recon.
export const SPECTER_LEVEL_SLUGS = [
  "paper-trail",
  "search-operator",
  "code-hunter",
  "js-recon",
] as const;

export type SpecterLevelSlug = (typeof SPECTER_LEVEL_SLUGS)[number];

// Map from track-level idx (0..3) to the slug used in HMAC inputs and as
// the level identifier in the oracle / PAM exchange.
export function specterLevelSlugForIdx(idx: number): SpecterLevelSlug | null {
  return SPECTER_LEVEL_SLUGS[idx] ?? null;
}

export function specterIdxForSlug(slug: string): number {
  return SPECTER_LEVEL_SLUGS.indexOf(slug as SpecterLevelSlug);
}

function getSecret(): string {
  const s = process.env.SPECTER_FLAG_HMAC_SECRET;
  if (!s) {
    throw new Error("SPECTER_FLAG_HMAC_SECRET env var is not set");
  }
  return s;
}

// Per-player flag for (user, level). Deterministic — repeated calls
// return the same value. Truncated to 16 bytes / 32 hex so the visible
// length matches our other flags.
export function specterFlagFor(userId: string, level: SpecterLevelSlug): string {
  const mac = createHmac("sha256", getSecret())
    .update(`${userId}:${level}`)
    .digest("hex");
  return `bl_${mac.slice(0, 32)}`;
}

// Lookup helper: given a submitted flag string and a userId, find which
// Specter level it maps to (if any). Used by submitFlag's fallthrough
// after canonical-flags table miss. O(N) over Specter levels — currently
// 4, capped at 13.
export function specterLevelForFlag(
  userId: string,
  submitted: string
): SpecterLevelSlug | null {
  for (const slug of SPECTER_LEVEL_SLUGS) {
    if (specterFlagFor(userId, slug) === submitted) {
      return slug;
    }
  }
  return null;
}

export function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}
