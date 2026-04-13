"use client";

import { useSearchParams } from "next/navigation";
import { unlinkDiscord } from "@/app/dashboard/discord-actions";

const FLASH: Record<string, { text: string; className: string }> = {
  linked: { text: "Discord linked.", className: "text-green" },
  error: { text: "Discord link failed.", className: "text-red" },
  conflict: {
    text: "This Discord account is already linked to another operative.",
    className: "text-red",
  },
  invalid_state: {
    text: "Discord link session expired. Try again.",
    className: "text-red",
  },
};

export function DiscordLinkCard({
  discordUsername,
  configured,
}: {
  discordUsername: string | null;
  configured: boolean;
}) {
  const params = useSearchParams();
  const flashKey = params.get("discord");
  const flash = flashKey ? FLASH[flashKey] : null;

  return (
    <section className="space-y-2 border border-amber/20 p-3">
      <h2 className="text-sm text-muted uppercase tracking-wider">Discord</h2>
      {flash && <p className={`text-xs ${flash.className}`}>{flash.text}</p>}
      {!configured && (
        <p className="text-xs text-muted">Discord linking not available.</p>
      )}
      {configured && !discordUsername && (
        <a
          href="/api/auth/discord/start"
          className="inline-block text-xs px-3 py-1 border border-amber text-amber hover:bg-amber/10"
        >
          Link Discord
        </a>
      )}
      {configured && discordUsername && (
        <div className="flex items-center gap-3 text-xs">
          <span>
            Linked as <span className="text-amber">@{discordUsername}</span>
          </span>
          <form action={unlinkDiscord}>
            <button
              type="submit"
              className="px-2 py-0.5 border border-red/40 text-red hover:bg-red/10"
            >
              Unlink
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
