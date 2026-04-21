import type { Profile } from "@/lib/profiles/queries";

export function ProfileHeader({ profile }: { profile: Profile }) {
  const joined = profile.user.joinedAt.toISOString().slice(0, 10);
  const nameClass = profile.user.isHallOfFame
    ? "text-[#facc15] drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]"
    : "text-amber";
  return (
    <header className="space-y-1">
      <h1 className={`text-xl ${nameClass}`}>@{profile.user.username}</h1>
      <p className="text-xs text-muted">Joined {joined}</p>
      {profile.user.isHallOfFame && (
        <p className="text-xs text-[#facc15]">[ hall of fame ]</p>
      )}
      {profile.user.isSupporter && (
        <p className="text-xs text-green">[ supporter ]</p>
      )}
      {profile.user.discordUsername && (
        <p className="text-xs text-muted">
          discord: <span className="text-amber">@{profile.user.discordUsername}</span>
        </p>
      )}
    </header>
  );
}
