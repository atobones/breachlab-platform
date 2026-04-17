import Link from "next/link";

export function PrevNextLevel({
  prevHref,
  prevLabel,
  nextHref,
  nextLabel,
  indexHref,
}: {
  prevHref: string | null;
  prevLabel?: string;
  nextHref: string | null;
  nextLabel?: string;
  indexHref: string;
}) {
  const linkCls =
    "flex-1 border border-amber/20 hover:border-amber/60 hover:bg-amber/[0.03] px-3 py-2 text-sm transition-colors no-underline";
  const disabledCls =
    "flex-1 border border-border/50 px-3 py-2 text-sm text-muted cursor-default select-none";
  return (
    <nav className="flex gap-3 text-sm font-mono pt-4">
      {prevHref ? (
        <Link href={prevHref} className={linkCls} aria-label="Previous level">
          <span className="text-muted text-[10px] uppercase tracking-wider block">
            ← prev
          </span>
          <span className="text-amber">{prevLabel ?? "Previous level"}</span>
        </Link>
      ) : (
        <span className={disabledCls}>
          <span className="text-[10px] uppercase tracking-wider block">
            ← prev
          </span>
          —
        </span>
      )}
      <Link
        href={indexHref}
        className="border border-amber/20 hover:border-amber/60 hover:bg-amber/[0.03] px-3 py-2 text-sm transition-colors no-underline"
        aria-label="Back to track"
      >
        <span className="text-muted text-[10px] uppercase tracking-wider block">
          track
        </span>
        <span className="text-amber">all levels</span>
      </Link>
      {nextHref ? (
        <Link
          href={nextHref}
          className={`${linkCls} text-right`}
          aria-label="Next level"
        >
          <span className="text-muted text-[10px] uppercase tracking-wider block">
            next →
          </span>
          <span className="text-amber">{nextLabel ?? "Next level"}</span>
        </Link>
      ) : (
        <span className={`${disabledCls} text-right`}>
          <span className="text-[10px] uppercase tracking-wider block">
            next →
          </span>
          —
        </span>
      )}
    </nav>
  );
}
