import { notFound } from "next/navigation";
import { getProfileByUsername } from "@/lib/profiles/queries";
import { getUserSecurityProfile } from "@/lib/hall-of-fame/queries";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { ProfileBadges } from "@/components/profile/ProfileBadges";
import { formatHhMmSs } from "@/lib/speedrun/format";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  const securityProfile = profile.user.isHallOfFame
    ? await getUserSecurityProfile(profile.user.id)
    : null;

  const hasGraduate = profile.badges.some((b) => b.kind === "ghost_graduate");
  const hasPhantomMaster = profile.badges.some(
    (b) => b.kind === "phantom_master",
  );

  return (
    <div className="space-y-6" data-testid="profile-page">
      <ProfileHeader profile={profile} />
      <div className="flex flex-wrap gap-3">
        {hasGraduate && (
          <a
            href={`/u/${profile.user.username}/certificate`}
            className="inline-flex items-center gap-2 px-4 py-2 border-2 border-amber text-amber font-bold uppercase tracking-widest text-xs hover:bg-amber/10 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
          >
            ★ Ghost Operative Certificate
          </a>
        )}
        {hasPhantomMaster && (
          <a
            href={`/u/${profile.user.username}/certificate/phantom`}
            className="inline-flex items-center gap-2 px-4 py-2 border-2 border-red text-red font-bold uppercase tracking-widest text-xs hover:bg-red/10 shadow-[0_0_12px_rgba(239,68,68,0.3)]"
          >
            ★ Phantom Operative Certificate
          </a>
        )}
      </div>
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
                <span>{formatHhMmSs(r.totalSeconds)}</span>
                {r.reviewStatus === "approved" && (
                  <span className="text-green text-xs">[approved]</span>
                )}
                {r.isSuspicious && r.reviewStatus === "pending" && (
                  <span className="text-red text-xs">[flagged]</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {securityProfile && securityProfile.credits.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm text-[#facc15] uppercase tracking-wider">
            Security Contributions
            <span className="ml-2 text-[10px] text-muted normal-case">
              ({securityProfile.totalScore} score · {securityProfile.credits.length} credits · separate from track points)
            </span>
          </h2>
          <ul className="text-sm font-mono space-y-2">
            {securityProfile.credits.map((c) => (
              <li
                key={c.id}
                className="border-l-2 border-[#facc15]/40 pl-3 py-1"
              >
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-foreground">{c.findingTitle}</span>
                  <span className="text-[10px] uppercase text-muted">
                    {c.severity}
                  </span>
                  <span className="text-[11px] text-[#facc15]">
                    +{c.securityScore}
                  </span>
                </div>
                <div className="text-[10px] text-muted mt-0.5 flex gap-3 flex-wrap">
                  {c.classRef && <span>{c.classRef}</span>}
                  {c.prRef && <span>{c.prRef}</span>}
                  {c.awardedAt && (
                    <span>
                      {new Date(c.awardedAt).toISOString().slice(0, 10)}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
