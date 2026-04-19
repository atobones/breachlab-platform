import { BadgePill } from "@/components/badges/BadgePill";
import { isBadgeKind, type BadgeKind } from "@/lib/badges/types";
import type { ProfileBadge } from "@/lib/profiles/queries";

// Some badges are repeatable (first_blood per level, speedrun_top10 per
// run) and accumulate dozens of identical pills on a strong player's
// profile. sML hit the leaderboard with 10 first_blood badges showing
// as 10 identical pills — looks broken. Aggregate to one pill per kind
// with a ×N suffix when count > 1.
export function ProfileBadges({ badges }: { badges: ProfileBadge[] }) {
  if (badges.length === 0) {
    return <p className="text-xs text-muted">No badges yet.</p>;
  }
  const counts = new Map<BadgeKind, number>();
  for (const b of badges) {
    if (!isBadgeKind(b.kind)) continue;
    counts.set(b.kind, (counts.get(b.kind) ?? 0) + 1);
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {Array.from(counts.entries()).map(([kind, count]) => (
        <li key={kind}>
          <BadgePill kind={kind} count={count > 1 ? count : undefined} />
        </li>
      ))}
    </ul>
  );
}
