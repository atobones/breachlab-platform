import { db } from "@/lib/db/client";
import { securityCredits, type SecurityCredit } from "@/lib/hall-of-fame/schema";
import { users } from "@/lib/db/schema";
import { desc, eq, and, sql } from "drizzle-orm";

export type PublicCredit = {
  id: string;
  displayName: string;
  username: string | null;
  isHallOfFame: boolean;
  discordHandle: string | null;
  externalLink: string | null;
  findingTitle: string;
  findingDescription: string | null;
  classRef: string | null;
  severity: string;
  prRef: string | null;
  securityScore: number;
  awardedAt: Date | null;
};

// Public feed — confirmed credits only, newest + most severe first.
// Ordering: confirmed-severity desc (critical > high > medium > low) then
// awardedAt desc. No pagination on v1 (we expect <500 credits for a long
// time). Add limit/offset later if the list grows.
const SEVERITY_RANK = sql<number>`CASE ${securityCredits.severity}
  WHEN 'critical' THEN 4
  WHEN 'high' THEN 3
  WHEN 'medium' THEN 2
  WHEN 'low' THEN 1
  ELSE 0 END`;

export async function getPublicCredits(): Promise<PublicCredit[]> {
  const rows = await db
    .select({
      id: securityCredits.id,
      displayName: securityCredits.displayName,
      username: users.username,
      isHallOfFame: users.isHallOfFame,
      discordHandle: securityCredits.discordHandle,
      externalLink: securityCredits.externalLink,
      findingTitle: securityCredits.findingTitle,
      findingDescription: securityCredits.findingDescription,
      classRef: securityCredits.classRef,
      severity: securityCredits.severity,
      prRef: securityCredits.prRef,
      securityScore: securityCredits.securityScore,
      awardedAt: securityCredits.awardedAt,
    })
    .from(securityCredits)
    .leftJoin(users, eq(users.id, securityCredits.userId))
    .where(eq(securityCredits.status, "confirmed"))
    .orderBy(desc(SEVERITY_RANK), desc(securityCredits.awardedAt));

  return rows.map((r) => ({
    ...r,
    isHallOfFame: r.isHallOfFame ?? false,
  }));
}

// Admin feed — all credits with user info, newest first, optionally scoped
// by status. Exposes `notes` and `awarded_by` for admin-only context.
export type AdminCredit = SecurityCredit & {
  username: string | null;
  isHallOfFame: boolean;
};

export async function getAllCredits({
  status,
}: {
  status?: "pending" | "confirmed" | "rejected" | "all";
} = {}): Promise<AdminCredit[]> {
  const where =
    status && status !== "all" ? eq(securityCredits.status, status) : undefined;

  const rows = await db
    .select({
      credit: securityCredits,
      username: users.username,
      isHallOfFame: users.isHallOfFame,
    })
    .from(securityCredits)
    .leftJoin(users, eq(users.id, securityCredits.userId))
    .where(where)
    .orderBy(desc(securityCredits.createdAt));

  return rows.map((r) => ({
    ...r.credit,
    username: r.username,
    isHallOfFame: r.isHallOfFame ?? false,
  }));
}

export type UserSecurityProfile = {
  totalScore: number;
  credits: Array<{
    id: string;
    findingTitle: string;
    classRef: string | null;
    severity: string;
    prRef: string | null;
    securityScore: number;
    awardedAt: Date | null;
  }>;
};

// Top hall-of-fame contributors by security_score. Used on the homepage
// OpsCenter and anywhere we surface a security-leaderboard strip. Returns
// only users with at least one confirmed credit (is_hall_of_fame=true).
export type TopContributor = {
  userId: string;
  username: string;
  score: number;
  reports: number;
};

export async function getTopContributors(
  limit: number = 5,
): Promise<TopContributor[]> {
  const rows = await db
    .select({
      userId: users.id,
      username: users.username,
      score: users.securityScore,
      reports: sql<number>`count(${securityCredits.id})::int`,
    })
    .from(users)
    .leftJoin(
      securityCredits,
      and(
        eq(securityCredits.userId, users.id),
        eq(securityCredits.status, "confirmed"),
      ),
    )
    .where(eq(users.isHallOfFame, true))
    .groupBy(users.id, users.username, users.securityScore)
    .orderBy(desc(users.securityScore))
    .limit(limit);
  return rows.map((r) => ({
    userId: r.userId,
    username: r.username,
    score: r.score,
    reports: Number(r.reports),
  }));
}

// For the /u/[username] profile page: list of a user's confirmed credits +
// their current denormalized total security score.
export async function getUserSecurityProfile(
  userId: string,
): Promise<UserSecurityProfile | null> {
  const [user] = await db
    .select({ securityScore: users.securityScore })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) return null;

  const credits = await db
    .select({
      id: securityCredits.id,
      findingTitle: securityCredits.findingTitle,
      classRef: securityCredits.classRef,
      severity: securityCredits.severity,
      prRef: securityCredits.prRef,
      securityScore: securityCredits.securityScore,
      awardedAt: securityCredits.awardedAt,
    })
    .from(securityCredits)
    .where(
      and(
        eq(securityCredits.userId, userId),
        eq(securityCredits.status, "confirmed"),
      ),
    )
    .orderBy(desc(securityCredits.awardedAt));

  return { totalScore: user.securityScore, credits };
}
