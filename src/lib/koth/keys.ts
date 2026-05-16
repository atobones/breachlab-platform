import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { kothSshKeys } from "@/lib/db/schema";

// Five player slots in the arena container (koth0..koth4). Increase
// MAX_SLOT when the arena grows to more slots (Dockerfile useradd loop
// must match).
export const MAX_SLOT = 4;

const ALLOWED_ALGOS = new Set(["ssh-ed25519", "ssh-rsa", "ecdsa-sha2-nistp256", "ecdsa-sha2-nistp384", "ecdsa-sha2-nistp521"]);

export type ParsedKey = {
  algo: string;
  body: string;          // base64-encoded key blob, single line, no comment
  comment: string | null;
  fingerprint: string;   // "SHA256:base64(no-padding)" — matches ssh-keygen -l format
  normalized: string;    // "<algo> <body>" — what we store as pubkey (drops comment)
};

export function parseAndValidatePubkey(input: string): ParsedKey | { error: string } {
  const trimmed = input.trim();
  if (!trimmed) return { error: "key is empty" };
  if (trimmed.includes("\n")) {
    return { error: "paste a single line (one key per submission)" };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) {
    return { error: "key format invalid (expected: <algo> <body> [comment])" };
  }
  const algo = parts[0];
  const body = parts[1];
  const comment = parts.length >= 3 ? parts.slice(2).join(" ") : null;

  if (!ALLOWED_ALGOS.has(algo)) {
    return {
      error: `algo "${algo}" not allowed — use ssh-ed25519 (preferred), ssh-rsa, or ecdsa`,
    };
  }

  // Validate base64 + reasonable length.
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(body) || body.length < 20) {
    return { error: "key body looks malformed (not base64 or too short)" };
  }

  let decoded: Buffer;
  try {
    decoded = Buffer.from(body, "base64");
  } catch {
    return { error: "key body is not valid base64" };
  }

  // RSA: enforce 2048-bit minimum (DER inside the SSH wire format).
  // Crude: if the algo is ssh-rsa and decoded byte length suggests
  // < 2048-bit modulus, reject. 2048-bit key ≈ 280-byte ssh blob.
  if (algo === "ssh-rsa" && decoded.length < 280) {
    return { error: "RSA key too small — minimum 2048 bits" };
  }

  // OpenSSH-style fingerprint: base64(sha256(decoded-blob)) without padding.
  const hash = createHash("sha256").update(decoded).digest("base64");
  const fingerprint = "SHA256:" + hash.replace(/=+$/, "");

  return {
    algo,
    body,
    comment,
    fingerprint,
    normalized: `${algo} ${body}`,
  };
}

// Pick the lowest unused slot 0..MAX_SLOT. Returns null when the arena
// is full. Caller should retry or return a "full" error to the user.
export async function pickFreeSlot(): Promise<number | null> {
  const taken = await db
    .select({ slot: kothSshKeys.slot })
    .from(kothSshKeys);
  const set = new Set(taken.map((r) => r.slot));
  for (let s = 0; s <= MAX_SLOT; s++) {
    if (!set.has(s)) return s;
  }
  return null;
}

export async function findKeyForUser(userId: string) {
  const [row] = await db
    .select()
    .from(kothSshKeys)
    .where(eq(kothSshKeys.userId, userId))
    .limit(1);
  return row ?? null;
}
