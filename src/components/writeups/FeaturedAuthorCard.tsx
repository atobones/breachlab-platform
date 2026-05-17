import Link from "next/link";
import { AuthorStarButton } from "./AuthorStarButton";
import type { FeaturedAuthorView } from "@/lib/featured-authors";

export function FeaturedAuthorCard({
  author,
  canStar,
  currentUserIsCurator,
  starDisabledReason,
}: {
  author: FeaturedAuthorView;
  canStar: boolean;
  currentUserIsCurator?: boolean;
  starDisabledReason?: string;
}) {
  return (
    <article
      className="border border-border px-4 py-3 flex flex-col gap-2 h-full"
      data-testid="featured-author-card"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 text-sm space-y-1">
          <div>
            <span className="text-muted">Writeups by </span>
            <Link
              href={`/writeups/by/${author.username}`}
              className="text-amber font-medium hover:underline"
            >
              {author.username}
            </Link>
          </div>
          {author.isFeatured ? (
            <span
              className="inline-block text-[10px] uppercase tracking-wider px-1 py-0.5 border border-amber/40 text-amber"
              title="Recommended by BreachLab"
            >
              Recommended by BreachLab
            </span>
          ) : null}
        </div>
        <div className="shrink-0">
          <AuthorStarButton
            authorId={author.id}
            initialStarred={author.userHasStarred}
            initialScore={author.weightedScore}
            currentUserIsCurator={currentUserIsCurator}
            disabled={!canStar}
            disabledReason={starDisabledReason}
          />
        </div>
      </header>

      {author.bio ? (
        <p className="text-xs text-muted leading-relaxed">{author.bio}</p>
      ) : null}

      <a
        href={author.siteUrl}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="mt-auto pt-1 text-xs text-amber hover:underline"
      >
        Read writeups →
      </a>
    </article>
  );
}
