import type { TierCode } from "@/lib/sponsors/tiers";
import { TIER_LABEL } from "@/lib/sponsors/tiers";
import type { PublicSponsor } from "@/lib/sponsors/queries";
import { OperativeCard } from "./OperativeCard";

type Props = {
  tier: TierCode;
  sponsors: PublicSponsor[];
  anonymousCount: number;
};

const TIER_STYLE: Record<TierCode, string> = {
  architect: "text-amber",
  phantom: "text-amber",
  operator: "text-green",
  recruit: "text-muted",
};

export function TierSection({ tier, sponsors, anonymousCount }: Props) {
  if (sponsors.length === 0 && anonymousCount === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className={`text-sm uppercase tracking-wider ${TIER_STYLE[tier]}`}>
        {TIER_LABEL[tier]}
        <span className="text-muted ml-2 text-xs normal-case">
          {sponsors.length + anonymousCount}
        </span>
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sponsors.map((s, i) => (
          <OperativeCard
            key={s.username ?? `anon-${i}`}
            username={s.username}
            tierCode={s.tierCode}
            source={s.source}
            longevityPin={s.longevityPin}
            dedication={s.dedication}
          />
        ))}
      </div>
      {anonymousCount > 0 && (
        <p className="text-xs text-muted">
          + {anonymousCount} anonymous {anonymousCount === 1 ? "supporter" : "supporters"}
        </p>
      )}
    </section>
  );
}
