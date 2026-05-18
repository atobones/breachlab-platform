import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { kothEvents, kothRounds, kothSshKeys, users } from "@/lib/db/schema";
import { safeBearerMatch } from "@/lib/auth/tokens";
import { resolveSlotToUserId, isValidEventKind } from "@/lib/koth/slots";
import {
  postKothEventToDiscord,
  postKothDosViolationToDiscord,
  postKothFirstDiscoveryToDiscord,
} from "@/lib/koth/discord";
import {
  recordPathEvent,
  resolvePathBySlug,
  snapshotForExploit,
} from "@/lib/koth/paths";
import {
  DISCOVERY_BONUS,
  maybeAwardFirstDiscovery,
  maybeAwardFirstTime,
} from "@/lib/koth/honors";
import {
  isPathLockedDown,
  recordLockdownBlock,
} from "@/lib/koth/guards";

// Crown daemon oracle endpoint. The daemon runs inside the KoTH arena
// container (Wave B1) and POSTs here every time it detects a crown
// state change in /root/.crown — or one of the synthetic events
// (patched, escalation_pending, path_activated, etc). The bearer token
// is the same KOTH_ORACLE_TOKEN shared between the host's .env and
// this endpoint's env.
//
// points_delta is left at 0 here. The scoring engine reads the event
// log periodically and writes computed points. Phase 2 introduces
// value-snapshot scoring (Diamond commodity pricing) via
// koth_path_events; see src/lib/koth/scoring.ts and paths.ts.
//
// Payload (all kinds):
//   {
//     round_id:     uuid string,
//     kind:         "crown_taken" | "dethroned" | "patched" | "escalated" | "tutorial"
//                   | "escalation_pending" | "path_activated" | "path_exploited"
//                   | "path_patched_attributed" | "path_closed",
//     actor_slot:   "koth0".."koth9" | null,
//     target_slot:  "koth0".."koth9" | null,
//     exploit_path: <slug> | null,
//     raw_meta:     object | null,
//   }

export async function POST(req: Request) {
  const expected = process.env.KOTH_ORACLE_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "KOTH_ORACLE_TOKEN not configured" },
      { status: 500 },
    );
  }
  if (!safeBearerMatch(req.headers.get("authorization"), expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: {
    round_id?: string;
    kind?: string;
    actor_slot?: string | null;
    target_slot?: string | null;
    exploit_path?: string | null;
    raw_meta?: Record<string, unknown> | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!body.round_id || typeof body.round_id !== "string") {
    return NextResponse.json({ error: "round_id required" }, { status: 400 });
  }
  if (!isValidEventKind(body.kind)) {
    return NextResponse.json({ error: "invalid kind" }, { status: 400 });
  }

  // Round must exist and be active. Daemon should never report against
  // a closed round (would happen during the brief window of a forced
  // reset before the daemon picks up the new round_id from .env).
  const [round] = await db
    .select({ id: kothRounds.id, status: kothRounds.status })
    .from(kothRounds)
    .where(eq(kothRounds.id, body.round_id))
    .limit(1);

  if (!round) {
    return NextResponse.json({ error: "unknown round" }, { status: 404 });
  }
  if (round.status !== "active") {
    return NextResponse.json(
      { error: `round ${body.round_id} is ${round.status}` },
      { status: 409 },
    );
  }

  const [actorUserId, targetUserId] = await Promise.all([
    resolveSlotToUserId(body.actor_slot),
    resolveSlotToUserId(body.target_slot),
  ]);

  // Backwards-compat slug normalization. Players who remember the
  // pre-0021 codenames (l7-suid, l8-suid, l17-redis) still pass
  // those to crown-claim. Without this map their event lands with
  // an unknown slug + spuriously awards a first-discovery bonus.
  // Rewrite here so downstream code (catalog resolve, event INSERT,
  // Discord embed) sees the canonical slug only.
  const SLUG_ALIASES: Record<string, string> = {
    "l7-suid": "suid-python-wrapper",
    "l8-suid": "suid-shell-injection",
    "l17-redis": "redis-config-set-dir",
  };
  if (body.exploit_path && SLUG_ALIASES[body.exploit_path]) {
    body.exploit_path = SLUG_ALIASES[body.exploit_path];
  }

  // Phase 2: resolve the path slug (if any) to its catalog id. Used
  // for path_event bookkeeping and value snapshotting. Core path slugs
  // (suid-python-wrapper / suid-shell-injection / redis-config-set-dir)
  // are seeded in koth_paths via drizzle/0016 + renamed in 0021.
  const path = await resolvePathBySlug(body.exploit_path ?? null);
  const valueSnapshot = path
    ? await snapshotForExploit(body.round_id, path)
    : null;

  // Stash the unresolved slot strings + path snapshot in raw_meta so
  // we can debug attribution misses and so scoring has access to the
  // snapshot without a JOIN.
  const meta: Record<string, unknown> = {
    ...(body.raw_meta ?? {}),
    actor_slot: body.actor_slot ?? null,
    target_slot: body.target_slot ?? null,
  };
  if (path && valueSnapshot != null) {
    meta.path_id = path.id;
    meta.path_slug = path.slug;
    meta.path_kind = path.kind;
    meta.value_snapshot = valueSnapshot;
  }

  // Guard Lockdown enforcement (Phase B). If the Guard has placed an
  // active lockdown on this primitive in this round, rewrite the
  // event kind so scoring and path-exploited bookkeeping skip it
  // entirely. The koth_events row still lands as `crown_blocked` so
  // we have an audit trail and the guard sees their impact counter
  // tick up.
  let effectiveKind = body.kind;
  let blockedByLockdownId: string | null = null;
  if (body.kind === "crown_taken" && body.exploit_path) {
    const ld = await isPathLockedDown(body.round_id, body.exploit_path);
    if (ld.locked && ld.lockdownId) {
      effectiveKind = "crown_blocked";
      blockedByLockdownId = ld.lockdownId;
      meta.blocked_by_lockdown_id = ld.lockdownId;
      meta.blocked_path = body.exploit_path;
    }
  }

  // Discoverer bonus — first crown via a slug not in the catalog
  // gets a one-time +50. Awarded ONCE per slug (globally, not per
  // user). The bonus lands as a value_snapshot on the koth_events
  // row so the existing scoring path picks it up. Skipped on
  // path_activated/escalation_pending etc. (we want the bonus on
  // the crown grab itself).
  let discoveryBonus = 0;
  if (
    body.kind === "crown_taken" &&
    !path &&
    body.exploit_path &&
    actorUserId
  ) {
    discoveryBonus = await maybeAwardFirstDiscovery({
      userId: actorUserId,
      roundId: body.round_id,
      slug: body.exploit_path,
    });
    if (discoveryBonus > 0) {
      meta.value_snapshot = discoveryBonus;
      meta.first_discovery = true;
      meta.path_slug = body.exploit_path;
    }
  }

  // ─── Phase 2 — Path-event side effects ──────────────────────
  // Some kinds are pure path bookkeeping (no koth_events row needed):
  //   path_activated, escalation_pending, path_closed
  // Others go to both tables (crown_taken with a path slug =
  // path_exploited bookkeeping + koth_events row for the timeline /
  // kill feed).
  if (path) {
    if (body.kind === "path_activated") {
      await recordPathEvent({
        roundId: body.round_id,
        pathId: path.id,
        kind: "activated",
        slot: body.actor_slot ?? null,
        valueSnapshot: path.baseValue,
        rawMeta: body.raw_meta ?? null,
      });
    } else if (body.kind === "escalation_pending") {
      await recordPathEvent({
        roundId: body.round_id,
        pathId: path.id,
        kind: "pending",
        slot: body.actor_slot ?? null,
        valueSnapshot: path.baseValue,
        rawMeta: body.raw_meta ?? null,
      });
    } else if (body.kind === "path_closed") {
      await recordPathEvent({
        roundId: body.round_id,
        pathId: path.id,
        kind: "closed",
        slot: body.actor_slot ?? null,
        valueSnapshot: null,
        rawMeta: body.raw_meta ?? null,
      });
    } else if (
      effectiveKind === "crown_taken" ||
      effectiveKind === "path_exploited" ||
      effectiveKind === "dethroned"
    ) {
      await recordPathEvent({
        roundId: body.round_id,
        pathId: path.id,
        kind: "exploited",
        slot: body.actor_slot ?? null,
        valueSnapshot,
        rawMeta: {
          ...(body.raw_meta ?? {}),
          actor_user_id: actorUserId,
          target_user_id: targetUserId,
        },
      });
    } else if (body.kind === "path_patched_attributed") {
      await recordPathEvent({
        roundId: body.round_id,
        pathId: path.id,
        kind: "closed",
        slot: body.actor_slot ?? null,
        valueSnapshot,
        rawMeta: {
          ...(body.raw_meta ?? {}),
          path_patched_attributed: true,
          actor_user_id: actorUserId,
        },
      });
    }
  }

  // ─── koth_events insert ─────────────────────────────────────
  // Some Phase 2 kinds are purely path bookkeeping and don't belong on
  // the main timeline (escalation_pending and path_closed are surfaced
  // separately by the path HUD, not by the kill-feed). Skip their
  // koth_events insert to keep the timeline clean.
  const SKIP_TIMELINE = new Set(["escalation_pending", "path_closed"]);
  let insertedId: number | null = null;
  let insertedAt = new Date();
  if (!SKIP_TIMELINE.has(body.kind)) {
    const [inserted] = await db
      .insert(kothEvents)
      .values({
        roundId: body.round_id,
        kind: effectiveKind,
        actorUserId: actorUserId,
        targetUserId: targetUserId,
        exploitPath: body.exploit_path ?? null,
        pointsDelta: 0,
        rawMeta: meta,
      })
      .returning({ id: kothEvents.id, occurredAt: kothEvents.occurredAt });
    insertedId = inserted.id;
    insertedAt = inserted.occurredAt;
  }

  // Bump the lockdown's blocked_count so the guard sees their impact
  // in the UI. Best-effort — never fail the request on this.
  if (blockedByLockdownId) {
    try {
      await recordLockdownBlock(blockedByLockdownId);
    } catch {
      // ignore
    }
  }

  // Engage the round timer on the FIRST crown_taken in this round.
  // engaged_at IS NULL until someone actually plays — keeps the
  // 30-min clock from ticking into an empty arena. The IS NULL guard
  // makes this idempotent on every subsequent crown change. Blocked
  // crown attempts do NOT engage the timer.
  if (effectiveKind === "crown_taken") {
    try {
      await db
        .update(kothRounds)
        .set({ engagedAt: sql`now()` })
        .where(
          and(eq(kothRounds.id, body.round_id), isNull(kothRounds.engagedAt)),
        );
    } catch {
      // best-effort — engagement timer is recoverable from event log
    }
  }

  // Tutorial tracking (Wave D2 — minimal): mark the actor's first
  // crown_taken event as their tutorial completion. Cheap UPDATE
  // guarded on tutorial_completed_at IS NULL so it only fires once.
  // Blocked attempts don't count toward tutorial completion.
  if (effectiveKind === "crown_taken" && actorUserId) {
    try {
      await db
        .update(kothSshKeys)
        .set({ tutorialCompletedAt: sql`now()` })
        .where(
          and(
            eq(kothSshKeys.userId, actorUserId),
            isNull(kothSshKeys.tutorialCompletedAt),
          ),
        );
    } catch {
      // best-effort — tutorial flag is cosmetic
    }

    // First-time honors — permanent profile records. Each is a single
    // existence-check + insert; deliberately not awaited as a batch so
    // a glitch on one doesn't block the others. Wrapped in catch so
    // the daemon's POST still returns 200 cleanly.
    maybeAwardFirstTime({
      userId: actorUserId,
      kind: "first_crown",
      roundId: body.round_id,
      metadata: {
        path_slug: path?.slug ?? body.exploit_path ?? null,
        was_dethrone: targetUserId !== null,
      },
    }).catch(() => {});
    if (targetUserId !== null) {
      maybeAwardFirstTime({
        userId: actorUserId,
        kind: "first_dethrone",
        roundId: body.round_id,
        metadata: {
          path_slug: path?.slug ?? body.exploit_path ?? null,
          target_user_id: targetUserId,
        },
      }).catch(() => {});
    }
    if (path) {
      maybeAwardFirstTime({
        userId: actorUserId,
        kind: "first_path_kill",
        roundId: body.round_id,
        metadata: {
          path_slug: path.slug,
          path_kind: path.kind,
        },
      }).catch(() => {});
    }
  }

  // Look up display names for the Discord post. Two lookups; both
  // fire-and-forget so the daemon still gets its 200 fast even if
  // Discord/DB hiccups.
  let actorUsername: string | null = null;
  let targetUsername: string | null = null;
  if (actorUserId) {
    const [u] = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, actorUserId))
      .limit(1);
    actorUsername = u?.username ?? null;
  }
  if (targetUserId) {
    const [u] = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);
    targetUsername = u?.username ?? null;
  }

  // ─── Phase 2.5 — Anti-DoS enforcement ───────────────────────
  // The in-arena watchdog POSTs dos_violation when it detects an
  // anti-game pattern (kill-on-login, fork bomb, sshd kill, etc.).
  // Two side-effects:
  //   1. Force-close the round so the offender forfeits the hold.
  //   2. Post a red Discord embed naming the pattern.
  //
  // Container force-recreate (from reset-arena.sh on the next cron
  // tick) wipes whatever the offender did inside the box. Round
  // forfeit + reset is the punishment.
  //
  // We deliberately do NOT auto-lock the offender's SSH key here.
  // Earlier design used dos_locked_until = now+24h, but in practice:
  //   - false positives cost is catastrophic (we hit one already)
  //   - actor_slot is often null when watchdog fires (vacant crown
  //     during sshd_kill etc.), so the lock didn't actually fire in
  //     the field — security theater
  //   - forfeit + reset already removes the incentive to repeat
  // The `dos_locked_until` column stays in koth_ssh_keys for manual
  // admin override against repeat offenders.
  if (body.kind === "dos_violation") {
    const pattern =
      (body.raw_meta?.pattern as string | undefined) ?? "unknown";
    try {
      await db
        .update(kothRounds)
        .set({
          status: "completed",
          endedAt: sql`now()`,
          resetReason: `dos_violation:${pattern}`,
        })
        .where(
          and(
            eq(kothRounds.id, body.round_id),
            eq(kothRounds.status, "active"),
          ),
        );
    } catch {
      // best-effort — reset-arena.sh will pick up the close on next tick
    }
    postKothDosViolationToDiscord({
      offenderUsername: actorUsername,
      victimUsername: targetUsername,
      pattern,
      occurredAt: insertedAt,
    });
    return NextResponse.json({ ok: true, event_id: insertedId });
  }

  postKothEventToDiscord({
    kind: body.kind,
    actorUsername,
    actorSlot: body.actor_slot ?? null,
    targetUsername,
    exploitPath: body.exploit_path ?? null,
    pathName: path?.name ?? null,
    occurredAt: insertedAt,
    // When discoveryBonus fired, value_snapshot is already 50 in meta;
    // pass it through so the crown embed renders "+50 pt".
    valueSnapshot: discoveryBonus > 0 ? discoveryBonus : valueSnapshot,
  });

  // Second embed for the discoverer — a star card making the moment
  // legible to everyone in the channel.
  if (discoveryBonus > 0 && body.exploit_path) {
    postKothFirstDiscoveryToDiscord({
      actorUsername,
      slug: body.exploit_path,
      bonus: discoveryBonus,
      occurredAt: insertedAt,
    });
  }

  return NextResponse.json({ ok: true, event_id: insertedId });
}
