import { eq } from "drizzle-orm";
import Link from "next/link";
import { getTrackBySlug, getLevelsForTrack } from "@/lib/tracks/queries";
import { PhantomLevelTable } from "@/components/tracks/PhantomLevelTable";
import { TierBadge } from "@/components/tracks/TierBadge";
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

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-red text-2xl">
        Phantom — Post-Exploitation &amp; Container Escape
      </h1>

      <p className="text-sm">
        Phantom is the second BreachLab track. Ghost ended at &ldquo;you got a
        shell&rdquo;. Phantom starts there. Twenty-one levels teach the full
        discipline of post-exploitation: Linux privilege escalation, container
        escape on modern runtimes, Kubernetes pod escape, and kubectl-free
        cluster pivot — the exact chain a real operator runs against a real
        compromised pod in a real 2026 incident.
      </p>

      <section>
        <h2 className="text-red text-lg mb-2">Who this is for</h2>
        <p className="text-sm">
          Operatives who have already finished Ghost or can do equivalent work
          on a fresh Linux box without thinking. Phantom assumes you already
          live in a shell — it will not teach you how to move a file or read a
          log. Phantom teaches what happens after, and it does not soften the
          2026 reality: container runtimes, Linux capabilities, cgroups,
          Kubernetes service account tokens, and the specific runc, polkit,
          and sudo CVEs that still matter this year.
        </p>
      </section>

      <section>
        <h2 className="text-red text-lg mb-2">Difficulty tiers</h2>
        <p className="text-sm mb-3">
          Every Phantom level is labelled with one of four tiers. Each tier
          changes one thing about how you approach the level.
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-3">
            <TierBadge tier="recruit" />
            <span>
              Single primitive, mitigations off, reachable in under fifteen
              minutes if you know the concept. No hints. Five levels.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <TierBadge tier="operator" />
            <span>
              Mitigations on, realistic 2026 hardening, 2–3 step chains. A
              single &ldquo;show approach&rdquo; hint unlocks after twenty
              minutes — category-only, never commands. Eight levels. This is
              the honest learning zone.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <TierBadge tier="phantom" />
            <span>
              Recent-CVE, chained, prestige-grade. No hints. Six levels
              covering the full modern container-escape surface.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <TierBadge tier="graduate" />
            <span>
              Kubectl-free Kubernetes escape and the final chained graduation
              lab. Two levels. One earns you the{" "}
              <span className="text-red font-bold">Phantom Operative</span>{" "}
              badge and a signed certificate.
            </span>
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-red text-lg mb-2">What Phantom makes of you</h2>
        <p className="text-sm mb-2">
          Twenty public levels plus one hidden graduation. After Phantom you
          can:
        </p>
        <ul className="list-disc list-outside pl-5 text-sm space-y-1">
          <li>
            Walk onto any Linux host you have unprivileged access on and list
            the five realistic privilege-escalation paths in under ten minutes.
          </li>
          <li>
            Identify dangerous sudo rules (NOPASSWD, env_keep, wildcard
            injection, sudoedit quirks) and turn them into root in one attempt.
          </li>
          <li>
            Read Linux capabilities and know which ones are trivially
            exploitable with a one-liner script.
          </li>
          <li>
            Exploit classic local authentication services when they ship
            broken — the CVEs every Linux desktop inherits.
          </li>
          <li>
            Attach to a running root process with live code injection using
            the debugger interface alone.
          </li>
          <li>
            Recognise that you are inside a container, enumerate the container
            runtime, and pick the fastest escape path given the current
            misconfigurations.
          </li>
          <li>
            Escape a container through a mounted control socket, a
            &ldquo;privileged&rdquo; flag, a legacy cgroup interface, a
            runtime-level CVE replay, and the 2024 headline file-descriptor
            leak — five distinct techniques.
          </li>
          <li>
            Escape a Kubernetes pod using misconfigured host-namespace flags
            and land in the host&rsquo;s init process namespace.
          </li>
          <li>
            Reach the Kubernetes API from inside a pod using only curl and a
            service account token, create a privileged workload, and harvest
            secrets from the control plane.
          </li>
          <li>
            Collect cloud IAM credentials from a node&rsquo;s metadata service
            — and understand exactly where Phantom ends and the Mirage cloud
            track begins.
          </li>
        </ul>
      </section>

      <section className="border border-border p-4">
        <h2 className="text-red text-sm uppercase mb-2">SSH Information</h2>
        <dl className="text-sm space-y-1">
          <div>
            <dt className="inline text-muted">Host: </dt>
            <dd className="inline">phantom.breachlab.org</dd>
          </div>
          <div>
            <dt className="inline text-muted">Port: </dt>
            <dd className="inline">2223</dd>
          </div>
          <div>
            <dt className="inline text-muted">User: </dt>
            <dd className="inline">phantom0 (level 0)</dd>
          </div>
          <div>
            <dt className="inline text-muted">Password: </dt>
            <dd className="inline text-amber">phantom0</dd>
          </div>
        </dl>
        <pre className="bg-bg border border-border p-2 text-xs mt-3">
          ssh phantom0@phantom.breachlab.org -p 2223
        </pre>
        <p className="text-[10px] text-muted italic mt-2">
          SSH endpoint is being provisioned. Platform content and tooling are
          live; the vulnerable infrastructure container ships in the next ops
          sprint. Follow @BreachLab for launch announcement.
        </p>
      </section>

      <section>
        <h2 className="text-red text-lg mb-2">Levels</h2>
        <PhantomLevelTable
          levels={levelRows}
          solvedLevelIds={solvedLevelIds}
          firstBloodByLevelId={firstBloodByLevelId}
        />
      </section>

      {bonusUnlocked && (
        <section className="border border-red p-4">
          <h2 className="text-red text-lg mb-1 uppercase">
            Graduation — Level 20 unlocked
          </h2>
          <p className="text-sm mb-2">
            Every public gate is behind you. The final chained graduation
            mission awaits. Clear it and you are a Phantom Operative.
          </p>
          <Link
            href="/tracks/phantom/20"
            className="inline-block border border-red text-red px-3 py-1 text-xs uppercase tracking-wider hover:bg-red hover:text-bg"
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
