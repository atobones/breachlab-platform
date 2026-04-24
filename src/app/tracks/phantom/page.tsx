import { eq, count } from "drizzle-orm";
import Link from "next/link";
import { getTrackBySlug, getLevelsForTrack } from "@/lib/tracks/queries";
import { PhantomLevelTable } from "@/components/tracks/PhantomLevelTable";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { submissions } from "@/lib/db/schema";
import { getFirstBloodByLevel } from "@/lib/badges/queries";
import { isHiddenLevel } from "@/lib/tracks/all";
import { hasUnlockedHiddenBonus } from "@/lib/tracks/bonus";

export const dynamic = "force-dynamic";

export default async function PhantomTrackPage() {
  const track = await getTrackBySlug("phantom");
  if (!track) {
    return (
      <div className="space-y-4">
        <h1 className="text-red text-xl">Phantom</h1>
        <p className="text-red">
          Track not seeded. Run <code>npm run seed:phantom</code>.
        </p>
      </div>
    );
  }
  const allLevels = await getLevelsForTrack(track.id);
  const firstBloodByLevelId = await getFirstBloodByLevel();
  const { user } = await getCurrentSession();
  const bonusUnlocked = await hasUnlockedHiddenBonus(user?.id, track.id);

  const levelRows = allLevels.filter((l) => !isHiddenLevel(l.description));

  let solvedLevelIds = new Set<string>();
  if (user && levelRows.length > 0) {
    const userRows = await db
      .select({ levelId: submissions.levelId })
      .from(submissions)
      .where(eq(submissions.userId, user.id));
    solvedLevelIds = new Set(userRows.map((r) => r.levelId));
  }

  // Chain-intact unlocking: a level is playable when the previous idx was
  // solved by this user; the first level of the track is always unlocked.
  // Solved levels are always unlocked (redundant, but makes the set the
  // single source of truth for rendering).
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
      <h1 className="text-red text-2xl">
        Phantom — Post-Exploitation &amp; Operational Tradecraft
      </h1>

      <p className="text-sm">
        Ghost ended at &ldquo;you got a shell.&rdquo; Phantom starts there and
        does not stop until the operation is complete. Thirty-two levels teach
        the full discipline of post-exploitation: privilege escalation,
        credential harvesting, persistence, defense evasion, lateral movement
        across multi-host networks, container escape, Kubernetes cluster
        takeover, cloud pivot, data exfiltration, and operational cleanup. This
        is the complete chain a real operator runs against a real compromised
        environment in 2026.
      </p>

      <section>
        <h2 className="text-red text-lg mb-2">Who this is for</h2>
        <p className="text-sm">
          Operatives who have finished Ghost or can do equivalent work on a
          fresh Linux box without thinking. Phantom assumes you live in a
          shell. It will not teach you how to move a file or read a log.
          Phantom teaches what happens after the initial foothold — and it does
          not soften the 2026 reality: modern kernel protections, container
          runtimes, Kubernetes RBAC, cloud IAM, and the specific CVEs that
          still matter this year.
        </p>
      </section>

      <section>
        <h2 className="text-red text-lg mb-2">Five acts, one operation</h2>
        <p className="text-sm mb-3">
          Phantom is structured as a single escalating operation. Each act
          builds on the last. By graduation you will have executed the full
          attack lifecycle.
        </p>
        <ul className="space-y-3 text-sm">
          <li className="flex items-start gap-3">
            <span className="text-red font-bold shrink-0 w-8 text-right">I.</span>
            <span>
              <strong className="text-red">Escalation</strong> (0–9) — Ten
              levels covering every real-world privilege escalation vector:
              SUID/GTFOBins, sudo misconfigurations, library hijacking,
              capabilities, writable sensitive files, cron and systemd abuse,
              polkit CVEs, ptrace injection, and kernel exploits.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-red font-bold shrink-0 w-8 text-right">II.</span>
            <span>
              <strong className="text-red">Harvest &amp; Persist</strong>{" "}
              (10–15) — Six levels on credential harvesting (memory dumps, SSH
              keys, tokens, config files), persistence mechanisms (SSH, cron,
              systemd, PAM backdoors), defense evasion (auditd bypass, LOLBins,
              fileless execution), and anti-forensics (log wipe, timestomping).
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-red font-bold shrink-0 w-8 text-right">III.</span>
            <span>
              <strong className="text-red">Lateral Movement</strong> (16–19) —
              Four levels on SSH tunneling, ligolo-ng, internal network
              reconnaissance, credential spraying, and a full three-machine
              pivot chain.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-red font-bold shrink-0 w-8 text-right">IV.</span>
            <span>
              <strong className="text-red">Container &amp; Cloud</strong>{" "}
              (20–26) — Seven levels covering container detection, Docker
              socket and privileged escapes, Leaky Vessels CVE-2024, exposed
              Docker API, Kubernetes pod escape, cluster takeover via service
              account abuse, and cloud IAM pivot through IMDS.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-red font-bold shrink-0 w-8 text-right">V.</span>
            <span>
              <strong className="text-red">Operations</strong> (27–31) — Five
              levels on custom tooling, data exfiltration (DNS/HTTPS/ICMP),
              network traffic interception, multi-host cleanup, and a
              time-limited graduation mission across the full attack chain.
            </span>
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-red text-lg mb-2">What Phantom makes of you</h2>
        <p className="text-sm mb-2">
          Thirty-one public levels plus one hidden graduation. After Phantom
          you can:
        </p>
        <ul className="list-disc list-outside pl-5 text-sm space-y-1">
          <li>
            Walk onto any Linux host with an unprivileged shell and identify
            every realistic escalation path in under ten minutes.
          </li>
          <li>
            Exploit SUID binaries, sudo rules, capabilities, writable files,
            cron jobs, and kernel CVEs — the full privesc arsenal.
          </li>
          <li>
            Harvest credentials from memory, history files, config files,
            environment variables, SSH keys, and service tokens.
          </li>
          <li>
            Install persistence that survives reboots and detection — SSH keys,
            cron, systemd, PAM backdoors.
          </li>
          <li>
            Operate invisibly: bypass auditd, use LOLBins, execute fileless
            payloads, and clean every log artifact.
          </li>
          <li>
            Pivot through multi-segment networks using SSH tunnels, ligolo-ng,
            and covert channels.
          </li>
          <li>
            Detect that you are inside a container, identify the runtime, and
            escape through five distinct techniques.
          </li>
          <li>
            Escape a Kubernetes pod, reach the API server with curl and a
            service account token, and take over the cluster.
          </li>
          <li>
            Harvest cloud credentials from IMDS and pivot into cloud
            infrastructure.
          </li>
          <li>
            Write custom reverse shells, adapt public exploits, and build
            simple C2 callbacks.
          </li>
          <li>
            Exfiltrate data through DNS tunneling, HTTPS, and ICMP — the
            channels that bypass every firewall.
          </li>
          <li>
            Clean up a multi-host operation leaving zero forensic artifacts.
          </li>
        </ul>
      </section>

      <section className="border border-border p-4">
        <h2 className="text-red text-sm uppercase mb-2">SSH Information</h2>
        <dl className="text-sm space-y-1">
          <div>
            <dt className="inline text-muted">Host: </dt>
            <dd className="inline">204.168.229.209</dd>
          </div>
          <div>
            <dt className="inline text-muted">Main track (L0–L12, L16–L29): </dt>
            <dd className="inline">port 2223</dd>
          </div>
          <div>
            <dt className="inline text-muted">Ephemeral L13 (Deep Roots): </dt>
            <dd className="inline">port 2224</dd>
          </div>
          <div>
            <dt className="inline text-muted">Ephemeral L14 (Shadow Mode): </dt>
            <dd className="inline">port 2225</dd>
          </div>
          <div>
            <dt className="inline text-muted">Ephemeral L15 (Clean Slate): </dt>
            <dd className="inline">port 2226</dd>
          </div>
          <div>
            <dt className="inline text-muted">Ephemeral L30 (Clean Exit): </dt>
            <dd className="inline">port 2227</dd>
          </div>
          <div>
            <dt className="inline text-muted">Entry user: </dt>
            <dd className="inline">phantom0</dd>
          </div>
          <div>
            <dt className="inline text-muted">Password: </dt>
            <dd className="inline text-amber">phantom0</dd>
          </div>
        </dl>
        <pre className="bg-bg border border-border p-2 text-xs mt-3">
          ssh phantom0@204.168.229.209 -p 2223
        </pre>
        <p className="text-xs text-muted mt-2">
          L13 / L14 / L15 / L30 each spawn a fresh ephemeral container on
          their own port — one connect per box, disappears on disconnect.
          Land on the expected port once you reach that level.
        </p>
      </section>

      <section>
        <h2 className="text-red text-lg mb-2">Levels</h2>
        <PhantomLevelTable
          levels={levelRows}
          solvedLevelIds={solvedLevelIds}
          unlockedLevelIds={unlockedLevelIds}
          authed={!!user}
          firstBloodByLevelId={firstBloodByLevelId}
          solveCountByLevelId={solveCountByLevelId}
        />
      </section>

      {bonusUnlocked && (
        <section className="border border-red p-4">
          <h2 className="text-red text-lg mb-1 uppercase">
            Graduation — Level 31 unlocked
          </h2>
          <p className="text-sm mb-2">
            Every public gate is behind you. The final operation awaits —
            multiple machines, time limit, detection score. Clear it and you
            are a Phantom Operative.
          </p>
          <Link
            href="/tracks/phantom/31"
            className="inline-block border border-red text-red px-3 py-1 text-xs uppercase tracking-wider hover:bg-red/10 hover:border-red transition-colors"
          >
            [ Proceed to graduation ]
          </Link>
        </section>
      )}

      <section>
        <p className="text-sm">
          <Link href="/tracks/phantom/graduates" className="text-red">
            Phantom Operatives — Honor Roll →
          </Link>
        </p>
      </section>

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
