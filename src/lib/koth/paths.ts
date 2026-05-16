import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { kothPathEvents, kothPaths } from "@/lib/db/schema";

// Phase 2 — Diamond commodity pricing helpers.
//
// Each path starts every round at koth_paths.base_value. Every
// `path_exploited` event for that (round, path) decrements the value by
// PATH_PRICE_STEP, floored at PATH_PRICE_FLOOR. We don't mutate
// koth_paths.current_value — the catalog stays static and the round's
// current value is derived from event count. value_snapshot is stored
// on each event so scoring is deterministic without replay.

export const PATH_PRICE_STEP = 2;
export const PATH_PRICE_FLOOR = 2;

export type PathLookup = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  baseValue: number;
  hint: string | null;
};

const slugCache = new Map<string, PathLookup>();
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 30_000;

async function loadSlugCache(): Promise<void> {
  if (Date.now() - cacheLoadedAt < CACHE_TTL_MS && slugCache.size > 0) return;
  const rows = await db
    .select({
      id: kothPaths.id,
      slug: kothPaths.slug,
      name: kothPaths.name,
      kind: kothPaths.kind,
      baseValue: kothPaths.baseValue,
      hint: kothPaths.hint,
    })
    .from(kothPaths);
  slugCache.clear();
  for (const r of rows) slugCache.set(r.slug, r);
  cacheLoadedAt = Date.now();
}

export async function resolvePathBySlug(
  slug: string | null | undefined,
): Promise<PathLookup | null> {
  if (!slug) return null;
  await loadSlugCache();
  return slugCache.get(slug) ?? null;
}

export async function listPaths(): Promise<PathLookup[]> {
  await loadSlugCache();
  return Array.from(slugCache.values()).sort((a, b) => a.slug.localeCompare(b.slug));
}

// Count of prior `exploited` events for (round, path). Used to
// derive the current value-snapshot when recording a fresh exploit.
async function countExploitedEvents(
  roundId: string,
  pathId: string,
): Promise<number> {
  const [row] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(kothPathEvents)
    .where(
      and(
        eq(kothPathEvents.roundId, roundId),
        eq(kothPathEvents.pathId, pathId),
        eq(kothPathEvents.kind, "exploited"),
      ),
    );
  return row?.c ?? 0;
}

// Current value of a path in a round, before the *next* exploit.
// snapshotForExploit returns the value the player should be credited
// for THIS exploit (i.e. the price as of right now).
export async function snapshotForExploit(
  roundId: string,
  path: PathLookup,
): Promise<number> {
  const priorExploits = await countExploitedEvents(roundId, path.id);
  return Math.max(
    PATH_PRICE_FLOOR,
    path.baseValue - PATH_PRICE_STEP * priorExploits,
  );
}

// Public read for the HUD — current prices for every path in the round.
export async function currentPricesForRound(
  roundId: string,
): Promise<
  Array<{
    pathId: string;
    slug: string;
    name: string;
    kind: string;
    hint: string | null;
    baseValue: number;
    currentValue: number;
    exploitsThisRound: number;
    activated: boolean;
    pendingUntil: Date | null;
  }>
> {
  await loadSlugCache();
  const events = await db
    .select({
      pathId: kothPathEvents.pathId,
      kind: kothPathEvents.kind,
      occurredAt: kothPathEvents.occurredAt,
    })
    .from(kothPathEvents)
    .where(eq(kothPathEvents.roundId, roundId));

  const exploitCount = new Map<string, number>();
  const activated = new Set<string>();
  const closed = new Set<string>();
  const pendingUntil = new Map<string, Date>();

  for (const e of events) {
    if (e.kind === "exploited") {
      exploitCount.set(e.pathId, (exploitCount.get(e.pathId) ?? 0) + 1);
    } else if (e.kind === "activated") {
      activated.add(e.pathId);
    } else if (e.kind === "closed") {
      closed.add(e.pathId);
    } else if (e.kind === "pending") {
      // We don't know the exact warn-lead from here, but the activator
      // landing closes the pending window. Just expose a hint that the
      // path is incoming. The escalation-daemon controls the timing.
      pendingUntil.set(e.pathId, e.occurredAt);
    }
  }

  return Array.from(slugCache.values()).map((p) => {
    const exploits = exploitCount.get(p.id) ?? 0;
    const currentValue = Math.max(
      PATH_PRICE_FLOOR,
      p.baseValue - PATH_PRICE_STEP * exploits,
    );
    const isActivated =
      p.kind === "core" || (activated.has(p.id) && !closed.has(p.id));
    const pUntil =
      !isActivated && pendingUntil.has(p.id)
        ? pendingUntil.get(p.id) ?? null
        : null;
    return {
      pathId: p.id,
      slug: p.slug,
      name: p.name,
      kind: p.kind,
      hint: p.hint,
      baseValue: p.baseValue,
      currentValue,
      exploitsThisRound: exploits,
      activated: isActivated,
      pendingUntil: pUntil,
    };
  });
}

// Insert a path_event row. Caller has already resolved the path. The
// snapshot value should be pre-computed by the caller (see
// snapshotForExploit).
export async function recordPathEvent(opts: {
  roundId: string;
  pathId: string;
  kind: "activated" | "exploited" | "closed" | "pending";
  slot?: string | null;
  valueSnapshot?: number | null;
  rawMeta?: Record<string, unknown> | null;
}): Promise<void> {
  await db.insert(kothPathEvents).values({
    roundId: opts.roundId,
    pathId: opts.pathId,
    kind: opts.kind,
    slot: opts.slot ?? null,
    valueSnapshot: opts.valueSnapshot ?? null,
    rawMeta: opts.rawMeta ?? null,
  });
}

// True if `actor` was the most recent dethrone victim via `pathSlug`
// in the same round — used to award path-attributed patch bonus +5
// instead of generic +3.
export async function wasRecentlyDethronedVia(
  roundId: string,
  actorUserId: string,
  pathSlug: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: kothPathEvents.id })
    .from(kothPathEvents)
    .innerJoin(kothPaths, eq(kothPaths.id, kothPathEvents.pathId))
    .where(
      and(
        eq(kothPathEvents.roundId, roundId),
        eq(kothPaths.slug, pathSlug),
        eq(kothPathEvents.kind, "exploited"),
        eq(
          sql`(${kothPathEvents.rawMeta} ->> 'target_user_id')`,
          actorUserId,
        ),
      ),
    )
    .orderBy(sql`${kothPathEvents.occurredAt} desc`)
    .limit(1);
  return !!row;
}
