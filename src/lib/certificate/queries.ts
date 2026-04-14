import { and, eq, ilike } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { badges, tracks, users } from "@/lib/db/schema";

export type GhostCertificate = {
  username: string;
  userId: string;
  trackId: string;
  trackName: string;
  trackSlug: string;
  awardedAt: Date;
};

export async function getGhostCertificate(
  username: string,
): Promise<GhostCertificate | null> {
  const [user] = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(ilike(users.username, username))
    .limit(1);
  if (!user) return null;

  const [row] = await db
    .select({
      awardedAt: badges.awardedAt,
      trackId: tracks.id,
      trackName: tracks.name,
      trackSlug: tracks.slug,
    })
    .from(badges)
    .innerJoin(tracks, eq(tracks.id, badges.refId))
    .where(
      and(
        eq(badges.userId, user.id),
        eq(badges.kind, "ghost_graduate"),
        eq(tracks.slug, "ghost"),
      ),
    )
    .limit(1);

  if (!row) return null;

  return {
    username: user.username,
    userId: user.id,
    trackId: row.trackId,
    trackName: row.trackName,
    trackSlug: row.trackSlug,
    awardedAt: row.awardedAt,
  };
}
