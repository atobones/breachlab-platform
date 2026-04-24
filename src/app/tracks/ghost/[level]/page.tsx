import { notFound } from "next/navigation";
import { eq, and, sql, inArray } from "drizzle-orm";
import { getTrackBySlug, getLevelByTrackAndIdx } from "@/lib/tracks/queries";
import { getLevelContent } from "@/lib/tracks/ghost-level-content";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { submissions, levels } from "@/lib/db/schema";
import { getFirstBloodByLevel } from "@/lib/badges/queries";
import { isHiddenLevel } from "@/lib/tracks/all";
import { hasUnlockedHiddenBonus } from "@/lib/tracks/bonus";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PrevNextLevel } from "@/components/PrevNextLevel";
import { OperativeName } from "@/components/operatives/OperativeName";

export default async function GhostLevelPage({
  params,
}: {
  params: Promise<{ level: string }>;
}) {
  const { level } = await params;
  const idx = Number(level);
  if (!Number.isInteger(idx) || idx < 0 || idx > 99) notFound();

  const track = await getTrackBySlug("ghost");
  if (!track) notFound();

  const lvl = await getLevelByTrackAndIdx(track.id, idx);
  if (!lvl) notFound();

  const { user } = await getCurrentSession();

  // Hidden levels render a gated progress page instead of 404 — PrevNextLevel
  // on L21 links to L22 (graduation) and before 2026-04-24 landed players on
  // a generic 404. Same fix as Phantom graduation.
  if (isHiddenLevel(lvl.description)) {
    const unlocked = await hasUnlockedHiddenBonus(user?.id, track.id);
    if (!unlocked) {
      const publicRows = await db
        .select({ id: levels.id, description: levels.description })
        .from(levels)
        .where(eq(levels.trackId, track.id));
      const publicIds = publicRows
        .filter((l) => !isHiddenLevel(l.description))
        .map((l) => l.id);
      let solvedCount = 0;
      if (user && publicIds.length > 0) {
        const [row] = await db
          .select({ c: sql<number>`count(*)::int` })
          .from(submissions)
          .where(
            and(
              eq(submissions.userId, user.id),
              inArray(submissions.levelId, publicIds),
            ),
          );
        solvedCount = Number(row?.c ?? 0);
      }
      return (
        <div className="space-y-6 max-w-3xl">
          <Breadcrumbs
            items={[
              { label: "tracks", href: "/" },
              { label: "ghost", href: "/tracks/ghost" },
              { label: "graduation" },
            ]}
          />
          <h1 className="text-amber text-2xl">Ghost Graduation — locked</h1>
          <section className="border border-amber/60 p-4 space-y-2 text-sm">
            <p>
              The final mission opens after every public Ghost level is solved
              under this account.
            </p>
            <p className="text-muted">
              {user ? (
                <>
                  Your progress: <span className="text-amber">{solvedCount}</span>
                  {" / "}
                  <span className="text-amber">{publicIds.length}</span> public
                  levels completed.
                </>
              ) : (
                <>
                  <a href="/login" className="text-amber">Log in</a> to track your
                  progress.
                </>
              )}
            </p>
          </section>
          <p className="text-sm">
            <a href="/tracks/ghost" className="text-amber">← Back to Ghost track</a>
          </p>
        </div>
      );
    }
  }

  const content = getLevelContent(idx);
  const firstBloodMap = await getFirstBloodByLevel();
  const firstBlood = firstBloodMap.get(lvl.id);

  let solved = false;
  if (user) {
    const [row] = await db
      .select({ id: submissions.id })
      .from(submissions)
      .where(
        and(eq(submissions.userId, user.id), eq(submissions.levelId, lvl.id))
      )
      .limit(1);
    solved = !!row;
  }

  // Max Ghost level is 22 (graduation). Prev at 0 is disabled. Suppress
  // forward arrow when the next level is a locked hidden bonus so players
  // don't click into the gated page.
  const MAX_GHOST_LEVEL = 22;
  const prevHref = idx > 0 ? `/tracks/ghost/${idx - 1}` : null;
  let nextHref: string | null =
    idx < MAX_GHOST_LEVEL ? `/tracks/ghost/${idx + 1}` : null;
  if (nextHref) {
    const nextLvl = await getLevelByTrackAndIdx(track.id, idx + 1);
    if (nextLvl && isHiddenLevel(nextLvl.description)) {
      const nextUnlocked = await hasUnlockedHiddenBonus(user?.id, track.id);
      if (!nextUnlocked) nextHref = null;
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Breadcrumbs
        items={[
          { label: "tracks", href: "/" },
          { label: "ghost", href: "/tracks/ghost" },
          { label: idx === MAX_GHOST_LEVEL ? "graduation" : `level ${idx}` },
        ]}
      />
      <div>
        <p className="text-muted text-xs uppercase">Ghost Track</p>
        <h1 className="text-amber text-xl">
          {idx === MAX_GHOST_LEVEL ? "Ghost Graduation" : `Level ${idx} → Level ${idx + 1}`}
        </h1>
        <p className="text-sm text-muted">
          {lvl.title} · {lvl.pointsBase} pts
          {lvl.pointsFirstBloodBonus > 0 && (
            <>
              {" "}
              <span className="text-red">
                · +{lvl.pointsFirstBloodBonus} first-blood bonus
              </span>
            </>
          )}
        </p>
      </div>

      <div className="flex gap-2 text-xs">
        {firstBlood ? (
          <span className="border border-red text-red px-2 py-0.5 uppercase">
            First Blood: @
            <OperativeName
              username={firstBlood.username}
              isHallOfFame={firstBlood.isHallOfFame}
              href={`/u/${firstBlood.username}`}
              className={firstBlood.isHallOfFame ? "" : "text-red"}
            />
          </span>
        ) : (
          <span className="border border-red text-red px-2 py-0.5 uppercase">
            First Blood Available
          </span>
        )}
        {solved && (
          <span className="border border-green text-green px-2 py-0.5 uppercase">
            You Solved This
          </span>
        )}
      </div>

      {content ? (
        <>
          <section>
            <h2 className="text-amber text-lg mb-2">
              Commands you may need to solve this level
            </h2>
            <div className="flex flex-wrap gap-2">
              {content.commands.map((cmd) => (
                <code
                  key={cmd}
                  className="border border-border px-2 py-0.5 text-xs text-text"
                >
                  {cmd}
                </code>
              ))}
            </div>
          </section>

          <section className="border-l-2 border-amber pl-4">
            <h2 className="text-muted text-xs uppercase mb-1">
              Why this matters in the real world
            </h2>
            <p className="text-sm">{content.realWorldSkill}</p>
          </section>
        </>
      ) : (
        <p className="text-muted text-sm">Level content not yet written.</p>
      )}

      <section className="border-t border-border pt-4">
        <h2 className="text-amber text-sm uppercase mb-2">
          How to get to this level
        </h2>
        <p className="text-sm mb-2">
          Use the password for <code className="text-amber">ghost{idx}</code>{" "}
          that you captured on the previous level, then:
        </p>
        <pre className="bg-border/40 p-3 text-xs">
          ssh ghost{idx}@204.168.229.209 -p 2222
        </pre>
        {idx === 0 && (
          <p className="text-xs text-muted mt-2">
            Level 0 is the entry point. Password: <code className="text-amber">ghost0</code>.
          </p>
        )}
      </section>

      {user ? (
        <p className="text-sm">
          Found the flag?{" "}
          <a href="/submit" className="text-amber">
            Submit it →
          </a>
        </p>
      ) : (
        <p className="text-sm text-muted">
          <a href="/login">Log in</a> to submit flags and track your progress
          on this level.
        </p>
      )}

      <PrevNextLevel
        prevHref={prevHref}
        prevLabel={prevHref ? `Level ${idx - 1}` : undefined}
        nextHref={nextHref}
        nextLabel={nextHref ? `Level ${idx + 1}` : undefined}
        indexHref="/tracks/ghost"
      />
    </div>
  );
}
