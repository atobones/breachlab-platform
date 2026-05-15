/**
 * Client-side crypto tools exposed in the platform shell for the
 * Specter Sovereign meta-game (L14). These are deliberately generic
 * (they work on any input) — they happen to be the four operations the
 * Sovereign protocol asks for, but a player who learns about them on
 * one challenge can carry them into the next.
 *
 * Mirrors the server-side derive functions in `derive.ts` — they MUST
 * stay byte-equivalent or the player's locally-computed key won't
 * match the server's expected key.
 */

/** RFC 4648 base32 decode → uppercase hex string. */
export function shellB32DecodeToHex(s: string): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const padded = s.toUpperCase().replace(/=+$/, "");
  let bits = "";
  for (const c of padded) {
    const idx = alphabet.indexOf(c);
    if (idx < 0) {
      throw new Error(`b32: invalid character '${c}' (RFC 4648 alphabet)`);
    }
    bits += idx.toString(2).padStart(5, "0");
  }
  const fullBytes = Math.floor(bits.length / 8);
  let hex = "";
  for (let i = 0; i < fullBytes; i++) {
    const byte = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
    hex += byte.toString(16).padStart(2, "0").toUpperCase();
  }
  return hex;
}

/** Reverse a string. */
export function shellReverse(s: string): string {
  return [...s].reverse().join("");
}

/** ROT13 — letters only, case-preserved. Digits/symbols unchanged. */
export function shellRot13(s: string): string {
  return s.replace(/[A-Za-z]/g, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}

/**
 * SHA-256 of UTF-8 bytes → lowercase 64-char hex.
 * Uses Web Crypto subtle (available in all modern browsers + Node 19+).
 */
export async function shellSha256(s: string): Promise<string> {
  const data = new TextEncoder().encode(s);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
