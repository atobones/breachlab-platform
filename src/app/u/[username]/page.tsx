import { notFound } from "next/navigation";
import { getProfileByUsername } from "@/lib/profiles/queries";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { ProfileBadges } from "@/components/profile/ProfileBadges";

export const dynamic = "force-dynamic";

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  return (
    <div className="space-y-6" data-testid="profile-page">
      <ProfileHeader profile={profile} />
      <ProfileStats profile={profile} />
      <section className="space-y-2">
        <h2 className="text-sm text-muted uppercase tracking-wider">Badges</h2>
        <ProfileBadges badges={profile.badges} />
      </section>
      <section className="space-y-2">
        <h2 className="text-sm text-muted uppercase tracking-wider">Speedruns</h2>
        {profile.speedruns.length === 0 ? (
          <p className="text-xs text-muted">No closed runs yet.</p>
        ) : (
          <ul className="text-sm font-mono space-y-1">
            {profile.speedruns.map((r) => (
              <li key={r.trackSlug} className="flex gap-3">
                <span className="text-amber">{r.trackName}</span>
                <span>{formatTime(r.totalSeconds)}</span>
                {r.reviewStatus === "approved" && (
                  <span className="text-green text-xs">[approved]</span>
                )}
                {r.reviewStatus === "pending" && (
                  <span className="text-muted text-xs">[pending]</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
