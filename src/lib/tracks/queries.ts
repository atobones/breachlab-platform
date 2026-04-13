import { eq, asc, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { tracks, levels } from "@/lib/db/schema";

export async function getTrackBySlug(slug: string) {
  const [row] = await db
    .select()
    .from(tracks)
    .where(eq(tracks.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function getLevelsForTrack(trackId: string) {
  return db
    .select()
    .from(levels)
    .where(eq(levels.trackId, trackId))
    .orderBy(asc(levels.idx));
}

export async function getLevelByTrackAndIdx(trackId: string, idx: number) {
  const [row] = await db
    .select()
    .from(levels)
    .where(and(eq(levels.trackId, trackId), eq(levels.idx, idx)))
    .limit(1);
  return row ?? null;
}
