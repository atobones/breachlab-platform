import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuthorByUsername } from "@/lib/authors";
import { listCommunityWriteups } from "@/lib/community-writeups";
import { getCurrentSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

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
  const all = await listCommunityWriteups({ userId: user?.id ?? null });
  const mine = all.filter((w) => w.author.id === author.id);

  const totalStars = mine.reduce((acc, w) => acc + w.weightedScore, 0);

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
          {mine.length} writeup{mine.length === 1 ? "" : "s"} · {totalStars} stars
        </p>
      </header>

      {mine.length === 0 ? (
        <p className="text-sm text-muted">No approved writeups yet.</p>
      ) : (
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
      )}
    </article>
  );
}
