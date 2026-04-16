import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sponsors } from "@/lib/sponsors/schema";
import { users } from "@/lib/db/schema";
import { computeLongevityPin, TIER_ORDER, type TierCode, type LongevityPin } from "./tiers";

export type PublicSponsor = {
  username: string | null;
  tierCode: TierCode;
  source: string;
  longevityPin: LongevityPin | null;
  dedication: string | null;
  startedAt: Date;
  visibility: string;
};

export type TierGroup = {
  tier: TierCode;
  sponsors: PublicSponsor[];
  anonymousCount: number;
};

export async function getPublicSponsors(): Promise<TierGroup[]> {
  const now = new Date();
  const rows = await db
    .select({
      username: users.username,
      tierCode: sponsors.tierCode,
      source: sponsors.source,
      visibility: sponsors.visibility,
      dedication: sponsors.dedication,
      startedAt: sponsors.startedAt,
    })
    .from(sponsors)
    .leftJoin(users, eq(users.id, sponsors.userId))
    .where(isNull(sponsors.endedAt))
    .orderBy(asc(sponsors.startedAt));

  const groups: Record<TierCode, { visible: PublicSponsor[]; anonymousCount: number }> = {
    architect: { visible: [], anonymousCount: 0 },
    phantom: { visible: [], anonymousCount: 0 },
    operator: { visible: [], anonymousCount: 0 },
    recruit: { visible: [], anonymousCount: 0 },
  };

  for (const row of rows) {
    const tier = row.tierCode as TierCode;
    const group = groups[tier];
    if (!group) continue;

    if (row.visibility === "hidden") continue;

    if (row.visibility === "anonymous") {
      group.anonymousCount++;
      continue;
    }

    group.visible.push({
      username: row.visibility === "username_only" || row.visibility === "public" ? row.username : null,
      tierCode: tier,
      source: row.source,
      longevityPin: computeLongevityPin(row.startedAt, now),
      dedication: row.visibility === "public" ? row.dedication : null,
      startedAt: row.startedAt,
      visibility: row.visibility,
    });
  }

  return TIER_ORDER.map((tier) => ({
    tier,
    sponsors: groups[tier].visible,
    anonymousCount: groups[tier].anonymousCount,
  }));
}

export async function getSponsorByExternalId(
  source: string,
  externalId: string,
) {
  const [row] = await db
    .select()
    .from(sponsors)
    .where(and(eq(sponsors.source, source), eq(sponsors.externalId, externalId)))
    .limit(1);
  return row ?? null;
}

export async function getSponsorByClaimToken(token: string) {
  const [row] = await db
    .select()
    .from(sponsors)
    .where(eq(sponsors.claimToken, token))
    .limit(1);
  return row ?? null;
}
