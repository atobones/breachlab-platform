import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/session";
import { listWriteups } from "@/lib/writeups";
import { listCommunityWriteups } from "@/lib/community-writeups";
import { listFeaturedAuthors } from "@/lib/featured-authors";
import {
  getCompletedLevelIdxs,
  isCommunityWriteupReadable,
} from "@/lib/writeup-access";
import { WriteupCard } from "@/components/writeups/WriteupCard";
import { FeaturedAuthorCard } from "@/components/writeups/FeaturedAuthorCard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Writeups — BreachLab",
  description:
    "Curated walkthroughs and community contributions. Phantom-tier writeups are gated by level completion.",
};

export default async function WriteupsIndexPage() {
  const { user } = await getCurrentSession();
  const curated = await listWriteups();
  const community = await listCommunityWriteups({ userId: user?.id ?? null });
  const featuredAuthors = await listFeaturedAuthors({ userId: user?.id ?? null });

  const tracks = Array.from(
    new Set([
      ...curated.map((w) => w.track),
      ...community.map((w) => w.trackSlug),
    ]),
  );
  const trackProgress = new Map<string, Set<number>>();
  if (user) {
    for (const t of tracks) {
      trackProgress.set(t, await getCompletedLevelIdxs(user.id, t));
    }
  }

  return (
    <article className="space-y-10 max-w-3xl" data-testid="writeups-index">
      <header className="space-y-3">
        <h1 className="text-amber text-3xl phosphor wordmark">
          <span className="glitch" data-text="Writeups">Writeups</span>
        </h1>
        <p className="text-sm text-muted leading-relaxed">
          Two surfaces: curated walkthroughs from Ato for known chokepoints,
          and community-contributed writeups linking out to authors&apos;
          own knowledge bases. Phantom-tier community writeups are visible
          only after you&apos;ve cleared that specific level — zero spoiler
          risk, retrospective learning only. Ghost is open for everyone.
        </p>
        <p className="text-sm text-muted leading-relaxed">
          Got a writeup of your own? Post in{" "}
          <code className="text-amber">#writeups</code> on Discord or DM{" "}
          <code className="text-amber">@ato</code> — we&apos;ll review and
          publish it here with full attribution and a link back to your site.
        </p>
      </header>

      {featuredAuthors.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-amber text-xl uppercase tracking-wider">
            Featured external knowledge bases
          </h2>
          <ul className="space-y-2">
            {featuredAuthors.map((a) => (
              <li key={a.id}>
                <FeaturedAuthorCard
                  author={a}
                  canStar={!!user}
                  starDisabledReason={!user ? "Log in to star" : undefined}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {curated.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-amber text-xl uppercase tracking-wider">
            Curated by Ato
          </h2>
          <ul className="space-y-2">
            {curated.map((w) => {
              const completed = trackProgress.get(w.track) ?? new Set<number>();
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
                      <span className="text-muted">{w.track} L{w.level}</span>{" "}
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
      ) : null}

      {community.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-amber text-xl uppercase tracking-wider">
            Community writeups
          </h2>
          <ul className="space-y-2">
            {community.map((w) => {
              const completed = trackProgress.get(w.trackSlug) ?? new Set<number>();
              const readable = isCommunityWriteupReadable({
                trackSlug: w.trackSlug,
                levelIdx: w.levelIdx,
                user: user
                  ? { id: user.id, isAdmin: user.isAdmin, isCurator: (user as any).isCurator ?? false }
                  : null,
                completedLevels: completed,
              });
              return (
                <li key={w.id}>
                  <WriteupCard
                    writeup={w}
                    unlocked={readable}
                    unlockHint={
                      user
                        ? `Locked — clear ${w.trackSlug} L${w.levelIdx} to unlock.`
                        : "Log in + clear this level to unlock."
                    }
                    canStar={readable && !!user}
                    starDisabledReason={
                      !user ? "Log in to star" : "Complete this level to star"
                    }
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
