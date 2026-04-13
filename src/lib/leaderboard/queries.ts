import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { submissions, users } from "@/lib/db/schema";

export type LeaderRow = {
  userId: string;
  username: string;
  points: number;
  solved: number;
};

export async function getGlobalTop(limit: number): Promise<LeaderRow[]> {
  const rows = await db
    .select({
      userId: users.id,
      username: users.username,
      points: sql<number>`coalesce(sum(${submissions.pointsAwarded}), 0)::int`,
      solved: sql<number>`count(${submissions.id})::int`,
    })
    .from(users)
    .leftJoin(submissions, eq(submissions.userId, users.id))
    .groupBy(users.id, users.username)
    .having(sql`count(${submissions.id}) > 0`)
    .orderBy(desc(sql`sum(${submissions.pointsAwarded})`))
    .limit(limit);
  return rows.map((r) => ({
    userId: r.userId,
    username: r.username,
    points: Number(r.points),
    solved: Number(r.solved),
  }));
}

export async function getLiveStats(): Promise<{
  operatives: number;
  completionsToday: number;
}> {
  const [usersCount] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(users);
  const [todayCount] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(submissions)
    .where(sql`${submissions.submittedAt} >= now() - interval '24 hours'`);
  return {
    operatives: Number(usersCount?.c ?? 0),
    completionsToday: Number(todayCount?.c ?? 0),
  };
}
