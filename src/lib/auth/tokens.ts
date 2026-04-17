import { encodeBase64urlNoPadding } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import { timingSafeEqual } from "crypto";

export const TOKEN_LENGTH_BYTES = 32;

export function generateToken(): string {
  const bytes = new Uint8Array(TOKEN_LENGTH_BYTES);
  crypto.getRandomValues(bytes);
  return encodeBase64urlNoPadding(bytes);
}

export async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = sha256(data);
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Constant-time comparison of `Authorization: Bearer <secret>` against an
 * expected secret. Constant-time matters because the platform source is
 * public — a naive `===` on the full header string lets an attacker probe
 * byte-by-byte via response-time differences. Returns false for any
 * malformed input.
 */
export function safeBearerMatch(
  authHeader: string | null | undefined,
  expected: string | null | undefined
): boolean {
  if (!authHeader || !expected) return false;
  const prefix = "Bearer ";
  if (!authHeader.startsWith(prefix)) return false;
  const provided = authHeader.slice(prefix.length);

  const providedBuf = Buffer.from(provided, "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");
  // timingSafeEqual throws on length mismatch. Return false in that case
  // after a dummy compare so the length check doesn't create a detectable
  // short-circuit.
  if (providedBuf.length !== expectedBuf.length) {
    timingSafeEqual(expectedBuf, expectedBuf);
    return false;
  }
  return timingSafeEqual(providedBuf, expectedBuf);
}
