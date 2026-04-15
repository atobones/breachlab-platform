import Link from "next/link";

type Props = {
  href: string;
  icon: string;
  title: string;
  summary: string;
  bullets: string[];
  cta: string;
  testId: string;
};

/**
 * Plain donation method card — border + content only.
 * Glow effect is provided by the parent <SpotlightGrid>, which renders a
 * single cursor-following radial gradient behind all cards so the light
 * visually bridges the gaps between them.
 */
export function SpotlightCard({
  href,
  icon,
  title,
  summary,
  bullets,
  cta,
  testId,
}: Props) {
  return (
    <Link
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
}
