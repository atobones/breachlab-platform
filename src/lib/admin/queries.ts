import { asc, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  levels,
  liveOpsCounts,
  submissions,
  tracks,
  users,
} from "@/lib/db/schema";
import { sponsors } from "@/lib/sponsors/schema";
import { TIER_ORDER, type TierCode } from "@/lib/sponsors/tiers";
import {
  rollupSponsors,
  mergeDailyTrend,
  type DailyTrendPoint,
} from "./helpers";

export { rollupSponsors, mergeDailyTrend };
export type { DailyTrendPoint };

// ─── Overview ──────────────────────────────────────────────────────────────

export type OverviewStats = {
  users: {
    total: number;
    newToday: number;
    new7d: number;
    new30d: number;
  };
  active: {
    webNow: number; // last_seen_at < 5min
    sshNow: number; // fresh live_ops_counts
    today: number; // last_seen_at > today OR submitted today
    last7d: number;
    last30d: number;
  };
  submissions: {
    total: number;
    today: number;
    last7d: number;
    last30d: number;
    firstBloods: number;
  };
  sponsors: {
    activeCount: number;
    mrrCents: number;
    byTier: Record<TierCode, number>;
    bySource: Record<string, number>;
  };
};

export async function getOverviewStats(): Promise<OverviewStats> {
  const [
    userCounts,
    activeWebRow,
    activeSshRow,
    activeTodayRow,
    active7dRow,
    active30dRow,
    submissionCounts,
    firstBloodRow,
    activeSponsors,
  ] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        newToday: sql<number>`count(*) filter (where ${users.createdAt} >= now() - interval '24 hours')::int`,
        new7d: sql<number>`count(*) filter (where ${users.createdAt} >= now() - interval '7 days')::int`,
        new30d: sql<number>`count(*) filter (where ${users.createdAt} >= now() - interval '30 days')::int`,
      })
      .from(users)
      .then((r) => r[0]),

    db
      .select({ c: sql<number>`count(*)::int` })
      .from(users)
      .where(sql`${users.lastSeenAt} > now() - interval '5 minutes'`)
      .then((r) => r[0]),

    db
      .select({
        c: sql<number>`coalesce(sum(${liveOpsCounts.count}), 0)::int`,
      })
      .from(liveOpsCounts)
      .where(sql`${liveOpsCounts.updatedAt} > now() - interval '2 minutes'`)
      .then((r) => r[0]),

    countActiveUsersWithin("24 hours"),
    countActiveUsersWithin("7 days"),
    countActiveUsersWithin("30 days"),

    db
      .select({
        total: sql<number>`count(*)::int`,
        today: sql<number>`count(*) filter (where ${submissions.submittedAt} >= now() - interval '24 hours')::int`,
        last7d: sql<number>`count(*) filter (where ${submissions.submittedAt} >= now() - interval '7 days')::int`,
        last30d: sql<number>`count(*) filter (where ${submissions.submittedAt} >= now() - interval '30 days')::int`,
      })
      .from(submissions)
      .then((r) => r[0]),

    db
      .select({ c: sql<number>`count(*)::int` })
      .from(submissions)
      .where(
        sql`${submissions.pointsAwarded} > (select ${levels.pointsBase} from ${levels} where ${levels.id} = ${submissions.levelId})`
      )
      .then((r) => r[0]),

    db
      .select({
        amount: sponsors.amountCentsMonthly,
        source: sponsors.source,
      })
      .from(sponsors)
      .where(isNull(sponsors.endedAt)),
  ]);

  const sponsorRollup = rollupSponsors(activeSponsors);

  return {
    users: {
      total: Number(userCounts?.total ?? 0),
      newToday: Number(userCounts?.newToday ?? 0),
      new7d: Number(userCounts?.new7d ?? 0),
      new30d: Number(userCounts?.new30d ?? 0),
    },
    active: {
      webNow: Number(activeWebRow?.c ?? 0),
      sshNow: Number(activeSshRow?.c ?? 0),
      today: activeTodayRow,
      last7d: active7dRow,
      last30d: active30dRow,
    },
    submissions: {
      total: Number(submissionCounts?.total ?? 0),
      today: Number(submissionCounts?.today ?? 0),
      last7d: Number(submissionCounts?.last7d ?? 0),
      last30d: Number(submissionCounts?.last30d ?? 0),
      firstBloods: Number(firstBloodRow?.c ?? 0),
    },
    sponsors: sponsorRollup,
  };
}

async function countActiveUsersWithin(intervalText: string): Promise<number> {
  const [row] = await db
    .select({ c: sql<number>`count(distinct active_id)::int` })
    .from(
      sql`(
        select ${users.id} as active_id
          from ${users}
          where ${users.lastSeenAt} > now() - interval '${sql.raw(intervalText)}'
        union
        select ${submissions.userId} as active_id
          from ${submissions}
          where ${submissions.submittedAt} > now() - interval '${sql.raw(intervalText)}'
      ) as active_union`
    );
  return Number(row?.c ?? 0);
}

// Re-export for UI convenience.
export { TIER_ORDER };

// ─── Track completion breakdown ────────────────────────────────────────────

export type TrackBreakdownRow = {
  trackSlug: string;
  trackName: string;
  levelCount: number;
  submissionCount: number;
  uniqueSolvers: number;
};

export async function getTrackBreakdown(): Promise<TrackBreakdownRow[]> {
  return db
    .select({
      trackSlug: tracks.slug,
      trackName: tracks.name,
      levelCount: sql<number>`count(distinct ${levels.id})::int`,
      submissionCount: sql<number>`count(${submissions.id})::int`,
      uniqueSolvers: sql<number>`count(distinct ${submissions.userId})::int`,
    })
    .from(tracks)
    .leftJoin(levels, eq(levels.trackId, tracks.id))
    .leftJoin(submissions, eq(submissions.levelId, levels.id))
    .groupBy(tracks.id, tracks.slug, tracks.name, tracks.orderIdx)
    .orderBy(asc(tracks.orderIdx));
}

// ─── Users listing ─────────────────────────────────────────────────────────

export type AdminUserRow = {
  id: string;
  username: string;
  email: string;
  emailVerified: boolean;
  totpEnabled: boolean;
  isAdmin: boolean;
  isSupporter: boolean;
  lastSeenAt: Date | null;
  createdAt: Date;
  submissionCount: number;
};

export async function getUsersPaged(opts: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ rows: AdminUserRow[]; total: number }> {
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = opts.offset ?? 0;
  const search = opts.search?.trim();

  const where = search
    ? or(
        ilike(users.username, `%${search}%`),
        ilike(users.email, `%${search}%`)
      )
    : undefined;

  const [totalRow, rows] = await Promise.all([
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(users)
      .where(where ?? sql`true`)
      .then((r) => r[0]),

    db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        emailVerified: users.emailVerified,
        totpSecret: users.totpSecret,
        isAdmin: users.isAdmin,
        isSupporter: users.isSupporter,
        lastSeenAt: users.lastSeenAt,
        createdAt: users.createdAt,
        submissionCount: sql<number>`(select count(*)::int from ${submissions} where ${submissions.userId} = ${users.id})`,
      })
      .from(users)
      .where(where ?? sql`true`)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  return {
    rows: rows.map((r) => ({
      id: r.id,
      username: r.username,
      email: r.email,
      emailVerified: r.emailVerified,
      totpEnabled: r.totpSecret !== null,
      isAdmin: r.isAdmin,
      isSupporter: r.isSupporter,
      lastSeenAt: r.lastSeenAt,
      createdAt: r.createdAt,
      submissionCount: Number(r.submissionCount),
    })),
    total: Number(totalRow?.c ?? 0),
  };
}

// ─── Submissions listing ───────────────────────────────────────────────────

export type AdminSubmissionRow = {
  id: string;
  userId: string;
  username: string;
  levelId: string;
  levelTitle: string;
  levelIdx: number;
  trackSlug: string;
  pointsAwarded: number;
  submittedAt: Date;
  sourceIp: string | null;
};

export async function getRecentSubmissions(opts: {
  limit?: number;
  offset?: number;
  userId?: string;
}): Promise<AdminSubmissionRow[]> {
  const limit = Math.min(opts.limit ?? 100, 500);
  const offset = opts.offset ?? 0;

  const filter = opts.userId
    ? eq(submissions.userId, opts.userId)
    : undefined;

  return db
    .select({
      id: submissions.id,
      userId: submissions.userId,
      username: users.username,
      levelId: submissions.levelId,
      levelTitle: levels.title,
      levelIdx: levels.idx,
      trackSlug: tracks.slug,
      pointsAwarded: submissions.pointsAwarded,
      submittedAt: submissions.submittedAt,
      sourceIp: submissions.sourceIp,
    })
    .from(submissions)
    .innerJoin(users, eq(users.id, submissions.userId))
    .innerJoin(levels, eq(levels.id, submissions.levelId))
    .innerJoin(tracks, eq(tracks.id, levels.trackId))
    .where(filter ?? sql`true`)
    .orderBy(desc(submissions.submittedAt))
    .limit(limit)
    .offset(offset);
}

// ─── Sponsors listing (admin — includes hidden/ended) ──────────────────────

export type AdminSponsorRow = {
  id: string;
  username: string | null;
  userId: string | null;
  source: string;
  externalId: string | null;
  tierCode: string;
  amountCentsMonthly: number;
  visibility: string;
  dedication: string | null;
  startedAt: Date;
  endedAt: Date | null;
};

export async function getAllSponsors(opts: {
  includeEnded?: boolean;
}): Promise<AdminSponsorRow[]> {
  const base = db
    .select({
      id: sponsors.id,
      username: users.username,
      userId: sponsors.userId,
      source: sponsors.source,
      externalId: sponsors.externalId,
      tierCode: sponsors.tierCode,
      amountCentsMonthly: sponsors.amountCentsMonthly,
      visibility: sponsors.visibility,
      dedication: sponsors.dedication,
      startedAt: sponsors.startedAt,
      endedAt: sponsors.endedAt,
    })
    .from(sponsors)
    .leftJoin(users, eq(users.id, sponsors.userId));

  const query = opts.includeEnded
    ? base
    : base.where(isNull(sponsors.endedAt));

  return query.orderBy(desc(sponsors.amountCentsMonthly), asc(sponsors.startedAt));
}

// ─── Daily trend (last 30 days) ────────────────────────────────────────────

export async function getDailyTrend(days: number = 30): Promise<DailyTrendPoint[]> {
  // Clamp + integer-coerce to prevent SQL injection if a future caller
  // forwards a HTTP query param into this function. `sql.raw(String(N))`
  // would compose-expand any non-numeric input into the query string.
  const safeDays = Math.max(1, Math.min(365, Math.floor(Number(days) || 30)));
  const [regResult, subResult] = await Promise.all([
    db.execute<{ day: string; c: number }>(sql`
      select to_char(date_trunc('day', ${users.createdAt}), 'YYYY-MM-DD') as day,
             count(*)::int as c
        from ${users}
       where ${users.createdAt} >= now() - (${safeDays} || ' days')::interval
       group by day
    `),
    db.execute<{ day: string; c: number }>(sql`
      select to_char(date_trunc('day', ${submissions.submittedAt}), 'YYYY-MM-DD') as day,
             count(*)::int as c
        from ${submissions}
       where ${submissions.submittedAt} >= now() - (${safeDays} || ' days')::interval
       group by day
    `),
  ]);

  // postgres.js returns the rows array directly; drizzle may wrap it as
  // { rows }. Support both shapes.
  const regRows = Array.isArray(regResult)
    ? regResult
    : (regResult as { rows: Array<{ day: string; c: number }> }).rows;
  const subRows = Array.isArray(subResult)
    ? subResult
    : (subResult as { rows: Array<{ day: string; c: number }> }).rows;

  return mergeDailyTrend(regRows, subRows, days);
}

