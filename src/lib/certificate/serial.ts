import { createHash } from "node:crypto";

const BLOCK_CHARS = "0123456789ABCDEF";

/**
 * Deterministic operative serial number derived from (userId, trackId,
 * awardedAt). Format: `GHST-XXXX-XXXX-XXXX` — 12 hex chars split into groups.
 * The hash mixes the ISO date so re-issues after badge-row recreation would
 * produce a new serial (desirable — a re-forged cert is visibly different).
 */
export function operativeSerial(
  userId: string,
  trackId: string,
  awardedAt: Date,
  prefix: string = "GHST",
): string {
  const input = `${userId}|${trackId}|${awardedAt.toISOString()}`;
  const digest = createHash("sha256").update(input).digest();
  let hex = "";
  for (let i = 0; i < 6; i++) {
    hex += BLOCK_CHARS[digest[i] >> 4];
    hex += BLOCK_CHARS[digest[i] & 0x0f];
  }
  return `${prefix}-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}

/**
 * Deterministic 4-line ASCII "seal" derived from the serial — a small
 * distinctive glyph block unique per operative, rendered to the right of
 * the certificate body.
 */
export function operativeSeal(serial: string): string[] {
  const digest = createHash("sha256").update(serial).digest();
  const glyphs = ["#", "*", "+", "@", "%", "$", "&", "=", "x", "o"];
  const rows: string[] = [];
  for (let r = 0; r < 5; r++) {
    let line = "";
    for (let c = 0; c < 5; c++) {
      const byte = digest[(r * 5 + c) % digest.length];
      line += glyphs[byte % glyphs.length];
    }
    rows.push(line);
  }
  return rows;
}
