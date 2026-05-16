import Link from "next/link";
import { AuthorStarButton } from "./AuthorStarButton";
import type { FeaturedAuthorView } from "@/lib/featured-authors";

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function FeaturedAuthorCard({
  author,
  canStar,
  starDisabledReason,
}: {
  author: FeaturedAuthorView;
  canStar: boolean;
  starDisabledReason?: string;
}) {
  return (
    <article
      className="border border-border px-4 py-3 flex flex-col gap-2"
      data-testid="featured-author-card"
    >
      <header className="flex items-baseline justify-between gap-3 flex-wrap">
        <div className="text-sm">
          <Link
            href={`/writeups/by/${author.username}`}
            className="text-amber font-medium hover:underline"
          >
            {author.username}
          </Link>
          {author.isFeatured ? (
            <span
              className="ml-2 inline-block text-[10px] uppercase tracking-wider px-1 py-0.5 border border-amber/40 text-amber"
              title="Curator pick"
            >
              Featured by Ato
            </span>
          ) : null}
        </div>
        <AuthorStarButton
          authorId={author.id}
          initialStarred={author.userHasStarred}
          initialScore={author.weightedScore}
          disabled={!canStar}
          disabledReason={starDisabledReason}
        />
      </header>

      {author.bio ? (
        <p className="text-xs text-muted leading-relaxed">{author.bio}</p>
      ) : null}

      <a
        href={author.siteUrl}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="text-xs text-amber hover:underline"
      >
        {hostnameOf(author.siteUrl)} →
      </a>
    </article>
  );
}
