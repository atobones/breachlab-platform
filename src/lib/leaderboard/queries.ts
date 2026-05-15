import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  levels,
  liveOpsCounts,
  submissions,
  tracks,
  users,
} from "@/lib/db/schema";

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

export type RecentSubmit = {
  username: string;
  isHallOfFame: boolean;
  trackSlug: string;
  trackName: string;
  levelIdx: number;
  pointsAwarded: number;
  submittedAt: Date;
};

export async function getRecentSubmits(limit: number): Promise<RecentSubmit[]> {
  const rows = await db
    .select({
      username: users.username,
      isHallOfFame: users.isHallOfFame,
      trackSlug: tracks.slug,
      trackName: tracks.name,
      levelIdx: levels.idx,
      pointsAwarded: submissions.pointsAwarded,
      submittedAt: submissions.submittedAt,
    })
    .from(submissions)
    .innerJoin(users, eq(users.id, submissions.userId))
    .innerJoin(levels, eq(levels.id, submissions.levelId))
    .innerJoin(tracks, eq(tracks.id, levels.trackId))
    .orderBy(desc(submissions.submittedAt))
    .limit(limit);
  return rows.map((r) => ({
    username: r.username,
    isHallOfFame: r.isHallOfFame ?? false,
    trackSlug: r.trackSlug,
    trackName: r.trackName,
    levelIdx: r.levelIdx,
    pointsAwarded: r.pointsAwarded,
    submittedAt: r.submittedAt,
  }));
}

export async function getHourlyHeartbeat(hours: number): Promise<number[]> {
  // Returns counts per hour bucket for the last <hours> hours, oldest first,
  // including empty buckets as zero so the sparkline width is stable.
  const rows = await db.execute<{ c: number }>(sql`
    WITH series AS (
      SELECT generate_series(
        date_trunc('hour', now()) - ((${hours}::int - 1) * interval '1 hour'),
        date_trunc('hour', now()),
        interval '1 hour'
      ) AS bucket
    )
    SELECT count(submissions.id)::int AS c
    FROM series s
    LEFT JOIN submissions
      ON date_trunc('hour', submissions.submitted_at) = s.bucket
    GROUP BY s.bucket
    ORDER BY s.bucket;
  `);
  return rows.map((r) => Number(r.c));
}

export type TopBurner = {
  username: string;
  isHallOfFame: boolean;
  count: number;
};

export type ConquestRow = {
  username: string;
  isHallOfFame: boolean;
  totalPoints: number;
  perTrack: Record<string, number>; // trackSlug → solved count
};

export type ConquestTrackTotal = {
  slug: string;
  name: string;
  status: string;
  total: number;
};

export async function getConquestWall(
  topN: number,
): Promise<{ tracks: ConquestTrackTotal[]; rows: ConquestRow[] }> {
  // Track denominators + ordering (LIVE tracks first, then PLANNED, by orderIdx).
  const trackRows = await db
    .select({
      slug: tracks.slug,
      name: tracks.name,
      status: tracks.status,
      orderIdx: tracks.orderIdx,
      total: sql<number>`count(${levels.id})::int`,
    })
    .from(tracks)
    .leftJoin(levels, eq(levels.trackId, tracks.id))
    .groupBy(tracks.id, tracks.slug, tracks.name, tracks.status, tracks.orderIdx)
    .orderBy(tracks.orderIdx);
  const trackList: ConquestTrackTotal[] = trackRows.map((t) => ({
    slug: t.slug,
    name: t.name,
    status: t.status,
    total: Number(t.total),
  }));

  // Top N operatives by total points, with per-track solve counts.
  const userRows = await db
    .select({
      userId: users.id,
      username: users.username,
      isHallOfFame: users.isHallOfFame,
      trackSlug: tracks.slug,
      solved: sql<number>`count(${submissions.id})::int`,
      totalPoints: sql<number>`coalesce(sum(${submissions.pointsAwarded}) over (partition by ${users.id}), 0)::int`,
    })
    .from(users)
    .innerJoin(submissions, eq(submissions.userId, users.id))
    .innerJoin(levels, eq(levels.id, submissions.levelId))
    .innerJoin(tracks, eq(tracks.id, levels.trackId))
    .where(
      sql`${users.id} IN (
        SELECT u.id FROM users u
        JOIN submissions s ON s.user_id = u.id
        GROUP BY u.id
        ORDER BY sum(s.points_awarded) DESC
        LIMIT ${topN}
      )`,
    )
    .groupBy(users.id, users.username, users.isHallOfFame, tracks.slug);

  const byUser = new Map<string, ConquestRow>();
  for (const r of userRows) {
    let row = byUser.get(r.userId);
    if (!row) {
      row = {
        username: r.username,
        isHallOfFame: r.isHallOfFame ?? false,
        totalPoints: Number(r.totalPoints),
        perTrack: {},
      };
      byUser.set(r.userId, row);
    }
    row.perTrack[r.trackSlug] = Number(r.solved);
  }
  const rows = Array.from(byUser.values()).sort(
    (a, b) => b.totalPoints - a.totalPoints,
  );
  return { tracks: trackList, rows };
}

export async function getTopBurners(limit: number): Promise<TopBurner[]> {
  const rows = await db
    .select({
      username: users.username,
      isHallOfFame: users.isHallOfFame,
      count: sql<number>`count(${submissions.id})::int`,
    })
    .from(submissions)
    .innerJoin(users, eq(users.id, submissions.userId))
    .where(sql`${submissions.submittedAt} > now() - interval '1 hour'`)
    .groupBy(users.id, users.username, users.isHallOfFame)
    .orderBy(desc(sql`count(${submissions.id})`))
    .limit(limit);
  return rows.map((r) => ({
    username: r.username,
    isHallOfFame: r.isHallOfFame ?? false,
    count: Number(r.count),
  }));
}
