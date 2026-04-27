import Link from "next/link";
import { DonateButton } from "./DonateButton";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/tracks/ghost", label: "Wargames" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/manifesto", label: "Manifesto" },
  { href: "/rules", label: "Rules" },
];

export function Header() {
  return (
    <header className="bl-header flex items-center justify-between gap-3 border-b border-border pb-3 mb-6">
      <nav className="bl-header-nav">
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm uppercase tracking-wider">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="text-text hover:text-amber">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="bl-header-actions flex items-center gap-3 shrink-0">
        <Link href="/help" className="btn-bracket text-sm">
          Help
        </Link>
        <DonateButton />
      </div>
    </header>
  );
}
