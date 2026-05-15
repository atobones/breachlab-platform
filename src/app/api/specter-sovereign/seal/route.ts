/**
 * POST /api/specter-sovereign/seal
 *
 * Body: { key: string }  (16-char lowercase hex)
 *
 * Validates the player's derived Sovereign key against the server-side
 * expectation. On match, assigns next available rank (1 = Sovereign,
 * 2+ = Mystery-Solved). Rate-limited per user. Announces the first
 * Sovereign on Discord via webhook.
 *
 * Response:
 *   200 { ok: true, sovereign: true, rank: 1 } — first solver
 *   200 { ok: true, sovereign: false, rank: N, sovereignUsername, sovereignClaimedAt }
 *   400 { ok: false, reason: "rejected", attemptsLeft }
 *   401 { ok: false, reason: "unauthorized" }
 *   429 { ok: false, reason: "cooldown" | "capped", secondsLeft? }
 */
import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNotNull, sql } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { users, badges } from "@/lib/db/schema";
import {
  expectedSovereignKey,
  constantTimeEquals,
} from "@/lib/specter-sovereign/derive";

const COOLDOWN_SECONDS = 30;
const ATTEMPT_CAP = 100;

export async function POST(req: NextRequest) {
  const { user } = await getCurrentSession();
  if (!user) {
    return NextResponse.json(
      { ok: false, reason: "unauthorized" },
      { status: 401 },
    );
  }

  // Body parse — accept either `{key}` or `{password}` for resilience.
  let body: { key?: string; password?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, reason: "bad-body" },
      { status: 400 },
    );
  }
  const raw = (body.key ?? body.password ?? "").trim().toLowerCase();
  if (!/^[0-9a-f]{16}$/.test(raw)) {
    return NextResponse.json(
      { ok: false, reason: "bad-format" },
      { status: 400 },
    );
  }

  // Pull fresh user state for rate-limit decisions.
  const meRow = await db
    .select({
      id: users.id,
      username: users.username,
      rank: users.specterSovereignRank,
      attempts: users.specterSovereignAttempts,
      lastAt: users.specterSovereignLastAttemptAt,
      certCheck: users.id, // need at least one column — cert check below
    })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  const me = meRow[0];
  if (!me) {
    return NextResponse.json(
      { ok: false, reason: "unauthorized" },
      { status: 401 },
    );
  }

  // Gate: must hold the Specter Analyst cert. Otherwise the gate is
  // simply silent (404-ish) — we don't tell unqualified callers about
  // the meta-game's existence.
  const certRow = await db
    .select({ id: badges.id })
    .from(badges)
    .where(
      and(eq(badges.userId, user.id), eq(badges.kind, "specter_graduate")),
    )
    .limit(1);
  if (certRow.length === 0) {
    return NextResponse.json(
      { ok: false, reason: "gate-silent" },
      { status: 404 },
    );
  }

  // Already solved? Idempotent: return current state, do not re-record.
  if (me.rank !== null) {
    const sovRow = await db
      .select({
        username: users.username,
        solvedAt: users.specterSovereignSolvedAt,
      })
      .from(users)
      .where(eq(users.specterSovereignRank, 1))
      .limit(1);
    return NextResponse.json({
      ok: true,
      sovereign: me.rank === 1,
      rank: me.rank,
      alreadySolved: true,
      sovereignUsername: sovRow[0]?.username ?? null,
      sovereignClaimedAt: sovRow[0]?.solvedAt?.toISOString() ?? null,
    });
  }

  // Cooldown / cap checks before any compute.
  const now = Date.now();
  if (me.attempts >= ATTEMPT_CAP) {
    return NextResponse.json(
      { ok: false, reason: "capped" },
      { status: 429 },
    );
  }
  if (me.lastAt) {
    const elapsed = (now - me.lastAt.getTime()) / 1000;
    if (elapsed < COOLDOWN_SECONDS) {
      return NextResponse.json(
        {
          ok: false,
          reason: "cooldown",
          secondsLeft: Math.ceil(COOLDOWN_SECONDS - elapsed),
        },
        { status: 429 },
      );
    }
  }

  // Stamp attempt FIRST so a slow grader call can't be brute-replayed.
  await db
    .update(users)
    .set({
      specterSovereignAttempts: sql`${users.specterSovereignAttempts} + 1`,
      specterSovereignLastAttemptAt: new Date(now),
    })
    .where(eq(users.id, user.id));

  // Validate.
  const expected = expectedSovereignKey(user.id, me.username);
  if (!constantTimeEquals(raw, expected)) {
    const attemptsLeft = Math.max(0, ATTEMPT_CAP - (me.attempts + 1));
    return NextResponse.json(
      { ok: false, reason: "rejected", attemptsLeft },
      { status: 400 },
    );
  }

  // PASS — assign rank atomically.
  // Find the current max rank, +1. Race-safe because of the partial
  // unique index on rank — concurrent writers serialize on insert.
  let assignedRank = 0;
  for (let tries = 0; tries < 5; tries++) {
    const maxRow = await db
      .select({
        max: sql<number | null>`MAX(${users.specterSovereignRank})`.as("max"),
      })
      .from(users)
      .where(isNotNull(users.specterSovereignRank));
    const nextRank = (maxRow[0]?.max ?? 0) + 1;
    try {
      await db
        .update(users)
        .set({
          specterSovereignRank: nextRank,
          specterSovereignSolvedAt: new Date(),
        })
        .where(
          and(eq(users.id, user.id), eq(users.specterSovereignRank as never, sql`NULL`)),
        );
      // Verify we actually got that rank (insert may have lost the race).
      const check = await db
        .select({ rank: users.specterSovereignRank })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
      if (check[0]?.rank === nextRank) {
        assignedRank = nextRank;
        break;
      }
    } catch {
      // unique-violation — another writer took this rank. Retry.
    }
  }

  if (assignedRank === 0) {
    return NextResponse.json(
      { ok: false, reason: "race-failed" },
      { status: 500 },
    );
  }

  // Award badge (idempotent — kind+userId is the natural key in award.ts).
  await db
    .insert(badges)
    .values({
      userId: user.id,
      kind: assignedRank === 1 ? "specter_sovereign" : "specter_mystery_solved",
      refId: user.id,
    })
    .onConflictDoNothing();

  // Discord announcement only for first Sovereign.
  if (assignedRank === 1) {
    void announceSovereignToDiscord(me.username);
  }

  // Fetch Sovereign row for response payload (covers both paths).
  const sovRow = await db
    .select({
      username: users.username,
      solvedAt: users.specterSovereignSolvedAt,
    })
    .from(users)
    .where(eq(users.specterSovereignRank, 1))
    .limit(1);

  return NextResponse.json({
    ok: true,
    sovereign: assignedRank === 1,
    rank: assignedRank,
    sovereignUsername: sovRow[0]?.username ?? null,
    sovereignClaimedAt: sovRow[0]?.solvedAt?.toISOString() ?? null,
  });
}

async function announceSovereignToDiscord(username: string): Promise<void> {
  const url = process.env.DISCORD_SOVEREIGN_WEBHOOK_URL;
  if (!url) return;
  const body = {
    content: [
      "🟢 **SPECTER SOVEREIGN** has emerged.",
      "",
      `@${username} is the first operator to walk through`,
      "the hidden gate of Specter I.",
      "",
      "The haze is gone from the shell. The mantle is theirs.",
      "",
      "The next door will open eventually. The next color will appear.",
    ].join("\n"),
  };
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("specter-sovereign discord webhook failed:", err);
  }
}
