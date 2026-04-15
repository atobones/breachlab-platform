import Link from "next/link";
import { forwardRef } from "react";

export type SpotlightCardData = {
  href: string;
  icon: string;
  title: string;
  summary: string;
  bullets: string[];
  cta: string;
  testId: string;
};

/**
 * Plain donation method card — border + content only. The glow effect is
 * painted by the parent <SpotlightGrid>, which uses refs to each card's
 * bounding rect to drive a gooey-filtered blob layer.
 */
export const SpotlightCard = forwardRef<HTMLAnchorElement, SpotlightCardData>(
  function SpotlightCard(
    { href, icon, title, summary, bullets, cta, testId },
    ref,
  ) {
    return (
      <Link
        ref={ref}
        href={href}
        data-testid={testId}
        className="group relative flex flex-col gap-3 border border-amber/30 p-5 hover:border-amber transition-colors"
      >
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="text-amber text-2xl">
            {icon}
          </span>
          <h2 className="text-amber text-lg group-hover:underline">{title}</h2>
        </div>
        <p className="text-xs text-muted">{summary}</p>
        <ul className="text-[11px] text-muted space-y-1 list-disc list-inside flex-1">
          {bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        <span className="mt-2 text-xs text-amber group-hover:underline">
          {cta}
        </span>
      </Link>
    );
  },
);
