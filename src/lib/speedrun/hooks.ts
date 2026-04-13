import { and, desc, eq, isNull } from "drizzle-orm";
import { speedrunRuns, type SpeedrunRun } from "@/lib/db/schema";
import { minSecondsForTrack } from "./thresholds";

export function isSuspicious(args: {
  totalSeconds: number;
  minSeconds: number;
}): boolean {
  return args.totalSeconds < args.minSeconds;
}

async function getDb() {
  const { db } = await import("@/lib/db/client");
  return db;
}

export async function findOpenRun(
  userId: string,
  trackId: string
): Promise<SpeedrunRun | undefined> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(speedrunRuns)
    .where(
      and(
        eq(speedrunRuns.userId, userId),
        eq(speedrunRuns.trackId, trackId),
        isNull(speedrunRuns.finishedAt)
      )
    )
    .orderBy(desc(speedrunRuns.startedAt))
    .limit(1);
  return row;
}

export async function startRun(
  userId: string,
  trackId: string,
  startedAt: Date = new Date()
): Promise<SpeedrunRun> {
  const db = await getDb();
  const [row] = await db
    .insert(speedrunRuns)
    .values({
      userId,
      trackId,
      startedAt,
    })
    .returning();
  return row;
}

export async function closeRun(
  runId: string,
  finishedAt: Date,
  trackSlug: string
): Promise<SpeedrunRun> {
  const db = await getDb();
  const [existing] = await db
    .select()
    .from(speedrunRuns)
    .where(eq(speedrunRuns.id, runId))
    .limit(1);
  if (!existing) {
    throw new Error(`speedrun run not found: ${runId}`);
  }
  const totalSeconds = Math.floor(
    (finishedAt.getTime() - existing.startedAt.getTime()) / 1000
  );
  const suspicious = isSuspicious({
    totalSeconds,
    minSeconds: minSecondsForTrack(trackSlug),
  });
  const [updated] = await db
    .update(speedrunRuns)
    .set({
      finishedAt,
      totalSeconds,
      isSuspicious: suspicious,
    })
    .where(eq(speedrunRuns.id, runId))
    .returning();
  return updated;
}
