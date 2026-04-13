import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { tracks, levels } from "@/lib/db/schema";
import { hasUnlockedHiddenBonus } from "./bonus";

export type TrackWithLevels = {
  id: string;
  slug: string;
  name: string;
  status: string;
  bonusUnlocked: boolean;
  levels: {
    id: string;
    idx: number;
    title: string;
    hidden: boolean;
  }[];
};

export function isHiddenLevel(description: string | null | undefined): boolean {
  return (description ?? "").trim().startsWith("[HIDDEN]");
}

export async function getAllTracksWithLevels(
  userId?: string | null
): Promise<TrackWithLevels[]> {
  const trackRows = await db
    .select()
    .from(tracks)
    .orderBy(asc(tracks.orderIdx));
  const out: TrackWithLevels[] = [];
  for (const t of trackRows) {
    const lvls = await db
      .select({
        id: levels.id,
        idx: levels.idx,
        title: levels.title,
        description: levels.description,
      })
      .from(levels)
      .where(eq(levels.trackId, t.id))
      .orderBy(asc(levels.idx));
    const bonusUnlocked = await hasUnlockedHiddenBonus(userId, t.id);
    out.push({
      id: t.id,
      slug: t.slug,
      name: t.name,
      status: t.status,
      bonusUnlocked,
      levels: lvls.map((l) => ({
        id: l.id,
        idx: l.idx,
        title: l.title,
        hidden: isHiddenLevel(l.description),
      })),
    });
  }
  return out;
}
