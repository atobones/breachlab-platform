import { eq, sql, count } from "drizzle-orm";
import { getTrackBySlug, getLevelsForTrack } from "@/lib/tracks/queries";
import { LevelTable } from "@/components/tracks/LevelTable";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { submissions } from "@/lib/db/schema";
import { getFirstBloodByLevel } from "@/lib/badges/queries";
import { isHiddenLevel } from "@/lib/tracks/all";
import { hasUnlockedHiddenBonus } from "@/lib/tracks/bonus";

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
  const allLevels = await getLevelsForTrack(track.id);
  const firstBloodByLevelId = await getFirstBloodByLevel();
  const { user } = await getCurrentSession();

  const bonusUnlocked = await hasUnlockedHiddenBonus(user?.id, track.id);

  // Hidden levels never appear in the public table
  const levelRows = allLevels.filter((l) => !isHiddenLevel(l.description));

  let solvedLevelIds = new Set<string>();
  if (user && levelRows.length > 0) {
    const userRows = await db
      .select({ levelId: submissions.levelId })
      .from(submissions)
      .where(eq(submissions.userId, user.id));
    solvedLevelIds = new Set(userRows.map((r) => r.levelId));
  }

  // Chain-intact unlocking mirrors Phantom: level N is playable once N-1 is
  // solved by this user, the lowest idx is always unlocked.
  const levelsByIdx = new Map(levelRows.map((l) => [l.idx, l]));
  const minIdx = levelRows.length > 0
    ? Math.min(...levelRows.map((l) => l.idx))
    : 0;
  const unlockedLevelIds = new Set<string>();
  if (user) {
    for (const l of levelRows) {
      if (l.idx === minIdx) {
        unlockedLevelIds.add(l.id);
        continue;
      }
      const prev = levelsByIdx.get(l.idx - 1);
      if (prev && solvedLevelIds.has(prev.id)) {
        unlockedLevelIds.add(l.id);
      }
    }
    for (const id of solvedLevelIds) unlockedLevelIds.add(id);
  }

  const solveCountRows = await db
    .select({
      levelId: submissions.levelId,
      operatives: count(submissions.userId),
    })
    .from(submissions)
    .groupBy(submissions.levelId);
  const solveCountByLevelId = new Map(
    solveCountRows.map((r) => [r.levelId, Number(r.operatives)]),
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-amber text-xl">Ghost — Linux &amp; Shell Fundamentals</h1>

      <p className="text-sm">
        Ghost is the foundation track of the BreachLab series. Without what it
        teaches, every other track is locked. This is where operatives are
        built — not taught.
      </p>

      <section>
        <h2 className="text-amber text-lg mb-2">Who this is for</h2>
        <p className="text-sm">
          Anyone serious about real security work. It does not matter whether
          you have never opened a terminal before or whether you have been
          writing code for years — if you cannot move through a Linux system
          like it is your second home, the rest of this industry stays out of
          reach. Offensive security, defensive security, incident response,
          cloud, AI security, every single discipline demands the same basic
          fluency. Ghost gives it to you.
        </p>
      </section>

      <section>
        <h2 className="text-amber text-lg mb-2">
          Who we are preparing
        </h2>
        <p className="text-sm">
          BreachLab trains the kind of security specialist that Fortune 500
          companies, cloud providers, and national cyber units all compete for
          and cannot find. Anonymous-level in the literal sense: people who
          can do what others consider impossible because they have actually
          done it on real systems, with no walkthroughs and no safety net.
          Ghost is step one of thirteen. Finish all thirteen and you are a
          T-shaped security operative ready for 2025-2030 — offensive,
          defensive, and everything modern attackers are already using. This is not a
          certificate mill. It is a forge.
        </p>
      </section>

      <section className="border border-border p-4">
        <h2 className="text-amber text-sm uppercase mb-2">SSH Information</h2>
        <dl className="text-sm space-y-1">
          <div>
            <dt className="inline text-muted">Host: </dt>
            <dd className="inline">204.168.229.209</dd>
          </div>
          <div>
            <dt className="inline text-muted">Port: </dt>
            <dd className="inline">2222</dd>
          </div>
          <div>
            <dt className="inline text-muted">User: </dt>
            <dd className="inline">ghost0 (level 0)</dd>
          </div>
          <div>
            <dt className="inline text-muted">Password: </dt>
            <dd className="inline text-amber">ghost0</dd>
          </div>
        </dl>
        <pre className="bg-bg border border-border p-2 text-xs mt-3">
          ssh ghost0@204.168.229.209 -p 2222
        </pre>
      </section>

      <details className="group">
        <summary className="text-amber text-lg mb-2 cursor-pointer select-none list-none flex items-center gap-2 hover:text-amber/80">
          <span className="text-xs inline-block transition-transform group-open:rotate-90">
            ▸
          </span>
          Note for beginners
        </summary>
        <div className="mt-2 space-y-2">
          <p className="text-sm">
            This game, like most other games, is organised in levels. You start
            at Level 0 and try to beat each level in order. Finishing a level
            gives you the password (and a flag) for the next level. On the
            platform, the page for each level tells you its points and whether
            you or anyone has solved it yet.
          </p>
          <p className="text-sm">
            There are several things you can try when you are unsure how to
            continue:
          </p>
          <ul className="list-disc list-outside pl-5 text-sm space-y-1">
            <li>
              First, if you know a command, but don't know how to use it, try the
              manual ({" "}
              <code className="text-amber">man &lt;command&gt;</code>
              ) by entering{" "}
              <code className="text-amber">man command</code>. For example,{" "}
              <code className="text-amber">man ls</code> to learn about the{" "}
              <code className="text-amber">ls</code> command.
            </li>
            <li>
              Second, if there is no manual, the command might be a shell
              built-in. In that case use the{" "}
              <code className="text-amber">help</code> command (e.g.{" "}
              <code className="text-amber">help cd</code>).
            </li>
            <li>
              Also, your favorite search engine is your friend. Learn how to use
              it. Pick a query that teaches you something rather than one that
              hands you the answer.
            </li>
            <li>
              Lastly, if you are still stuck, you can join{" "}
              <a href="/rules">the community</a> — but{" "}
              <strong>do not spoil levels</strong> (see rules).
            </li>
          </ul>
          <p className="text-sm mt-3">
            You're ready to start! Begin with Level 0 using the SSH Information
            above. Good luck!
          </p>
        </div>
      </details>

      <section>
        <h2 className="text-amber text-lg mb-2">Levels</h2>
        <LevelTable
          levels={levelRows}
          solvedLevelIds={solvedLevelIds}
          unlockedLevelIds={unlockedLevelIds}
          authed={!!user}
          firstBloodByLevelId={firstBloodByLevelId}
          solveCountByLevelId={solveCountByLevelId}
        />
      </section>

      {bonusUnlocked && (
        <section className="border border-amber p-4">
          <h2 className="text-amber text-lg mb-1 uppercase">
            Classified — Level 22 unlocked
          </h2>
          <p className="text-sm mb-2">
            Every public gate is behind you. There is one file left on this
            machine that is not yours to read. The system will decide if you
            are allowed to see it.
          </p>
          <a
            href="/tracks/ghost/22"
            className="inline-block border border-amber text-amber px-3 py-1 text-xs uppercase tracking-wider hover:bg-amber/10 hover:border-amber transition-colors"
          >
            [ Proceed to graduation ]
          </a>
        </section>
      )}

      {user ? (
        <p className="text-sm">
          Found a flag? <a href="/submit">Submit it →</a>
        </p>
      ) : (
        <p className="text-sm text-muted">
          <a href="/login">Log in</a> to submit flags and track progress.
        </p>
      )}

      <footer className="pt-6 mt-4 border-t border-border/40">
        <p className="text-[11px] text-muted leading-snug">
          Ghost&apos;s shape draws on{" "}
          <span className="text-text">Bandit</span> by OverTheWire.
          Credit to the OTW team for setting the template.
        </p>
      </footer>
    </div>
  );
}
