import Link from "next/link";
import type { AuthorView } from "@/lib/authors";

export function AuthorTile({ author }: { author: AuthorView }) {
  const initial = author.username.slice(0, 1).toUpperCase();
  return (
    <Link
      href={author.id ? `/writeups/by/${author.username}` : "#"}
      className="inline-flex items-center gap-2 text-xs hover:underline"
      data-testid="author-tile"
    >
      <span
        aria-hidden
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber/20 text-amber text-[10px] font-bold"
      >
        {initial}
      </span>
      <span className="text-text">{author.username}</span>
      {author.isCurator ? (
        <span className="text-amber" title="Curator">★</span>
      ) : null}
    </Link>
  );
}
