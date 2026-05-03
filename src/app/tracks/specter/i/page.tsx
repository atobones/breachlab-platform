import { eq, count } from "drizzle-orm";
import Link from "next/link";
import { getTrackBySlug, getLevelsForTrack } from "@/lib/tracks/queries";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { submissions } from "@/lib/db/schema";
import { getFirstBloodByLevel } from "@/lib/badges/queries";
import { SpecterLevelTable } from "@/components/tracks/SpecterLevelTable";
import { SpecterBootstrapToken } from "@/components/dashboard/SpecterBootstrapToken";
import { DISCORD_INVITE_URL } from "@/lib/links";

export const dynamic = "force-dynamic";

export default async function SpecterIPage() {
  const track = await getTrackBySlug("specter");
  if (!track) {
    return (
      <div className="space-y-4">
        <h1 className="text-amber text-xl">Specter I</h1>
        <p className="text-red">
          Track not seeded. Run <code>npm run seed:specter</code>.
        </p>
      </div>
    );
  }

  const allLevels = await getLevelsForTrack(track.id);
  const firstBloodByLevelId = await getFirstBloodByLevel();
  const { user } = await getCurrentSession();

  // Specter I is L0..L13. Filter the wider Specter track if other
  // sub-tracks ever land in the same `levels` table.
  const levelRows = allLevels.filter((l) => l.idx >= 0 && l.idx <= 13);

  let solvedLevelIds = new Set<string>();
  if (user && levelRows.length > 0) {
    const userRows = await db
      .select({ levelId: submissions.levelId })
      .from(submissions)
      .where(eq(submissions.userId, user.id));
    solvedLevelIds = new Set(userRows.map((r) => r.levelId));
  }

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
    <div className="space-y-12 max-w-3xl">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <h1 className="text-amber text-2xl">Specter I — OSINT</h1>
          <span className="text-xs uppercase tracking-wider px-2 py-0.5 border border-green text-green">
            Live
          </span>
        </div>
        <p className="text-sm text-muted">
          Fourteen levels. Passive intelligence at professional grade. Built for
          operatives who will be asked to investigate real targets, not pass a
          quiz.
        </p>
      </header>

      {user && <SpecterBootstrapToken />}

      <section className="space-y-3">
        <p className="text-sm">
          Most OSINT training teaches you to type queries into search engines.
          That is the first ten percent. The other ninety percent — source
          independence, calibrated confidence, operational discipline against a
          target who counter-investigates, defensible documentation — is where
          professionals actually live, and where almost no public course goes.
        </p>
        <p className="text-sm">
          Specter I goes there. By the time you finish the capstone, your
          findings stand up to legal scrutiny, your tradecraft survives
          adversarial counter-intelligence, and your written report meets
          Berkeley Protocol standards.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-amber text-lg">What makes this different</h2>
        <ul className="space-y-3 text-sm">
          <li className="border-l-2 border-amber pl-3">
            <strong className="text-amber">
              Operational discipline graded throughout.
            </strong>{" "}
            EXIF leaks, persona-real-account cross-pollination, query timing
            patterns — all detected and scored. No other training treats analyst
            OPSEC as a graded outcome.
          </li>
          <li className="border-l-2 border-amber pl-3">
            <strong className="text-amber">Adversarial targets.</strong> From
            level twelve onward you face counter-intelligence: canary tokens,
            dangle accounts, watermarked documents, fake leaks. Detect the trap
            or trip the alarm.
          </li>
          <li className="border-l-2 border-amber pl-3">
            <strong className="text-amber">
              Calibrated confidence required.
            </strong>{" "}
            Every claim from level four onward carries a word-of-estimative-
            probability rating (Admiralty A1–F6). Overconfident wrong answers
            cost more than honest uncertainty.
          </li>
          <li className="border-l-2 border-amber pl-3">
            <strong className="text-amber">
              Berkeley Protocol report at graduation.
            </strong>{" "}
            The capstone requires a written intelligence package with chain of
            custody, source documentation, and alternative-hypothesis
            consideration. Defensible methodology, not just a flag.
          </li>
          <li className="border-l-2 border-amber pl-3">
            <strong className="text-amber">
              Quarterly errata, public dashboard.
            </strong>{" "}
            OSINT tools rot fast. Twitter API, CrowdTangle, half of 2018&apos;s
            stack — all dead. Our errata page is public; we re-shoot levels
            when the underlying primitive shifts. No 2018 advice in 2026
            wrapping.
          </li>
        </ul>
      </section>

      <section className="border border-border p-4 space-y-2">
        <h2 className="text-amber text-sm uppercase">SSH</h2>
        <dl className="text-sm space-y-1">
          <div>
            <dt className="inline text-muted">Host: </dt>
            <dd className="inline">204.168.229.209</dd>
          </div>
          <div>
            <dt className="inline text-muted">Levels L0–L13: </dt>
            <dd className="inline">ports 2230–2243 (one per level)</dd>
          </div>
          <div>
            <dt className="inline text-muted">L0 entry user: </dt>
            <dd className="inline">specter0</dd>
          </div>
          <div>
            <dt className="inline text-muted">L0 password: </dt>
            <dd className="inline text-amber">
              bootstrap token (Generate above)
            </dd>
          </div>
        </dl>
        <pre className="bg-bg border border-border p-2 text-xs mt-3">
          ssh specter0@204.168.229.209 -p 2230
        </pre>
        <p className="text-xs mt-2">
          <span className="text-amber">From L1 onward:</span> solve the level
          inside the ephemeral, the verifier prints a per-player flag.{" "}
          <Link href="/submit" className="text-amber underline">
            Submit the flag at /submit
          </Link>
          {" "}— the response reveals the L<sub>n+1</sub> SSH password
          (different string from the flag, also per-player HMAC). Use that
          password to SSH into the next level. Leaking a flag in Discord
          unlocks nothing for the leaker — every player has their own
          chain.
        </p>
        <p className="text-xs text-muted mt-2">
          Each connection
          spawns a fresh ephemeral container; disconnect tears it down.
        </p>
      </section>

      <section>
        <h2 className="text-amber text-lg mb-2">Levels</h2>
        <SpecterLevelTable
          levels={levelRows}
          solvedLevelIds={solvedLevelIds}
          unlockedLevelIds={unlockedLevelIds}
          authed={!!user}
          firstBloodByLevelId={firstBloodByLevelId}
          solveCountByLevelId={solveCountByLevelId}
        />
      </section>

      <section className="space-y-3 border border-green p-4">
        <h2 className="text-green text-lg">Status — Live</h2>
        <p className="text-sm">
          Specter I is live. All fourteen levels are accessible via per-session
          ephemeral containers; each level passes our 27-class security audit
          before it ships. Sessions are isolated per player — no shared shell,
          no cross-contamination, no flag sharing.
        </p>
        <p className="text-sm text-muted">
          If a level is briefly unreachable during a rolling deploy, retry in
          a few minutes — sessions are stateless, your chain progress is
          preserved server-side.
        </p>
      </section>

      {user ? (
        <p className="text-sm">
          Found a flag?{" "}
          <Link href="/submit" className="text-amber underline">
            Submit it →
          </Link>
        </p>
      ) : (
        <p className="text-sm text-muted">
          <Link href="/login" className="text-amber underline">
            Log in
          </Link>{" "}
          to submit flags and track progress.
        </p>
      )}

      <footer className="border-t border-border pt-4 space-y-2">
        <p className="text-sm">
          Connect via{" "}
          <Link
            href="/dashboard"
            className="text-amber hover:underline"
          >
            your dashboard
          </Link>{" "}
          for the per-player SSH commands, or{" "}
          <a
            href={DISCORD_INVITE_URL}
            className="text-amber hover:underline"
            rel="noreferrer"
          >
            join the Discord
          </a>{" "}
          for first-blood announcements.
        </p>
        <p className="text-xs text-muted">
          <Link href="/tracks/specter" className="text-amber hover:underline">
            ← Back to Specter overview
          </Link>
        </p>
      </footer>
    </div>
  );
}
