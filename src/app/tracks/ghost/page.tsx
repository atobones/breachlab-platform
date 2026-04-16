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
        <h2 className="text-amber text-lg mb-2">What Ghost makes of you</h2>
        <p className="text-sm mb-2">
          Twenty-two levels. No hand-holding. No walkthroughs. After Ghost
          you will not be a beginner any more — you will be an operative
          with the foundation that every other BreachLab track builds on.
          Concretely, by the end of Ghost you can:
        </p>
        <ul className="list-disc list-outside pl-5 text-sm space-y-1">
          <li>
            Land on a Linux box you have never seen before and get your
            bearings fast — files, processes, network, users, permissions.
          </li>
          <li>
            Handle shell weirdness — filenames with spaces, quoting, pipes,
            redirection — without panicking.
          </li>
          <li>
            Pull secrets out of environment variables, hidden files, and
            running processes, the way a real responder or attacker does.
          </li>
          <li>
            Hunt through thousands of log lines and find the one that
            matters — the core loop of every SOC analyst on earth.
          </li>
          <li>
            Recognise encoded data (hex, base64, multi-layer compression)
            and peel it apart without writing any code of your own.
          </li>
          <li>
            Talk to services over raw TCP and TLS from the command line —
            no client libraries, no tooling crutches.
          </li>
          <li>
            Use SSH key authentication — the way every production server on
            the planet actually authenticates people.
          </li>
          <li>
            Scan a port range, tell the difference between a refused,
            filtered, and open-but-weird port, and identify what is
            listening.
          </li>
          <li>
            Work inside a restricted environment that tries to kick you
            out, and still get useful work done — the skill every bastion
            and container demands.
          </li>
          <li>
            Read Linux permissions, including SUID, and recognise when a
            binary is a privilege escalation opportunity — the bridge into
            the Phantom track.
          </li>
          <li>
            Write your first real script. Automate something you cannot do
            by hand. The exact moment you stop being a user of other
            people's tools and start being an engineer.
          </li>
          <li>
            Find scheduled tasks (cron) and understand why they are the #1
            persistence and privilege escalation vector on Linux.
          </li>
          <li>
            Use <code className="text-amber">git</code> to dig through the
            history of a dirty repository — the exact technique behind
            every real-world secrets leak from 2024 onward and the bridge
            into the Nexus (CI/CD) track.
          </li>
          <li>
            Use <code className="text-amber">/proc</code> to reason about
            what the system is doing right now — the core of modern
            forensics and fileless malware analysis.
          </li>
        </ul>
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
          Ghost is step one of seven. Finish all seven and you are a T-shaped
          security operative ready for 2025-2030 — offensive, defensive, and
          everything modern attackers are already using. This is not a
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

      <section>
        <h2 className="text-amber text-lg mb-2">Note for beginners</h2>
        <p className="text-sm mb-2">
          This game, like most other games, is organised in levels. You start
          at Level 0 and try to beat each level in order. Finishing a level
          gives you the password (and a flag) for the next level. On the
          platform, the page for each level tells you its points and whether
          you or anyone has solved it yet.
        </p>
        <p className="text-sm mb-2">
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
      </section>

      <section>
        <h2 className="text-amber text-lg mb-2">Levels</h2>
        <LevelTable
          levels={levelRows}
          solvedLevelIds={solvedLevelIds}
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
            className="inline-block border border-amber text-amber px-3 py-1 text-xs uppercase tracking-wider hover:bg-amber hover:text-bg"
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
    </div>
  );
}
