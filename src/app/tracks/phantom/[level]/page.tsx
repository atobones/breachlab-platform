import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { getTrackBySlug, getLevelByTrackAndIdx } from "@/lib/tracks/queries";
import { getPhantomLevelContent } from "@/lib/tracks/phantom-level-content";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { submissions } from "@/lib/db/schema";
import { getFirstBloodByLevel } from "@/lib/badges/queries";
import { isHiddenLevel } from "@/lib/tracks/all";
import { hasUnlockedHiddenBonus } from "@/lib/tracks/bonus";
import { TierBadge } from "@/components/tracks/TierBadge";
import { ApproachHint } from "@/components/tracks/ApproachHint";

export const dynamic = "force-dynamic";

export default async function PhantomLevelPage({
  params,
}: {
  params: Promise<{ level: string }>;
}) {
  const { level } = await params;
  const idx = Number(level);
  if (!Number.isInteger(idx) || idx < 0 || idx > 99) notFound();

  const track = await getTrackBySlug("phantom");
  if (!track) notFound();

  const lvl = await getLevelByTrackAndIdx(track.id, idx);
  if (!lvl) notFound();

  const { user } = await getCurrentSession();

  if (isHiddenLevel(lvl.description)) {
    const unlocked = await hasUnlockedHiddenBonus(user?.id, track.id);
    if (!unlocked) notFound();
  }

  const content = getPhantomLevelContent(idx);
  const firstBloodMap = await getFirstBloodByLevel();
  const firstBlood = firstBloodMap.get(lvl.id);

  let solved = false;
  if (user) {
    const [row] = await db
      .select({ id: submissions.id })
      .from(submissions)
      .where(
        and(eq(submissions.userId, user.id), eq(submissions.levelId, lvl.id)),
      )
      .limit(1);
    solved = !!row;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Link href="/tracks/phantom" className="text-muted text-xs hover:text-amber">
            ← Phantom Track
          </Link>
          {content && <TierBadge tier={content.tier} size="sm" />}
        </div>
        <h1 className="text-red text-2xl">
          {idx === 20 ? "Phantom Graduation" : `Level ${idx} → Level ${idx + 1}`}
        </h1>
        <p className="text-sm text-muted">
          {lvl.title} · {lvl.pointsBase} pts
          {lvl.pointsFirstBloodBonus > 0 && (
            <span className="text-red"> · +{lvl.pointsFirstBloodBonus} first-blood bonus</span>
          )}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {firstBlood ? (
          <span className="border border-red text-red px-2 py-0.5 uppercase">
            First Blood: @{firstBlood.username}
          </span>
        ) : (
          lvl.pointsFirstBloodBonus > 0 && (
            <span className="border border-red text-red px-2 py-0.5 uppercase">
              First Blood Available
            </span>
          )
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
            <h2 className="text-muted text-xs uppercase tracking-wider mb-2">
              Mission
            </h2>
            <p className="text-sm whitespace-pre-line">{content.goal}</p>
          </section>

          {content.commands && content.commands.length > 0 && (
            <section>
              <h2 className="text-muted text-xs uppercase tracking-wider mb-2">
                Starting toolkit (you may need more)
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
          )}

          {content.tier === "operator" && content.approach && (
            <ApproachHint
              approach={content.approach}
              levelIdx={idx}
              username={user?.username ?? null}
            />
          )}

          <section className="border-l-2 border-red pl-4">
            <h2 className="text-muted text-xs uppercase mb-1">
              Why this matters in 2026
            </h2>
            <p className="text-sm">{content.realWorldSkill}</p>
          </section>

          <p className="text-[10px] text-muted italic">
            Mitigation era: {content.mitigationVersion} · rotation policy:
            levels may be refreshed as CVEs are patched out of distro defaults.
          </p>
        </>
      ) : (
        <p className="text-muted text-sm">Level content not yet written.</p>
      )}

      <section className="border-t border-border pt-4">
        <h2 className="text-red text-sm uppercase mb-2">
          How to reach this level
        </h2>
        <p className="text-sm mb-2">
          Use the password for <code className="text-amber">phantom{idx}</code>{" "}
          that you captured on the previous level, then:
        </p>
        <pre className="bg-border/40 p-3 text-xs">
          ssh phantom{idx}@phantom.breachlab.org -p 2223
        </pre>
        {idx === 0 && (
          <p className="text-xs text-muted mt-2">
            Level 0 is the entry point. Starting password:{" "}
            <code className="text-amber">phantom0</code>.
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
          <a href="/login">Log in</a> to submit flags and track progress.
        </p>
      )}
    </div>
  );
}
