import type { PhantomTier } from "@/lib/tracks/phantom-level-content";

const TIER_STYLE: Record<PhantomTier, string> = {
  act1: "border-red text-red",
  act2: "border-amber text-amber",
  act3: "border-green text-green",
  act4: "border-red text-red",
  act5: "border-amber text-amber font-bold",
};

const TIER_LABEL: Record<PhantomTier, string> = {
  act1: "ACT I",
  act2: "ACT II",
  act3: "ACT III",
  act4: "ACT IV",
  act5: "ACT V",
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
