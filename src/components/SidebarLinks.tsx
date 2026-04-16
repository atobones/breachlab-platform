import Link from "next/link";

export function SidebarLinks() {
  return (
    <section>
      <h2 className="text-muted text-sm uppercase mb-2">▸ Links</h2>
      <ul className="text-sm space-y-1">
        <li>
          <Link href="/hall-of-operatives">Hall of Operatives</Link>
        </li>
        <li>
          <Link href="/rules">Rules</Link>
        </li>
        <li>
          <a href="https://discord.gg/hJrteuV6" rel="noreferrer">
            Discord
          </a>
        </li>
        <li>
          <a
            href="https://github.com/atobones/breachlab-platform"
            rel="noreferrer"
          >
            GitHub
          </a>
        </li>
      </ul>
    </section>
  );
}
