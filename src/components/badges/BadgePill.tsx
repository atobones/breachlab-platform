import type { BadgeKind } from "@/lib/badges/types";
import { BADGE_LABEL } from "@/lib/badges/types";

const COLOR: Record<BadgeKind, string> = {
  first_blood: "border-red text-red",
  track_complete: "border-amber text-amber",
  supporter: "border-green text-green",
  speedrun_top10: "border-amber text-amber",
  ghost_graduate: "border-amber text-amber font-bold",
  phantom_master: "border-red text-red font-bold",
  sponsor_recruit: "border-green text-green",
  sponsor_operator: "border-green text-green font-bold",
  sponsor_phantom: "border-amber text-amber font-bold",
  sponsor_architect: "border-amber text-amber font-bold",
};

export function BadgePill({ kind }: { kind: BadgeKind }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs uppercase tracking-wider border ${COLOR[kind]}`}
    >
      {BADGE_LABEL[kind]}
    </span>
  );
}
