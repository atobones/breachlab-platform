import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuthorByUsername } from "@/lib/authors";
import { listCommunityWriteups } from "@/lib/community-writeups";
import { getFeaturedAuthorByUsername } from "@/lib/featured-authors";
import { getCurrentSession } from "@/lib/auth/session";
import { AuthorStarButton } from "@/components/writeups/AuthorStarButton";

export const dynamic = "force-dynamic";

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

type Params = { username: string };

export default async function AuthorPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { username } = await params;
  const author = await getAuthorByUsername(username);
  if (!author) notFound();

  const { user } = await getCurrentSession();
  const featured = await getFeaturedAuthorByUsername(username, {
    userId: user?.id ?? null,
  });
  const all = await listCommunityWriteups({ userId: user?.id ?? null });
  const mine = all.filter((w) => w.author.id === author.id);

  const writeupStars = mine.reduce((acc, w) => acc + w.weightedScore, 0);
  const totalStars = writeupStars + (featured?.weightedScore ?? 0);

  return (
    <article className="space-y-6 max-w-3xl">
      <header className="space-y-2">
        <h1 className="text-amber text-2xl phosphor">{author.username}</h1>
        {author.isCurator ? (
          <span className="text-xs text-amber">★ Curator</span>
        ) : null}
        {author.bio ? (
          <p className="text-sm text-muted leading-relaxed">{author.bio}</p>
        ) : null}
        {author.siteUrl ? (
          <a
            href={author.siteUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-sm text-amber hover:underline"
          >
            {author.siteUrl} →
          </a>
        ) : null}
        <p className="text-xs text-muted">
          {mine.length} writeup{mine.length === 1 ? "" : "s"} on BreachLab ·{" "}
          {totalStars} {totalStars === 1 ? "star" : "stars"}
        </p>
      </header>

      {featured ? (
        <section className="space-y-3">
          <h2 className="text-amber text-lg uppercase tracking-wider">
            External knowledge base
          </h2>
          <article
            className="border border-border px-4 py-3 flex flex-col gap-2"
            data-testid="featured-author-card"
          >
            <header className="flex items-baseline justify-between gap-3 flex-wrap">
              <div className="text-sm">
                <span className="text-muted">Full writeup site at </span>
                <a
                  href={featured.siteUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-amber font-medium hover:underline"
                >
                  {hostnameOf(featured.siteUrl)}
                </a>
                {featured.isFeatured ? (
                  <span
                    className="ml-2 inline-block text-[10px] uppercase tracking-wider px-1 py-0.5 border border-amber/40 text-amber"
                    title="Recommended by BreachLab"
                  >
                    Recommended by BreachLab
                  </span>
                ) : null}
              </div>
              <AuthorStarButton
                authorId={featured.id}
                initialStarred={featured.userHasStarred}
                initialScore={featured.weightedScore}
                disabled={!user}
                disabledReason={!user ? "Log in to star" : undefined}
              />
            </header>
            <a
              href={featured.siteUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-xs text-amber hover:underline"
            >
              Read writeups →
            </a>
          </article>
        </section>
      ) : null}

      {mine.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-amber text-lg uppercase tracking-wider">
            Per-level writeups
          </h2>
          <ul className="space-y-2">
            {mine.map((w) => (
              <li key={w.id} className="border border-border px-4 py-3">
                <Link
                  href={`/writeups/${w.trackSlug}/${w.levelIdx}`}
                  className="text-sm text-amber hover:underline"
                >
                  {w.trackSlug} L{w.levelIdx} — {w.title}
                </Link>
                <p className="text-xs text-muted mt-1">★ {w.weightedScore}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!featured && mine.length === 0 ? (
        <p className="text-sm text-muted">No approved writeups yet.</p>
      ) : null}
    </article>
  );
}
