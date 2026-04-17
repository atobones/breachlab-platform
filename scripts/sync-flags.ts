/**
 * Rewrites the `flags` table so each level has exactly one row whose
 * hash matches the canonical value in src/lib/tracks/canonical-flags.ts.
 *
 * Idempotent. Run after changing a chain password in a container
 * Dockerfile (and the mirrored entry in canonical-flags.ts).
 *
 * Usage:
 *   DATABASE_URL=postgres://... npx tsx scripts/sync-flags.ts
 *   # Locally against a prod via SSH tunnel:
 *   ssh -L 54321:127.0.0.1:5432 root@<host>
 *   DATABASE_URL=postgres://user:pass@127.0.0.1:54321/breachlab \
 *     npx tsx scripts/sync-flags.ts
 */
import { eq, and } from "drizzle-orm";
import { db } from "../src/lib/db/client";
import { flags, levels, tracks } from "../src/lib/db/schema";
import { hashToken } from "../src/lib/auth/tokens";
import { CANONICAL_FLAGS } from "../src/lib/tracks/canonical-flags";

async function main() {
  let total = 0;
  let replaced = 0;
  let skipped = 0;

  for (const [trackSlug, flagMap] of Object.entries(CANONICAL_FLAGS)) {
    const [track] = await db
      .select({ id: tracks.id })
      .from(tracks)
      .where(eq(tracks.slug, trackSlug))
      .limit(1);
    if (!track) {
      console.warn(`[skip] track "${trackSlug}" not present in DB`);
      continue;
    }

    for (const [idxStr, value] of Object.entries(flagMap)) {
      const idx = Number(idxStr);
      total++;

      const [level] = await db
        .select({ id: levels.id })
        .from(levels)
        .where(and(eq(levels.trackId, track.id), eq(levels.idx, idx)))
        .limit(1);
      if (!level) {
        console.warn(`[skip] ${trackSlug} idx=${idx} — no level row`);
        continue;
      }

      const wantHash = await hashToken(value);

      // Snapshot existing rows for this level before touching anything.
      const existing = await db
        .select({ id: flags.id, flagHash: flags.flagHash })
        .from(flags)
        .where(eq(flags.levelId, level.id));

      const already =
        existing.length === 1 && existing[0].flagHash === wantHash;
      if (already) {
        skipped++;
        continue;
      }

      // Replace atomically: delete old, insert new. Single-flag-per-level
      // is the UX the seed script has always implied.
      await db.delete(flags).where(eq(flags.levelId, level.id));
      await db
        .insert(flags)
        .values({ levelId: level.id, flagHash: wantHash });
      replaced++;
      console.log(`[sync] ${trackSlug} L${idx} → updated`);
    }
  }

  console.log(
    `\n[done] total=${total} replaced=${replaced} already-correct=${skipped}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
