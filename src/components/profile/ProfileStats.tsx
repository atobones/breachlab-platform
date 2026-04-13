import type { Profile } from "@/lib/profiles/queries";

export function ProfileStats({ profile }: { profile: Profile }) {
  const firstBloods = profile.badges.filter((b) => b.kind === "first_blood").length;
  return (
    <section className="grid grid-cols-3 gap-4 text-sm font-mono">
      <div>
        <div className="text-xs text-muted uppercase">Points</div>
        <div className="text-amber text-lg">{profile.totalPoints}</div>
      </div>
      <div>
        <div className="text-xs text-muted uppercase">Levels solved</div>
        <div className="text-amber text-lg">{profile.solvedLevels}</div>
      </div>
      <div>
        <div className="text-xs text-muted uppercase">First bloods</div>
        <div className="text-red text-lg">{firstBloods}</div>
      </div>
    </section>
  );
}
