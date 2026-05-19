/**
 * Backfill koth_replays.kind = 'crown_moment' for existing session_close
 * rows whose owning user took a crown_taken inside the cast's time
 * window. Replay uploads have always hardcoded kind=session_close —
 * the crown_moment classification was never wired, so the archive
 * filter rendered empty.
 *
 * Strategy (mirrors the upload-path logic in
 * src/app/api/koth/replay/route.ts):
 *   - candidate = kothReplays WHERE kind='session_close' AND user_id IS NOT NULL
 *   - For each candidate, find kothEvents WHERE
 *       kind='crown_taken' AND actor_user_id=replay.user_id
 *       AND round_id=replay.round_id
 *       AND occurred_at BETWEEN (recorded_at - duration - 5s) AND recorded_at
 *   - If a match exists, UPDATE replay SET kind='crown_moment',
 *     linked_event_id = match.id (only if currently NULL).
 *
 * When duration_sec is NULL we derive it from the asciicast first
 * (same helper the upload path uses), so legacy rows missing the
 * column still get classified.
 *
 * Mode:
 *   DRY_RUN=1 npx tsx scripts/backfill-koth-crown-moments.ts   # preview
 *   APPLY=1   npx tsx scripts/backfill-koth-crown-moments.ts   # write
 */
import { and, desc, eq, gte, isNull, lte } from "drizzle-orm";
import { db } from "../src/lib/db/client";
import { kothEvents, kothReplays } from "../src/lib/db/schema";
import { deriveDurationFromCast } from "../src/lib/koth/replays";

const PRE_SESSION_PAD_SEC = 5;
const APPLY = process.env.APPLY === "1";
const DRY = process.env.DRY_RUN === "1" || !APPLY;

async function main() {
  const candidates = await db
    .select({
      id: kothReplays.id,
      roundId: kothReplays.roundId,
      userId: kothReplays.userId,
      actorSlot: kothReplays.actorSlot,
      kind: kothReplays.kind,
      durationSec: kothReplays.durationSec,
      asciicast: kothReplays.asciicast,
      linkedEventId: kothReplays.linkedEventId,
      recordedAt: kothReplays.recordedAt,
    })
    .from(kothReplays)
    .where(eq(kothReplays.kind, "session_close"));

  console.log(`[backfill] mode=${DRY ? "DRY_RUN" : "APPLY"} candidates=${candidates.length}`);

  let promoted = 0;
  let skippedNoUser = 0;
  let skippedNoCrown = 0;

  for (const r of candidates) {
    if (!r.userId) {
      skippedNoUser++;
      continue;
    }
    let duration = r.durationSec;
    if (duration == null) {
      duration = deriveDurationFromCast(r.asciicast);
    }
    if (duration == null || duration <= 0) {
      // Can't bound the search window — skip rather than over-classify.
      skippedNoCrown++;
      continue;
    }
    const start = new Date(
      r.recordedAt.getTime() - (duration + PRE_SESSION_PAD_SEC) * 1000,
    );
    const match = await db
      .select({ id: kothEvents.id, occurredAt: kothEvents.occurredAt })
      .from(kothEvents)
      .where(
        and(
          eq(kothEvents.kind, "crown_taken"),
          eq(kothEvents.actorUserId, r.userId),
          eq(kothEvents.roundId, r.roundId),
          gte(kothEvents.occurredAt, start),
          lte(kothEvents.occurredAt, r.recordedAt),
        ),
      )
      .orderBy(desc(kothEvents.occurredAt))
      .limit(1);
    if (match.length === 0) {
      skippedNoCrown++;
      continue;
    }
    promoted++;
    console.log(
      `[backfill] replay=${r.id} slot=${r.actorSlot} round=${r.roundId.slice(0, 8)} ` +
        `→ crown_moment (event=${match[0].id} at ${match[0].occurredAt.toISOString()}, ` +
        `recorded=${r.recordedAt.toISOString()}, duration=${duration}s)`,
    );
    if (!DRY) {
      const updates: { kind: "crown_moment"; linkedEventId?: number } = {
        kind: "crown_moment",
      };
      if (r.linkedEventId == null) {
        updates.linkedEventId = match[0].id;
      }
      await db
        .update(kothReplays)
        .set(updates)
        .where(
          and(
            eq(kothReplays.id, r.id),
            // Re-check kind to avoid stomping a concurrent reclassify.
            eq(kothReplays.kind, "session_close"),
          ),
        );
      // Also backfill duration_sec when we derived it.
      if (r.durationSec == null) {
        await db
          .update(kothReplays)
          .set({ durationSec: duration })
          .where(and(eq(kothReplays.id, r.id), isNull(kothReplays.durationSec)));
      }
    }
  }

  console.log(
    `[backfill] done. promoted=${promoted} skip_no_user=${skippedNoUser} skip_no_crown=${skippedNoCrown}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
