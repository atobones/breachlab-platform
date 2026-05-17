import { createHash } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { kothRoundSlots, kothRounds, kothSshKeys } from "@/lib/db/schema";

// Ten player slots in the arena container (koth0..koth9). Increase
// MAX_SLOT when the arena grows further — the Dockerfile useradd loop
// and sync-keys.sh MAX_SLOT must match exactly or operators land on a
// missing unix account.
export const MAX_SLOT = 9;

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

export async function findKeyForUser(userId: string) {
  const [row] = await db
    .select()
    .from(kothSshKeys)
    .where(eq(kothSshKeys.userId, userId))
    .limit(1);
  return row ?? null;
}

// Resolve the current active round id, or null when the arena is
// between rounds (rare — reset-arena reopens within seconds).
export async function currentActiveRoundId(): Promise<string | null> {
  const [row] = await db
    .select({ id: kothRounds.id })
    .from(kothRounds)
    .where(eq(kothRounds.status, "active"))
    .orderBy(desc(kothRounds.startedAt))
    .limit(1);
  return row?.id ?? null;
}

// Pick the lowest unused slot 0..MAX_SLOT for the given round.
// Returns null when all slots are claimed for this round (arena full
// for this 30-min window — next round opens fresh).
export async function pickFreeSlotForRound(
  roundId: string,
): Promise<number | null> {
  const taken = await db
    .select({ slot: kothRoundSlots.slot })
    .from(kothRoundSlots)
    .where(eq(kothRoundSlots.roundId, roundId));
  const set = new Set(taken.map((r) => r.slot));
  for (let s = 0; s <= MAX_SLOT; s++) {
    if (!set.has(s)) return s;
  }
  return null;
}

// Find the player's slot in the current active round, if they've
// claimed one. Returns null when the player has registered a key but
// not yet claimed a slot for this round.
export async function findRoundSlotForUser(
  userId: string,
  roundId: string,
): Promise<{ slot: number; claimedAt: Date } | null> {
  const [row] = await db
    .select({
      slot: kothRoundSlots.slot,
      claimedAt: kothRoundSlots.claimedAt,
    })
    .from(kothRoundSlots)
    .where(
      and(
        eq(kothRoundSlots.userId, userId),
        eq(kothRoundSlots.roundId, roundId),
      ),
    )
    .limit(1);
  return row ?? null;
}
