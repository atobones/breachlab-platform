import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { authorStars, users } from "@/lib/db/schema";
import { computeWeightedScore } from "@/lib/community-writeups";

export type FeaturedAuthorView = {
  id: string;
  username: string;
  siteUrl: string;
  bio: string | null;
  isCurator: boolean;
  regularStars: number;
  curatorStars: number;
  weightedScore: number;
  isFeatured: boolean;
  userHasStarred: boolean;
};

export async function listFeaturedAuthors(
  opts: { userId?: string | null } = {},
): Promise<FeaturedAuthorView[]> {
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      siteUrl: users.siteUrl,
      bio: users.authorBio,
      isCurator: users.isCurator,
      regularStars: sql<number>`
        coalesce((
          select count(*) from ${authorStars} s
          inner join ${users} u2 on u2.id = s.user_id
          where s.author_id = ${users.id} and u2.is_curator = false
        ), 0)`.as("regular_stars"),
      curatorStars: sql<number>`
        coalesce((
          select count(*) from ${authorStars} s
          inner join ${users} u2 on u2.id = s.user_id
          where s.author_id = ${users.id} and u2.is_curator = true
        ), 0)`.as("curator_stars"),
      userHasStarred: opts.userId
        ? sql<boolean>`
            exists(
              select 1 from ${authorStars} s
              where s.author_id = ${users.id} and s.user_id = ${opts.userId}
            )`.as("user_has_starred")
        : sql<boolean>`false`.as("user_has_starred"),
    })
    .from(users)
    .where(and(eq(users.isFeaturedAuthor, true), isNotNull(users.siteUrl)));

  return rows
    .map((r) => {
      const regular = Number(r.regularStars);
      const curator = Number(r.curatorStars);
      return {
        id: r.id,
        username: r.username,
        siteUrl: r.siteUrl as string,
        bio: r.bio,
        isCurator: r.isCurator,
        regularStars: regular,
        curatorStars: curator,
        weightedScore: computeWeightedScore(regular, curator),
        isFeatured: curator > 0,
        userHasStarred: Boolean(r.userHasStarred),
      };
    })
    .sort((a, b) => b.weightedScore - a.weightedScore);
}
