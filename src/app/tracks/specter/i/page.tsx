import { eq, count } from "drizzle-orm";
import Link from "next/link";
import { getTrackBySlug, getLevelsForTrack } from "@/lib/tracks/queries";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { submissions } from "@/lib/db/schema";
import { getFirstBloodByLevel } from "@/lib/badges/queries";
import { SpecterLevelTable } from "@/components/tracks/SpecterLevelTable";
import { SpecterTokenIssuer } from "@/components/specter/SpecterTokenIssuer";
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

  // Specter I track go-live 2026-05-11 — L0-L13 all shipped + audited.
  // Allowlist gates removed (track-gating discipline satisfied per
  // feedback_breachlab_specter_gated_until_full_track). Rollback:
  // restore prior block from git history + populate env vars to lock.
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
        <h1 className="text-amber text-2xl">Specter I — OSINT</h1>
        <p className="text-sm text-muted">
          Fourteen levels. Passive intelligence at professional grade. Built for
          operatives who will be asked to investigate real targets, not pass a
          quiz.
        </p>
      </header>

      <aside className="relative border border-amber/30 bg-amber/[0.02] px-5 sm:px-6 pt-5 pb-5 space-y-3">
        <span aria-hidden className="absolute -top-px -left-px h-2 w-2 border-t border-l border-amber" />
        <span aria-hidden className="absolute -top-px -right-px h-2 w-2 border-t border-r border-amber" />
        <span aria-hidden className="absolute -bottom-px -left-px h-2 w-2 border-b border-l border-amber" />
        <span aria-hidden className="absolute -bottom-px -right-px h-2 w-2 border-b border-r border-amber" />
        <div className="text-[10px] text-amber/80 tracking-[0.3em] uppercase font-mono">
          ▸ briefing
        </div>
        <p className="text-sm leading-relaxed">
          Most OSINT training stops at typing queries into search engines —
          ten percent of the job. The other ninety — source independence,
          calibrated confidence, OPSEC against a target who
          counter-investigates, defensible documentation — is where
          professionals live and where almost no public course goes.
        </p>
        <p className="text-sm leading-relaxed">
          Specter I goes there. By the capstone, your findings hold under
          legal scrutiny, your tradecraft survives adversarial
          counter-intelligence, and your report meets Berkeley Protocol
          standards.
        </p>
      </aside>

      <details className="group border border-border open:border-amber/40 transition-colors">
        <summary className="cursor-pointer select-none list-none px-4 py-3 flex items-center justify-between gap-3 hover:bg-amber/[0.02]">
          <h2 className="text-amber text-lg">What makes this different</h2>
          <span aria-hidden className="text-amber text-xs transition-transform group-open:rotate-90">
            ▸
          </span>
        </summary>
        <ul className="space-y-3 text-sm px-4 pb-4 pt-1">
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
      </details>

      <details className="group border border-border open:border-amber/40 transition-colors">
        <summary className="cursor-pointer select-none list-none px-4 py-3 flex items-center justify-between gap-3 hover:bg-amber/[0.02]">
          <h2 className="text-amber text-sm uppercase tracking-wider">Toolkit</h2>
          <span aria-hidden className="text-amber text-xs transition-transform group-open:rotate-90">
            ▸
          </span>
        </summary>
        <div className="px-4 pb-4 pt-1 space-y-3">
        <p className="text-xs text-muted">
          Every Specter I ephemeral ships with the core OSINT/recon
          toolkit pre-installed. No package install required, no internet
          to PyPI from inside — everything you need to solve the level is
          on disk when you connect.
        </p>
        <dl className="text-sm space-y-1 font-mono">
          <div>
            <dt className="inline text-muted">HTTP &amp; download: </dt>
            <dd className="inline">curl, wget</dd>
          </div>
          <div>
            <dt className="inline text-muted">DNS &amp; whois: </dt>
            <dd className="inline">dig, nslookup, whois</dd>
          </div>
          <div>
            <dt className="inline text-muted">JSON &amp; YAML: </dt>
            <dd className="inline">jq, python3 -m json.tool, python3-yaml</dd>
          </div>
          <div>
            <dt className="inline text-muted">Text &amp; viewing: </dt>
            <dd className="inline">cat, less, head, tail, grep, awk, sed, sort, uniq</dd>
          </div>
          <div>
            <dt className="inline text-muted">Files &amp; search: </dt>
            <dd className="inline">find, file, xargs</dd>
          </div>
          <div>
            <dt className="inline text-muted">Net diagnostics: </dt>
            <dd className="inline">nc (netcat), ip, ss</dd>
          </div>
          <div>
            <dt className="inline text-muted">Code &amp; scripting: </dt>
            <dd className="inline">git, python3, python3-requests</dd>
          </div>
          <div>
            <dt className="inline text-muted">Editors: </dt>
            <dd className="inline">vim, nano</dd>
          </div>
        </dl>
        <p className="text-xs text-muted pt-2 border-t border-border/40">
          <span className="text-amber">Level-specific additions:</span>{" "}
          L6 ships <code>exiftool</code> + <code>imagemagick</code> for
          image forensics; L7 adds <code>python3-pil</code> for synthetic-
          media analysis; L10 adds <code>binwalk</code>,{" "}
          <code>gnupg2</code>, <code>openssl</code>, and routes via
          per-spawn Tor side-cars. Each level&apos;s brief lists what is
          additionally available.
        </p>
        <p className="text-xs text-muted">
          <span className="text-amber">Verifier:</span> every level ships
          a local <code>/opt/verify-&lt;slug&gt;.sh</code>{" "}
          (e.g. <code>/opt/verify-paper-trail.sh</code>,{" "}
          <code>/opt/verify-image-geo.sh</code>) that consumes the
          evidence files described in the brief and prints either
          findings or the level flag. Per-player flags — sharing them
          won&apos;t unlock anyone else&apos;s chain.
        </p>
        </div>
      </details>

      <section className="border border-border p-4 space-y-3">
        <h2 className="text-amber text-sm uppercase tracking-wider">SSH access</h2>
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
            <dd className="inline text-amber">bootstrap token (below)</dd>
          </div>
        </dl>
        {user && <SpecterTokenIssuer />}
        <div className="pt-3 mt-1 border-t border-border/40 space-y-2">
          <p className="text-xs">
            <span className="text-amber">From L1 onward:</span> solve the
            level, take the flag the verifier prints, and{" "}
            <Link href="/submit" className="text-amber underline">
              submit it at /submit
            </Link>
            . The response gives you the next level&apos;s SSH password.
            Flags and passwords are per-player.
          </p>
          <p className="text-xs text-muted">
            Each SSH connection spawns a fresh ephemeral container;
            disconnect tears it down.
          </p>
        </div>
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
