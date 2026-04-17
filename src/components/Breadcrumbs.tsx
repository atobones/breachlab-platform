import Link from "next/link";

type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="text-xs text-muted font-mono flex items-center gap-1 flex-wrap"
    >
      {items.map((c, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={`${c.label}-${i}`} className="flex items-center gap-1">
            {c.href && !isLast ? (
              <Link href={c.href} className="hover:text-amber">
                {c.label}
              </Link>
            ) : (
              <span className={isLast ? "text-amber" : ""}>{c.label}</span>
            )}
            {!isLast && <span className="text-muted/60">▸</span>}
          </span>
        );
      })}
    </nav>
  );
}
