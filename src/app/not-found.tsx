import Link from "next/link";

export const metadata = {
  title: "404 — no such page · BreachLab",
};

export default function NotFound() {
  return (
    <div className="font-mono max-w-2xl space-y-4">
      <pre className="text-red text-xs leading-tight whitespace-pre-wrap">
{`[!] 404 — path not found
[!] the page you requested is either
      (a) not yet built,
      (b) retired,
      (c) only reachable from the right shell.`}
      </pre>
      <p className="text-sm text-muted">
        breachlab$ <span className="text-amber">cd /</span>
        <span className="cursor" />
      </p>
      <ul className="text-sm space-y-1 pl-6">
        <li>
          <Link href="/" className="hover:underline">
            ../home
          </Link>
        </li>
        <li>
          <Link href="/tracks/ghost" className="hover:underline">
            ../tracks/ghost
          </Link>
        </li>
        <li>
          <Link href="/tracks/phantom" className="hover:underline">
            ../tracks/phantom
          </Link>
        </li>
        <li>
          <Link href="/leaderboard" className="hover:underline">
            ../leaderboard
          </Link>
        </li>
        <li>
          <Link href="/help" className="hover:underline">
            ../help
          </Link>
        </li>
      </ul>
    </div>
  );
}
