import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/session";
import { loadWriteup } from "@/lib/writeups";
import { listCommunityWriteups } from "@/lib/community-writeups";
import {
  getCompletedLevelIdxs,
  isCommunityWriteupReadable,
} from "@/lib/writeup-access";
import { WriteupCard } from "@/components/writeups/WriteupCard";

export const dynamic = "force-dynamic";

type Params = { track: string; level: string };

export default async function WriteupLevelPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { track, level } = await params;
  const levelIdx = Number(level);
  if (!Number.isFinite(levelIdx) || levelIdx < 0) notFound();

  const { user } = await getCurrentSession();
  const curated = await loadWriteup(track, levelIdx);
  const community = await listCommunityWriteups({
    trackSlug: track,
    levelIdx,
    userId: user?.id ?? null,
  });

  if (!curated && community.length === 0) notFound();

  const completed = user
    ? await getCompletedLevelIdxs(user.id, track)
    : new Set<number>();

  return (
    <article className="space-y-8 max-w-3xl">
      <header className="space-y-2">
        <Link href="/writeups" className="text-xs text-muted hover:underline">
          ← All writeups
        </Link>
        <h1 className="text-amber text-2xl phosphor">
          {track} L{levelIdx}
        </h1>
      </header>

      {curated ? (
        <section className="space-y-3">
          <h2 className="text-amber text-lg uppercase tracking-wider">
            Curated by BreachLab
          </h2>
          <div
            className="prose prose-invert max-w-none text-sm"
            dangerouslySetInnerHTML={{ __html: curated.html }}
          />
        </section>
      ) : null}

      {community.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-amber text-lg uppercase tracking-wider">
            Community writeups
          </h2>
          <ul className="space-y-2">
            {community.map((w) => {
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
                    currentUserIsCurator={!!(user as any)?.isCurator}
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
