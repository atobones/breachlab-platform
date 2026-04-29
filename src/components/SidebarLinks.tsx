import Link from "next/link";
import { DISCORD_INVITE_URL, TELEGRAM_INVITE_URL } from "@/lib/links";

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
          <a href={DISCORD_INVITE_URL} rel="noreferrer">
            Discord
          </a>
        </li>
        <li>
          <a href={TELEGRAM_INVITE_URL} rel="noreferrer">
            Telegram
          </a>
        </li>
      </ul>
    </section>
  );
}
