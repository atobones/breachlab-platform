import { eq } from "drizzle-orm";
import { getTrackBySlug, getLevelsForTrack } from "@/lib/tracks/queries";
import { LevelTable } from "@/components/tracks/LevelTable";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { submissions } from "@/lib/db/schema";

export default async function GhostTrackPage() {
  const track = await getTrackBySlug("ghost");
  if (!track) {
    return (
      <div className="space-y-4">
        <h1 className="text-amber text-xl">Ghost</h1>
        <p className="text-red">
          Track not seeded. Run <code>npm run seed:ghost</code>.
        </p>
      </div>
    );
  }
  const levelRows = await getLevelsForTrack(track.id);
  const { user } = await getCurrentSession();

  let solvedLevelIds = new Set<string>();
  if (user && levelRows.length > 0) {
    const userRows = await db
      .select({ levelId: submissions.levelId })
      .from(submissions)
      .where(eq(submissions.userId, user.id));
    solvedLevelIds = new Set(userRows.map((r) => r.levelId));
  }

  return (
    <div className="space-y-4">
      <h1 className="text-amber text-xl">Ghost</h1>
      <p className="text-sm">{track.description}</p>
      <pre className="bg-border/40 p-3 text-sm">
        ssh ghost0@ghost.breachlab.org -p 2222
      </pre>
      <LevelTable levels={levelRows} solvedLevelIds={solvedLevelIds} />
      {user ? (
        <p className="text-xs">
          <a href="/submit">Submit a flag →</a>
        </p>
      ) : (
        <p className="text-xs text-muted">
          <a href="/login">Log in</a> to submit flags and track progress.
        </p>
      )}
    </div>
  );
}
