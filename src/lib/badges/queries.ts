import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { badges, users, levels, tracks } from "@/lib/db/schema";

export type FirstBloodRow = {
  levelId: string;
  levelIdx: number;
  levelTitle: string;
  trackSlug: string;
  trackName: string;
  username: string;
  awardedAt: Date;
};

export async function getFirstBloods(): Promise<FirstBloodRow[]> {
  const rows = await db
    .select({
      levelId: levels.id,
      levelIdx: levels.idx,
      levelTitle: levels.title,
      trackSlug: tracks.slug,
      trackName: tracks.name,
      username: users.username,
      awardedAt: badges.awardedAt,
    })
    .from(badges)
    .innerJoin(levels, eq(levels.id, badges.refId))
    .innerJoin(tracks, eq(tracks.id, levels.trackId))
    .innerJoin(users, eq(users.id, badges.userId))
    .where(eq(badges.kind, "first_blood"))
    .orderBy(desc(badges.awardedAt));
  return rows;
}

export async function getFirstBloodByLevel(): Promise<
  Map<string, { username: string; awardedAt: Date }>
> {
  const rows = await db
    .select({
      levelId: levels.id,
      username: users.username,
      awardedAt: badges.awardedAt,
    })
    .from(badges)
    .innerJoin(levels, eq(levels.id, badges.refId))
    .innerJoin(users, eq(users.id, badges.userId))
    .where(eq(badges.kind, "first_blood"));
  const map = new Map<string, { username: string; awardedAt: Date }>();
  for (const r of rows) {
    map.set(r.levelId, { username: r.username, awardedAt: r.awardedAt });
  }
  return map;
}

export async function getBadgesForUser(userId: string) {
  return db
    .select()
    .from(badges)
    .where(eq(badges.userId, userId))
    .orderBy(desc(badges.awardedAt));
}
