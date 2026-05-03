import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { getTrackBySlug, getLevelByTrackAndIdx } from "@/lib/tracks/queries";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { submissions, levels } from "@/lib/db/schema";
import { getSpecterLevelContent } from "@/lib/tracks/specter-level-content";
import { getFirstBloodByLevel } from "@/lib/badges/queries";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PrevNextLevel } from "@/components/PrevNextLevel";
import { OperativeName } from "@/components/operatives/OperativeName";
import { SpecterBootstrapToken } from "@/components/dashboard/SpecterBootstrapToken";

export const dynamic = "force-dynamic";

const HOST = "204.168.229.209";

// Per-level port + container user mapping for Specter I.
// Keep in sync with orchestrator/start.sh and the L0-L13 ephemerals.
const LEVEL_INFO: Record<number, { port: number; user: string }> = {
  0: { port: 2230, user: "specter0" },
  1: { port: 2231, user: "specter1" },
  2: { port: 2232, user: "specter2" },
  3: { port: 2233, user: "specter3" },
  4: { port: 2234, user: "specter4" },
  5: { port: 2235, user: "specter5" },
  6: { port: 2236, user: "specter6" },
  7: { port: 2237, user: "specter7" },
  8: { port: 2238, user: "specter8" },
  9: { port: 2239, user: "specter9" },
  10: { port: 2240, user: "specter10" },
  11: { port: 2241, user: "specter11" },
  12: { port: 2242, user: "specter12" },
  13: { port: 2243, user: "specter13" },
};

export default async function SpecterLevelPage({
  params,
}: {
  params: Promise<{ level: string }>;
}) {
  const { level } = await params;
  const idx = Number(level);
  if (!Number.isInteger(idx) || idx < 0 || idx > 13) notFound();

  const track = await getTrackBySlug("specter");
  if (!track) notFound();

  const lvl = await getLevelByTrackAndIdx(track.id, idx);
  if (!lvl) notFound();

  const info = LEVEL_INFO[idx];
  const { user } = await getCurrentSession();

  let solved = false;
  let priorSolved = idx === 0;
  if (user) {
    const [own] = await db
      .select({ id: submissions.id })
      .from(submissions)
      .where(and(eq(submissions.userId, user.id), eq(submissions.levelId, lvl.id)))
      .limit(1);
    solved = !!own;
    if (idx > 0) {
      const [prevLvl] = await db
        .select({ id: levels.id })
        .from(levels)
        .where(and(eq(levels.trackId, track.id), eq(levels.idx, idx - 1)))
        .limit(1);
      if (prevLvl) {
        const [prev] = await db
          .select({ id: submissions.id })
          .from(submissions)
          .where(
            and(
              eq(submissions.userId, user.id),
              eq(submissions.levelId, prevLvl.id),
            ),
          )
          .limit(1);
        priorSolved = !!prev;
      }
    }
  }

  const content = getSpecterLevelContent(idx);
  const firstBloodMap = await getFirstBloodByLevel();
  const firstBlood = firstBloodMap.get(lvl.id);

  const sshCmd = `ssh ${info.user}@${HOST} -p ${info.port}`;

  return (
    <div className="space-y-6 max-w-3xl">
      <Breadcrumbs
        items={[
          { label: "tracks", href: "/" },
          { label: "specter", href: "/tracks/specter" },
          { label: "i", href: "/tracks/specter/i" },
          { label: `level ${idx}` },
        ]}
      />

      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-amber text-2xl">
            L{idx} — {lvl.title}
          </h1>
          {!user ? (
            <span className="text-xs uppercase tracking-wider text-muted">—</span>
          ) : solved ? (
            <span className="text-xs uppercase tracking-wider text-green">solved</span>
          ) : priorSolved ? (
            <span className="text-xs uppercase tracking-wider text-amber">available</span>
          ) : (
            <span className="text-xs uppercase tracking-wider text-muted">locked</span>
          )}
        </div>
        <p className="text-sm text-muted">
          {lvl.pointsBase} pts
          {lvl.pointsFirstBloodBonus > 0 && (
            <>
              {" · "}
              <span className="text-red">
                +{lvl.pointsFirstBloodBonus} first-blood bonus
              </span>
            </>
          )}
        </p>
      </header>

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

      <section className="space-y-2">
        <h2 className="text-amber text-sm uppercase">Mission</h2>
        <p className="text-sm whitespace-pre-line">
          {content?.goal ?? lvl.description}
        </p>
      </section>

      {content?.realWorldSkill && (
        <section className="border-l-2 border-amber pl-4">
          <h2 className="text-muted text-xs uppercase mb-1">
            Why this matters in 2026
          </h2>
          <p className="text-sm">{content.realWorldSkill}</p>
        </section>
      )}

      {idx === 0 && user && <SpecterBootstrapToken />}

      <section className="border border-border p-4 space-y-2">
        <h2 className="text-amber text-sm uppercase">SSH</h2>
        <dl className="text-sm space-y-1">
          <div>
            <dt className="inline text-muted">Host: </dt>
            <dd className="inline">{HOST}</dd>
          </div>
          <div>
            <dt className="inline text-muted">Port: </dt>
            <dd className="inline">{info.port}</dd>
          </div>
          <div>
            <dt className="inline text-muted">User: </dt>
            <dd className="inline">{info.user}</dd>
          </div>
          <div>
            <dt className="inline text-muted">Password: </dt>
            <dd className="inline">
              {idx === 0 ? (
                <span className="text-amber">
                  bootstrap token (see block above — Generate, then paste
                  the token at the SSH password prompt). Inside L0 your
                  player_id is auto-set; just run{" "}
                  <code>/opt/verify-paper-trail.sh</code> after writing
                  /tmp/intel.yaml.
                </span>
              ) : (
                <span className="text-muted">
                  revealed when you{" "}
                  <Link href="/submit" className="text-amber underline">
                    submit the L{idx - 1} flag at /submit
                  </Link>
                  {" "}— the response shows the per-player SSH password for
                  this level (different string from the flag itself).
                </span>
              )}
            </dd>
          </div>
        </dl>
        <pre className="bg-bg border border-border p-2 text-xs mt-3">{sshCmd}</pre>
        <p className="text-xs text-muted">
          Each connection spawns a fresh ephemeral container — no shared shell,
          no cross-player residue. Disconnect tears it down.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-amber text-sm uppercase">Submit Flag</h2>
        {user ? (
          <p className="text-sm">
            Cleared the verifier inside the ephemeral? It prints a
            per-player flag like{" "}
            <code className="text-amber">bl_…</code> on PASS. Submit it on the{" "}
            <Link href="/submit" className="text-amber underline">
              flag submission page
            </Link>{" "}
            to claim points + unlock the next level&apos;s SSH password.
          </p>
        ) : (
          <p className="text-sm text-muted">
            <Link href="/login" className="text-amber underline">
              Log in
            </Link>{" "}
            to submit flags and track chain progress.
          </p>
        )}
      </section>

      <PrevNextLevel
        prevHref={idx > 0 ? `/tracks/specter/${idx - 1}` : null}
        prevLabel={idx > 0 ? `Level ${idx - 1}` : undefined}
        nextHref={idx < 13 ? `/tracks/specter/${idx + 1}` : null}
        nextLabel={idx < 13 ? `Level ${idx + 1}` : undefined}
        indexHref="/tracks/specter/i"
      />
    </div>
  );
}
