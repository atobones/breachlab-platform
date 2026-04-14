import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { badges, tracks, users } from "@/lib/db/schema";
import type { BadgeKind } from "@/lib/badges/types";

export type GraduateRow = {
  username: string;
  awardedAt: Date;
};

export async function getTrackGraduates(
  trackSlug: string,
  kind: BadgeKind,
): Promise<GraduateRow[]> {
  const rows = await db
    .select({
      username: users.username,
      awardedAt: badges.awardedAt,
    })
    .from(badges)
    .innerJoin(users, eq(users.id, badges.userId))
    .innerJoin(tracks, eq(tracks.id, badges.refId))
    .where(and(eq(tracks.slug, trackSlug), eq(badges.kind, kind)))
    .orderBy(asc(badges.awardedAt));

  return rows
    .filter((r) => r.awardedAt !== null)
    .map((r) => ({
      username: r.username,
      awardedAt: r.awardedAt as Date,
    }));
}
