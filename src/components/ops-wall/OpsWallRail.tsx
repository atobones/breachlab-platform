import { BattlesRail } from "./BattlesRail";

// Ultrawide-only rail (3xl: ≥ 2200px). Below that breakpoint the
// component disappears entirely — the existing single-column layout
// is unchanged on phones, laptops, and standard desktops.
//
// Phase-1 telemetry view (ConquestWall / TrackBoard / LiveFeed /
// Heartbeat / TopBurners / status strip) was scrapped in favour of
// dedicating the rail to the Battles surface, which is the upcoming
// hype engine for the platform. Those components still exist on disk
// under ops-wall/ in case we want to bring any of them back later.
export function OpsWallRail() {
  return (
    <aside
      className="hidden 3xl:flex flex-1 min-w-0 p-4 pl-0 sticky top-0 self-start h-[calc(100vh-1.5rem)] ops-wall-rail"
      aria-label="Battles theatre — ultrawide"
    >
      <BattlesRail />
    </aside>
  );
}
