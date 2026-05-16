import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
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

// Aggregates via 3 independent queries + JS merge. We avoided the
// natural correlated-subquery pattern because the outer FROM aliases
// `users` and any inner `JOIN users` shadows the outer correlation —
// PostgreSQL silently returns zero counts instead of failing loudly.
export async function listFeaturedAuthors(
  opts: { userId?: string | null } = {},
): Promise<FeaturedAuthorView[]> {
  const authors = await db
    .select({
      id: users.id,
      username: users.username,
      siteUrl: users.siteUrl,
      bio: users.authorBio,
      isCurator: users.isCurator,
    })
    .from(users)
    .where(and(eq(users.isFeaturedAuthor, true), isNotNull(users.siteUrl)));

  if (authors.length === 0) return [];
  const authorIds = authors.map((a) => a.id);

  const starRows = await db
    .select({
      authorId: authorStars.authorId,
      isCurator: users.isCurator,
      cnt: sql<number>`count(*)::int`.as("cnt"),
    })
    .from(authorStars)
    .innerJoin(users, eq(users.id, authorStars.userId))
    .where(inArray(authorStars.authorId, authorIds))
    .groupBy(authorStars.authorId, users.isCurator);

  const myStarred = opts.userId
    ? new Set(
        (
          await db
            .select({ authorId: authorStars.authorId })
            .from(authorStars)
            .where(
              and(
                eq(authorStars.userId, opts.userId),
                inArray(authorStars.authorId, authorIds),
              ),
            )
        ).map((r) => r.authorId),
      )
    : new Set<string>();

  return authors
    .map((a) => {
      const mine = starRows.filter((r) => r.authorId === a.id);
      const regular = Number(mine.find((r) => !r.isCurator)?.cnt ?? 0);
      const curator = Number(mine.find((r) => r.isCurator)?.cnt ?? 0);
      return {
        id: a.id,
        username: a.username,
        siteUrl: a.siteUrl as string,
        bio: a.bio,
        isCurator: a.isCurator,
        regularStars: regular,
        curatorStars: curator,
        weightedScore: computeWeightedScore(regular, curator),
        isFeatured: curator > 0,
        userHasStarred: myStarred.has(a.id),
      };
    })
    .sort((a, b) => a.username.localeCompare(b.username));
}

export async function getFeaturedAuthorByUsername(
  username: string,
  opts: { userId?: string | null } = {},
): Promise<FeaturedAuthorView | null> {
  const all = await listFeaturedAuthors(opts);
  return all.find((a) => a.username === username) ?? null;
}
