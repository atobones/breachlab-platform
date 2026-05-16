import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, writeups, writeupStars } from "@/lib/db/schema";

export type CommunityWriteupView = {
  id: string;
  trackSlug: string;
  levelIdx: number;
  title: string;
  brief: string;
  externalUrl: string;
  author: {
    id: string;
    username: string;
    siteUrl: string | null;
    bio: string | null;
    isCurator: boolean;
  };
  regularStars: number;
  curatorStars: number;
  weightedScore: number;
  isFeatured: boolean;
  userHasStarred: boolean;
};

export function computeWeightedScore(regular: number, curator: number): number {
  return regular + 10 * curator;
}

const APPROVED = sql`${writeups.status} = 'approved'`;

// Pulls every approved writeup with author + aggregate star counts.
// Caller is responsible for gating which ones a given user can actually
// READ (use isCommunityWriteupReadable from writeup-access.ts).
export async function listCommunityWriteups(
  opts: { trackSlug?: string; levelIdx?: number; userId?: string | null } = {},
): Promise<CommunityWriteupView[]> {
  const rows = await db
    .select({
      id: writeups.id,
      trackSlug: writeups.trackSlug,
      levelIdx: writeups.levelIdx,
      title: writeups.title,
      brief: writeups.brief,
      externalUrl: writeups.externalUrl,
      authorId: users.id,
      authorUsername: users.username,
      authorSiteUrl: users.siteUrl,
      authorBio: users.authorBio,
      authorIsCurator: users.isCurator,
      regularStars: sql<number>`
        coalesce((
          select count(*) from ${writeupStars} s
          inner join ${users} u2 on u2.id = s.user_id
          where s.writeup_id = ${writeups.id} and u2.is_curator = false
        ), 0)`.as("regular_stars"),
      curatorStars: sql<number>`
        coalesce((
          select count(*) from ${writeupStars} s
          inner join ${users} u2 on u2.id = s.user_id
          where s.writeup_id = ${writeups.id} and u2.is_curator = true
        ), 0)`.as("curator_stars"),
      userHasStarred: opts.userId
        ? sql<boolean>`
            exists(
              select 1 from ${writeupStars} s
              where s.writeup_id = ${writeups.id} and s.user_id = ${opts.userId}
            )`.as("user_has_starred")
        : sql<boolean>`false`.as("user_has_starred"),
    })
    .from(writeups)
    .innerJoin(users, eq(writeups.authorId, users.id))
    .where(
      and(
        APPROVED,
        opts.trackSlug ? eq(writeups.trackSlug, opts.trackSlug) : undefined,
        opts.levelIdx !== undefined ? eq(writeups.levelIdx, opts.levelIdx) : undefined,
      ),
    );

  return rows
    .map((r) => {
      const regular = Number(r.regularStars);
      const curator = Number(r.curatorStars);
      return {
        id: r.id,
        trackSlug: r.trackSlug,
        levelIdx: r.levelIdx,
        title: r.title,
        brief: r.brief,
        externalUrl: r.externalUrl,
        author: {
          id: r.authorId,
          username: r.authorUsername,
          siteUrl: r.authorSiteUrl,
          bio: r.authorBio,
          isCurator: r.authorIsCurator,
        },
        regularStars: regular,
        curatorStars: curator,
        weightedScore: computeWeightedScore(regular, curator),
        isFeatured: curator > 0,
        userHasStarred: Boolean(r.userHasStarred),
      };
    })
    .sort((a, b) => {
      if (a.trackSlug !== b.trackSlug) return a.trackSlug.localeCompare(b.trackSlug);
      return a.levelIdx - b.levelIdx;
    });
}

export async function getCommunityWriteupById(
  id: string,
): Promise<CommunityWriteupView | null> {
  const list = await listCommunityWriteups({});
  return list.find((w) => w.id === id) ?? null;
}
