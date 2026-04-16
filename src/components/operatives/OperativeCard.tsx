import type { TierCode, LongevityPin } from "@/lib/sponsors/tiers";

type Props = {
  username: string | null;
  tierCode: TierCode;
  source: string;
  longevityPin: LongevityPin | null;
  dedication: string | null;
};

const SOURCE_LABEL: Record<string, string> = {
  github_sponsors: "GitHub Sponsors",
  liberapay: "Liberapay",
  crypto: "BTC",
};

const PIN_LABEL: Record<LongevityPin, string> = {
  "30d": "30d",
  "90d": "90d",
  "1y": "1 year",
  "2y": "2+ years",
};

const TIER_BORDER: Record<TierCode, string> = {
  architect: "border-amber shadow-[0_0_12px_rgba(245,158,11,0.25)]",
  phantom: "border-amber/60",
  operator: "border-green/60",
  recruit: "border-muted/40",
};

export function OperativeCard({ username, tierCode, source, longevityPin, dedication }: Props) {
  return (
    <div className={`border p-3 space-y-1 ${TIER_BORDER[tierCode]}`}>
      <div className="flex items-center gap-2">
        {username ? (
          <a href={`/u/${username}`} className="text-amber text-sm hover:underline">
            {username}
          </a>
        ) : (
          <span className="text-muted text-sm italic">Anonymous</span>
        )}
        {longevityPin && (
          <span className="text-[10px] text-muted border border-muted/30 px-1">
            {PIN_LABEL[longevityPin]}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 text-[10px] text-muted">
        <span>{SOURCE_LABEL[source] ?? source}</span>
      </div>
      {dedication && tierCode === "architect" && (
        <p className="text-xs text-muted/80 italic mt-1">&ldquo;{dedication}&rdquo;</p>
      )}
    </div>
  );
}
