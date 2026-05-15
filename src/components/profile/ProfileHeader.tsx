import type { Profile } from "@/lib/profiles/queries";
import { SovereignNameAura } from "@/components/operatives/SovereignNameAura";

export function ProfileHeader({ profile }: { profile: Profile }) {
  const joined = profile.user.joinedAt.toISOString().slice(0, 10);
  const isSovereign = profile.user.specterSovereignRank === 1;
  const nameSpan = profile.user.isHallOfFame ? (
    <span className="hof-name">@{profile.user.username}</span>
  ) : (
    <span className="text-amber">@{profile.user.username}</span>
  );
  return (
    <header className="space-y-1">
      <h1 className="text-xl">
        {isSovereign ? (
          <SovereignNameAura size={48}>{nameSpan}</SovereignNameAura>
        ) : (
          nameSpan
        )}
      </h1>
      <p className="text-xs text-muted">Joined {joined}</p>
      {profile.user.isHallOfFame && (
        <p className="text-xs">
          <span className="hof-name">[ hall of fame ]</span>
        </p>
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
