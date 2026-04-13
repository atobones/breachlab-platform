import { BadgePill } from "@/components/badges/BadgePill";
import { isBadgeKind } from "@/lib/badges/types";
import type { ProfileBadge } from "@/lib/profiles/queries";

export function ProfileBadges({ badges }: { badges: ProfileBadge[] }) {
  if (badges.length === 0) {
    return <p className="text-xs text-muted">No badges yet.</p>;
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {badges.map((b) =>
        isBadgeKind(b.kind) ? (
          <li key={b.id}>
            <BadgePill kind={b.kind} />
          </li>
        ) : null,
      )}
    </ul>
  );
}
