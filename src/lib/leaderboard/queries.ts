import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { liveOpsCounts, submissions, users } from "@/lib/db/schema";

export type LeaderRow = {
  userId: string;
  username: string;
  points: number;
  solved: number;
  isHallOfFame: boolean;
};

export async function getGlobalTop(limit: number): Promise<LeaderRow[]> {
  const rows = await db
    .select({
      userId: users.id,
      username: users.username,
      isHallOfFame: users.isHallOfFame,
      points: sql<number>`coalesce(sum(${submissions.pointsAwarded}), 0)::int`,
      solved: sql<number>`count(${submissions.id})::int`,
    })
    .from(users)
    .leftJoin(submissions, eq(submissions.userId, users.id))
    .groupBy(users.id, users.username, users.isHallOfFame)
    .having(sql`count(${submissions.id}) > 0`)
    .orderBy(desc(sql`sum(${submissions.pointsAwarded})`))
    .limit(limit);
  return rows.map((r) => ({
    userId: r.userId,
    username: r.username,
    isHallOfFame: r.isHallOfFame ?? false,
    points: Number(r.points),
    solved: Number(r.solved),
  }));
}

const WEB_LIVE_WINDOW = sql`interval '5 minutes'`;
const SSH_LIVE_WINDOW = sql`interval '2 minutes'`;

export async function getLiveStats(): Promise<{
  operatives: number;
  completionsToday: number;
}> {
  const [webRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(users)
    .where(sql`${users.lastSeenAt} > now() - ${WEB_LIVE_WINDOW}`);
  const [sshRow] = await db
    .select({ c: sql<number>`coalesce(sum(${liveOpsCounts.count}), 0)::int` })
    .from(liveOpsCounts)
    .where(sql`${liveOpsCounts.updatedAt} > now() - ${SSH_LIVE_WINDOW}`);
  const [todayCount] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(submissions)
    .where(sql`${submissions.submittedAt} >= now() - interval '24 hours'`);
  return {
    operatives: Number(webRow?.c ?? 0) + Number(sshRow?.c ?? 0),
    completionsToday: Number(todayCount?.c ?? 0),
  };
}
