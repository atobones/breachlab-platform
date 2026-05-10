/**
 * Posts a 24h activity report to #announcements on Discord.
 * Meant to be run by cron (e.g. `0 12 * * *`) from the VPS:
 *
 *   cd /opt/breachlab-platform && docker run --rm \
 *     --network breachlab-platform_default \
 *     -v $(pwd):/app -w /app \
 *     --env-file .env.production.local \
 *     -e DATABASE_URL=postgres://breachlab:<pw>@db:5432/breachlab \
 *     node:22-alpine \
 *     npx --yes tsx scripts/post-daily-stats.ts
 */
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db/client";
import { announceDailyStats } from "../src/lib/discord/announce";

async function main() {
  const [stats] = await db.execute<{
    flags_submitted: number;
    new_graduates_ghost: number;
    new_graduates_phantom: number;
    new_graduates_specter: number;
  }>(sql`
    SELECT
      (SELECT count(*)::int FROM submissions WHERE submitted_at > now() - interval '24 hours')                                        AS flags_submitted,
      (SELECT count(*)::int FROM badges      WHERE kind='ghost_graduate'  AND awarded_at > now() - interval '24 hours')              AS new_graduates_ghost,
      (SELECT count(*)::int FROM badges      WHERE kind='phantom_master'  AND awarded_at > now() - interval '24 hours')              AS new_graduates_phantom,
      (SELECT count(*)::int FROM badges      WHERE kind='specter_master'  AND awarded_at > now() - interval '24 hours')              AS new_graduates_specter
  `);

  console.log("stats:", stats);

  await announceDailyStats({
    flagsSubmitted: Number(stats?.flags_submitted ?? 0),
    newGraduatesGhost: Number(stats?.new_graduates_ghost ?? 0),
    newGraduatesPhantom: Number(stats?.new_graduates_phantom ?? 0),
    newGraduatesSpecter: Number(stats?.new_graduates_specter ?? 0),
  });

  console.log("daily stats posted");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
