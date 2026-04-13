import Link from "next/link";
import { DonateButton } from "./DonateButton";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/tracks/ghost", label: "Wargames" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/rules", label: "Rules" },
];

export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-border pb-3 mb-6">
      <nav>
        <ul className="flex gap-6 text-sm uppercase tracking-wider">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="text-text hover:text-amber">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <DonateButton />
    </header>
  );
}
