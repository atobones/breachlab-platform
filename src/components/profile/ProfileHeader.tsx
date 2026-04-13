import { asciiAvatar } from "@/lib/avatar/ascii";
import type { Profile } from "@/lib/profiles/queries";

export function ProfileHeader({ profile }: { profile: Profile }) {
  const art = asciiAvatar(profile.user.username);
  const joined = profile.user.joinedAt.toISOString().slice(0, 10);
  return (
    <header className="flex items-start gap-4">
      <pre className="text-amber text-xs leading-tight select-none">{art.join("\n")}</pre>
      <div className="space-y-1">
        <h1 className="text-amber text-xl">@{profile.user.username}</h1>
        <p className="text-xs text-muted">Joined {joined}</p>
        {profile.user.isSupporter && (
          <p className="text-xs text-green">[ supporter ]</p>
        )}
        {profile.user.discordUsername && (
          <p className="text-xs text-muted">
            discord: <span className="text-amber">@{profile.user.discordUsername}</span>
          </p>
        )}
      </div>
    </header>
  );
}
