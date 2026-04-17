import { z } from "zod";

export const flagSchema = z
  .string()
  .min(6)
  .max(128)
  .regex(
    /^FLAG\{[A-Za-z0-9_.\-]+\}$/i,
    "Flag must look like FLAG{...}. SSH passwords are not flags — look for a FLAG{...} token hidden on the level."
  );

export function normalizeFlag(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.toLowerCase().startsWith("flag{")) return trimmed;
  return "FLAG{" + trimmed.slice(5);
}
