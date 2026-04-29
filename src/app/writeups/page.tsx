import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/session";
import { listWriteups } from "@/lib/writeups";
import { getCompletedLevelIdxs } from "@/lib/writeup-access";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Writeups — BreachLab",
  description: "Curated walkthroughs for chokepoint levels. Gated by track progress.",
};

export default async function WriteupsIndexPage() {
  const writeups = await listWriteups();
  const { user } = await getCurrentSession();

  const trackProgress = new Map<string, Set<number>>();
  if (user) {
    const tracks = Array.from(new Set(writeups.map((w) => w.track)));
    for (const t of tracks) {
      trackProgress.set(t, await getCompletedLevelIdxs(user.id, t));
    }
  }

  const grouped = new Map<string, typeof writeups>();
  for (const w of writeups) {
    if (!grouped.has(w.track)) grouped.set(w.track, []);
    grouped.get(w.track)!.push(w);
  }

  return (
    <article className="space-y-8 max-w-3xl" data-testid="writeups-index">
      <header className="space-y-3">
        <h1 className="text-amber text-3xl phosphor wordmark">
          <span className="glitch" data-text="Writeups">Writeups</span>
        </h1>
        <p className="text-sm text-muted leading-relaxed">
          Curated walkthroughs for the levels where good operators get
          genuinely stuck. Each writeup is gated behind the prior level —
          you have to clear L(N-1) before L(N) opens. This isn&apos;t
          gatekeeping; it&apos;s how we keep these from becoming a
          Google-search cheat path while still helping people who hit a
          real wall.
        </p>
        <p className="text-sm text-muted leading-relaxed">
          We don&apos;t publish writeups for Ghost or for any introductory
          level. Frustration on those is the lesson. We do publish for
          senior-track chokepoints where a conceptual lock — not effort —
          is what stops you.
        </p>
      </header>

      {!user ? (
        <section className="border border-amber/30 px-4 py-3 text-sm text-muted">
          <Link href="/login" className="text-amber hover:underline">
            Log in
          </Link>{" "}
          to view writeups for levels you&apos;ve completed.
        </section>
      ) : null}

      {Array.from(grouped.entries()).map(([track, items]) => {
        const completed = trackProgress.get(track) ?? new Set<number>();
        return (
          <section key={track} className="space-y-3">
            <h2 className="text-amber text-xl uppercase tracking-wider">
              {track}
            </h2>
            <ul className="space-y-2">
              {items.map((w) => {
                const unlocked =
                  user &&
                  (user.isAdmin ||
                    w.prereqLevels.every((l) => completed.has(l)));
                return (
                  <li
                    key={w.slug}
                    className="border border-border px-4 py-3 flex flex-col gap-1"
                  >
                    <div className="flex items-baseline justify-between gap-3 flex-wrap">
                      <div className="text-sm">
                        <span className="text-muted">L{w.level}</span>{" "}
                        {unlocked ? (
                          <Link
                            href={`/writeups/${w.track}/${w.level}`}
                            className="text-amber hover:underline"
                          >
                            {w.title}
                          </Link>
                        ) : (
                          <span className="text-text">{w.title}</span>
                        )}
                      </div>
                      <span className="text-xs uppercase tracking-wider text-muted">
                        {w.difficulty} · {w.estimatedTime}
                      </span>
                    </div>
                    {!unlocked ? (
                      <p className="text-xs text-muted">
                        {user
                          ? `Locked — clear ${w.track} L${w.prereqLevels.join(", L")} to unlock.`
                          : "Locked — log in + clear prerequisites to unlock."}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </article>
  );
}
