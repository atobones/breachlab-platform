"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: { href: string; label: string }[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/submissions", label: "Submissions" },
  { href: "/admin/sponsors", label: "Sponsors" },
  { href: "/admin/review", label: "Review queue" },
  { href: "/admin/audit", label: "Audit" },
];

export function AdminNav() {
  const pathname = usePathname() ?? "/admin";
  return (
    <nav className="flex flex-wrap gap-4 text-xs font-mono border-b border-amber/20 pb-3">
      {ITEMS.map((item) => {
        const isActive =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              isActive
                ? "text-amber border-b border-amber -mb-[13px] pb-3"
                : "text-muted hover:text-amber"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
