import { z } from "zod";

/**
 * BreachLab uses the chain-password model: the flag you submit IS the
 * secret you recovered while solving the level (which doubles as the
 * SSH password for the next user, or the graduation token on the last
 * level). So the schema only enforces sane length — the real
 * validation happens by hash lookup in submit.ts.
 */
export const flagSchema = z
  .string()
  .min(4, "Flag too short — re-check what you copied.")
  .max(128, "Flag too long — re-check what you copied.");

// Flags are exact strings (case-sensitive by design — players copy
// shell passwords verbatim). Only strip surrounding whitespace.
export function normalizeFlag(raw: string): string {
  return raw.trim();
}
