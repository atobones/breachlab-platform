/**
 * L14 Specter Sovereign — server-side key derivation.
 *
 * Mirrors the Python `_l14_fragment(player_id)` in
 * `breachlab-specter/l13/sidecars/aws-public-bucket/app.py` for the L13
 * per-player fragment, then walks the same 4-step transform chain the
 * player walks in the platform shell.
 *
 * NEVER change the constants below without coordinating a re-deploy of
 * L13's aws-public-bucket sidecar — drift = no player can solve.
 */
import { createHash } from "node:crypto";

/** L10 fragment — strings.exe `.rsrc` section of corpus/dumps/dump-D/quantum-leak.exe */
export const L10_FRAGMENT = "77NP4B5H762H";

/** L11 fragment — TON inheritance-gift TX memo (Wei→Elliott) */
export const L11_FRAGMENT = "LQUSS5XAV5CE";

/** L12 fragment — flipped-asset sidecar, operational-protocols topic */
export const L12_FRAGMENT = "H7XQR9NMVB42";

/**
 * Player-id seeded alphabet for L13's per-player fragment. Mirrors the
 * Python sidecar EXACTLY — Crockford-ish base32 without I/O/U/0/1.
 */
const L13_ALPHABET = "ABCDEFGHJKLMNPQRSTVWXYZ23456789";

/**
 * Recomputes L13's per-player fragment for a given player_id.
 *
 * Wire-equivalent of:
 *   seed = f"L14:{player_id}".encode()
 *   h = hashlib.sha256(seed).hexdigest()
 *   chars = "ABCDEFGHJKLMNPQRSTVWXYZ23456789"
 *   payload = "".join(chars[int(h[i:i+2], 16) % len(chars)] for i in range(0, 12, 2))
 *   return f"L14:{payload}"
 *
 * @param playerId — the same UUID the wargame oracle uses for this user
 *                   (NOT the username). For BL platform users, this is
 *                   `users.id` (UUID v4 string).
 */
export function l13FragmentForPlayer(playerId: string): string {
  const seed = Buffer.from(`L14:${playerId}`, "utf-8");
  const digest = createHash("sha256").update(seed).digest("hex");
  let payload = "";
  for (let i = 0; i < 12; i += 2) {
    const byte = parseInt(digest.slice(i, i + 2), 16);
    payload += L13_ALPHABET[byte % L13_ALPHABET.length];
  }
  return `L14:${payload}`;
}

// ─── 4-step decode chain ───────────────────────────────────────────────
// These mirror EXACTLY the operations the player runs in the SHELL
// (`b32 -d`, `rev`, `rot13`, strip-prefix). Players who use the in-shell
// commands and concatenate get the same bytes the server computes here.

/**
 * Base32 decode → uppercase hex.
 * Mirrors `b32 -d <s>` SHELL command. RFC 4648 base32 (the same alphabet
 * Python `base64.b32decode` uses, no Crockford).
 */
export function b32DecodeToHex(s: string): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const padded = s.toUpperCase().replace(/=+$/, "");
  let bits = "";
  for (const c of padded) {
    const idx = alphabet.indexOf(c);
    if (idx < 0) {
      throw new Error(`b32: invalid character '${c}'`);
    }
    bits += idx.toString(2).padStart(5, "0");
  }
  // Trim trailing bits that don't fill a full byte (RFC 4648 unpadded)
  const fullBytes = Math.floor(bits.length / 8);
  let hex = "";
  for (let i = 0; i < fullBytes; i++) {
    const byte = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
    hex += byte.toString(16).padStart(2, "0").toUpperCase();
  }
  return hex;
}

/** Reverse string (Unicode-safe via spread, but inputs are ASCII). */
export function reverseString(s: string): string {
  return [...s].reverse().join("");
}

/** ROT13 — letters only, case-preserved. Digits unchanged. */
export function rot13(s: string): string {
  return s.replace(/[A-Za-z]/g, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}

/** Strip the `L14:` prefix from L13's per-player fragment. */
export function stripL14Prefix(s: string): string {
  return s.startsWith("L14:") ? s.slice(4) : s;
}

// ─── Final key derivation ──────────────────────────────────────────────

/**
 * Computes the expected 16-hex Sovereign key for a given player.
 *
 * Chain:
 *   t10 = b32-decode(L10_FRAGMENT)        → hex
 *   t11 = reverse(L11_FRAGMENT)
 *   t12 = rot13(L12_FRAGMENT)
 *   t13 = strip-prefix(L13_fragment(playerId))
 *   combined = t10 + t11 + t12 + t13 + username
 *   key = sha256(combined).hex.slice(0, 16)
 *
 * Username is lowercased before salting (case-insensitive — players
 * shouldn't lose on capitalisation drift).
 */
export function expectedSovereignKey(playerId: string, username: string): string {
  const t10 = b32DecodeToHex(L10_FRAGMENT);
  const t11 = reverseString(L11_FRAGMENT);
  const t12 = rot13(L12_FRAGMENT);
  const t13 = stripL14Prefix(l13FragmentForPlayer(playerId));
  const combined = t10 + t11 + t12 + t13 + username.toLowerCase();
  const digest = createHash("sha256").update(combined, "utf-8").digest("hex");
  return digest.slice(0, 16);
}

/**
 * Constant-time string equality. Use for key comparison to avoid
 * timing leaks (even though brute-force is rate-limited at the API
 * layer, defense in depth costs nothing).
 */
export function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
