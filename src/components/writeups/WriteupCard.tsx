import { AuthorTile } from "./AuthorTile";
import { StarButton } from "./StarButton";
import type { CommunityWriteupView } from "@/lib/community-writeups";

export function WriteupCard({
  writeup,
  unlocked,
  unlockHint,
  canStar,
  starDisabledReason,
}: {
  writeup: CommunityWriteupView;
  unlocked: boolean;
  unlockHint?: string;
  canStar: boolean;
  starDisabledReason?: string;
}) {
  return (
    <article
      className="border border-border px-4 py-3 flex flex-col gap-2 h-full"
      data-testid="writeup-card"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 text-sm space-y-1">
          <div className="text-amber font-medium">{writeup.title}</div>
          {writeup.isFeatured ? (
            <span
              className="inline-block text-[10px] uppercase tracking-wider px-1 py-0.5 border border-amber/40 text-amber"
              title="Recommended by BreachLab"
            >
              Recommended by BreachLab
            </span>
          ) : null}
        </div>
        <div className="shrink-0">
          <StarButton
            writeupId={writeup.id}
            initialStarred={writeup.userHasStarred}
            initialScore={writeup.weightedScore}
            disabled={!canStar}
            disabledReason={starDisabledReason}
          />
        </div>
      </header>

      <div className="flex items-center gap-2 text-xs">
        <AuthorTile author={{ ...writeup.author, id: writeup.author.id ?? null }} />
      </div>

      {unlocked ? (
        <>
          <p className="text-xs text-muted leading-relaxed">{writeup.brief}</p>
          <a
            href={writeup.externalUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="mt-auto pt-1 text-xs text-amber hover:underline"
          >
            Read on author&apos;s site →
          </a>
        </>
      ) : (
        <p className="mt-auto text-xs text-muted italic">{unlockHint ?? "Locked"}</p>
      )}
    </article>
  );
}
