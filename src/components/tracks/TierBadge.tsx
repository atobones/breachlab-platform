import type { PhantomTier } from "@/lib/tracks/phantom-level-content";

const TIER_STYLE: Record<PhantomTier, string> = {
  recruit: "border-green text-green",
  operator: "border-amber text-amber",
  phantom: "border-red text-red",
  graduate: "border-red text-red font-bold",
};

const TIER_LABEL: Record<PhantomTier, string> = {
  recruit: "RECRUIT",
  operator: "OPERATOR",
  phantom: "PHANTOM",
  graduate: "GRADUATE",
};

export function TierBadge({
  tier,
  size = "sm",
}: {
  tier: PhantomTier;
  size?: "sm" | "lg";
}) {
  const sizeClasses =
    size === "lg"
      ? "px-3 py-1 text-sm tracking-[0.25em]"
      : "px-2 py-0.5 text-xs tracking-widest";
  return (
    <span
      className={`inline-block uppercase border ${sizeClasses} ${TIER_STYLE[tier]}`}
    >
      {TIER_LABEL[tier]}
    </span>
  );
}
