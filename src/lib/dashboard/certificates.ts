import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { badges, tracks } from "@/lib/db/schema";

export type EarnedCertificate = {
  trackSlug: string;
  trackName: string;
  trackId: string;
  awardedAt: Date;
  badgeKind: "ghost_graduate" | "phantom_master";
};

/**
 * Fetches every certification-style badge the user has earned.
 * Used by the dashboard Operator Record section.
 */
export async function getEarnedCertificates(
  userId: string,
): Promise<EarnedCertificate[]> {
  const rows = await db
    .select({
      awardedAt: badges.awardedAt,
      kind: badges.kind,
      trackId: tracks.id,
      trackSlug: tracks.slug,
      trackName: tracks.name,
    })
    .from(badges)
    .innerJoin(tracks, eq(tracks.id, badges.refId))
    .where(
      and(
        eq(badges.userId, userId),
        inArray(badges.kind, ["ghost_graduate", "phantom_master"]),
      ),
    );

  return rows.map((r) => ({
    trackSlug: r.trackSlug,
    trackName: r.trackName,
    trackId: r.trackId,
    awardedAt: r.awardedAt,
    badgeKind: r.kind as EarnedCertificate["badgeKind"],
  }));
}
