import { and, eq, ilike } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { badges, tracks, users } from "@/lib/db/schema";
import type { BadgeKind } from "@/lib/badges/types";

export type TrackCertificate = {
  username: string;
  userId: string;
  trackId: string;
  trackName: string;
  trackSlug: string;
  awardedAt: Date;
};

// Backwards-compat alias — existing imports of GhostCertificate keep working.
export type GhostCertificate = TrackCertificate;

const TRACK_BADGE_KIND: Record<string, BadgeKind> = {
  ghost: "ghost_graduate",
  phantom: "phantom_master",
};

export async function getTrackCertificate(
  username: string,
  trackSlug: string,
): Promise<TrackCertificate | null> {
  const kind = TRACK_BADGE_KIND[trackSlug];
  if (!kind) return null;

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
        eq(badges.kind, kind),
        eq(tracks.slug, trackSlug),
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

// Thin backwards-compat wrapper — keeps existing ghost-specific callers working.
export async function getGhostCertificate(
  username: string,
): Promise<GhostCertificate | null> {
  return getTrackCertificate(username, "ghost");
}
