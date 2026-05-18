import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  kothEvents,
  kothPaths,
  kothWeaponSubmissions,
  users,
} from "@/lib/db/schema";

// Crown Wars — Weapons Forge.
//
// When a player takes crown via a slug not in koth_paths, our oracle
// fires a first_discovery event with +50 pt. The Weapons Forge lets
// the discoverer formalise that path: submit the exploit + write-up,
// admin reviews, on approval the slug lands in koth_paths under
// `<author>/<primitive>` with permanent author credit.

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,63}$/;

// Validation mirrored from the SQL CHECK constraints so we can reject
// bad input at the API boundary with a useful message instead of
// letting PG raise a generic constraint error.
export function validateSubmission(input: {
  slug: string;
  title: string;
  techniqueMd: string;
  exploitText: string;
}): string | null {
  if (!SLUG_RE.test(input.slug)) {
    return "slug must be lowercase letters, digits, and dashes (2-64 chars).";
  }
  if (input.title.length < 4 || input.title.length > 120) {
    return "title must be 4-120 characters.";
  }
  if (input.techniqueMd.length < 1 || input.techniqueMd.length > 10240) {
    return "technique writeup must be 1-10240 characters.";
  }
  if (input.exploitText.length < 1 || input.exploitText.length > 5120) {
    return "exploit must be 1-5120 characters.";
  }
  return null;
}

// Has the user already discovered this slug via a first_discovery
// event? Gates the submit form so randos can't fill the queue with
// paths they didn't actually demonstrate in-arena.
export async function userDiscoveredSlug(
  userId: string,
  slug: string,
): Promise<boolean> {
  const r = await db
    .select({ id: kothEvents.id })
    .from(kothEvents)
    .where(
      and(
        eq(kothEvents.actorUserId, userId),
        eq(kothEvents.kind, "crown_taken"),
        eq(kothEvents.exploitPath, slug),
      ),
    )
    .limit(1);
  return r.length > 0;
}

// First-discovery slugs the user has logged that aren't yet (a) in
// the catalog and (b) already submitted by them. These are the
// surface for "ready to submit" UI prompts.
export async function pendingDiscoveriesForUser(userId: string) {
  // Their first_discovery events (oracle marks raw_meta.first_discovery=true).
  const rows = await db
    .select({
      slug: kothEvents.exploitPath,
      occurredAt: kothEvents.occurredAt,
    })
    .from(kothEvents)
    .where(
      and(
        eq(kothEvents.actorUserId, userId),
        eq(kothEvents.kind, "crown_taken"),
      ),
    )
    .orderBy(desc(kothEvents.occurredAt))
    .limit(20);
  const discoverySlugs = new Set<string>();
  for (const r of rows) {
    if (r.slug && !discoverySlugs.has(r.slug)) discoverySlugs.add(r.slug);
  }
  if (discoverySlugs.size === 0) return [];

  // Drop any already in the catalog (canonical slug already exists).
  const inCatalog = await db
    .select({ slug: kothPaths.slug })
    .from(kothPaths);
  const catalogSet = new Set(inCatalog.map((p) => p.slug));

  // Drop ones the user already has a pending/approved submission for.
  const mySubs = await db
    .select({ slug: kothWeaponSubmissions.slug, status: kothWeaponSubmissions.status })
    .from(kothWeaponSubmissions)
    .where(eq(kothWeaponSubmissions.userId, userId));
  const blockedByOwnSub = new Set(
    mySubs
      .filter((s) => s.status === "pending" || s.status === "approved")
      .map((s) => s.slug),
  );

  return [...discoverySlugs].filter(
    (s) => !catalogSet.has(s) && !blockedByOwnSub.has(s),
  );
}

export async function submitWeapon(input: {
  userId: string;
  slug: string;
  title: string;
  techniqueMd: string;
  exploitText: string;
}): Promise<
  | { ok: true; id: string }
  | { ok: false; error: string }
> {
  const err = validateSubmission(input);
  if (err) return { ok: false, error: err };

  // Verify the submitter actually discovered this slug in-arena.
  // Otherwise the queue gets noise.
  const ok = await userDiscoveredSlug(input.userId, input.slug);
  if (!ok) {
    return {
      ok: false,
      error:
        "you must take a crown via this slug (first-discovery) before submitting it to the Forge.",
    };
  }

  // Block double-submit on the same slug (the partial unique index
  // already enforces this at the DB level; we catch the PG error so
  // the user gets a friendly message).
  try {
    const [row] = await db
      .insert(kothWeaponSubmissions)
      .values({
        userId: input.userId,
        slug: input.slug,
        title: input.title,
        techniqueMd: input.techniqueMd,
        exploitText: input.exploitText,
      })
      .returning({ id: kothWeaponSubmissions.id });
    return { ok: true, id: row.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("koth_weapon_submissions_one_pending_per_slug")) {
      return {
        ok: false,
        error: "you already have a pending submission for this slug.",
      };
    }
    return { ok: false, error: "could not record submission — try again." };
  }
}

export async function getSubmissionWithAuthor(id: string) {
  const r = await db
    .select({
      id: kothWeaponSubmissions.id,
      userId: kothWeaponSubmissions.userId,
      username: users.username,
      slug: kothWeaponSubmissions.slug,
      title: kothWeaponSubmissions.title,
      techniqueMd: kothWeaponSubmissions.techniqueMd,
      exploitText: kothWeaponSubmissions.exploitText,
      status: kothWeaponSubmissions.status,
      reviewNotes: kothWeaponSubmissions.reviewNotes,
      decidedAt: kothWeaponSubmissions.decidedAt,
      approvedPathSlug: kothWeaponSubmissions.approvedPathSlug,
      createdAt: kothWeaponSubmissions.createdAt,
    })
    .from(kothWeaponSubmissions)
    .leftJoin(users, eq(users.id, kothWeaponSubmissions.userId))
    .where(eq(kothWeaponSubmissions.id, id))
    .limit(1);
  return r[0] ?? null;
}

export async function listMySubmissions(userId: string, limit = 20) {
  return db
    .select({
      id: kothWeaponSubmissions.id,
      slug: kothWeaponSubmissions.slug,
      title: kothWeaponSubmissions.title,
      status: kothWeaponSubmissions.status,
      approvedPathSlug: kothWeaponSubmissions.approvedPathSlug,
      reviewNotes: kothWeaponSubmissions.reviewNotes,
      createdAt: kothWeaponSubmissions.createdAt,
      decidedAt: kothWeaponSubmissions.decidedAt,
    })
    .from(kothWeaponSubmissions)
    .where(eq(kothWeaponSubmissions.userId, userId))
    .orderBy(desc(kothWeaponSubmissions.createdAt))
    .limit(limit);
}
