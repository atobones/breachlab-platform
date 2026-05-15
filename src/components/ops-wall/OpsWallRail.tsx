import { StatusStrip } from "./StatusStrip";
import { WorldMap } from "./WorldMap";
import { LiveFeed } from "./LiveFeed";
import { Heartbeat } from "./Heartbeat";
import { TopBurners } from "./TopBurners";
import { TailLog } from "./TailLog";

// Renders only on ultrawide (`3xl:`), defined at 2200px in globals.css.
// Below that breakpoint the component disappears entirely — the existing
// single-column layout is untouched and there's no extra cost on phones,
// laptops, or normal-width desktops.
export function OpsWallRail() {
  return (
    <aside
      className="hidden 3xl:flex flex-1 min-w-0 p-4 pl-0 sticky top-0 self-start h-[calc(100vh-1.5rem)] ops-wall-rail"
      aria-label="Ops Wall — ultrawide telemetry"
    >
      <div className="flex flex-col gap-3 flex-1 min-w-0 min-h-0">
        <StatusStrip />
        <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-3 flex-1 min-h-0">
          <WorldMap />
          <div className="flex flex-col gap-3 min-h-0 overflow-y-auto">
            <LiveFeed />
            <Heartbeat />
            <TopBurners />
          </div>
        </div>
        <TailLog />
      </div>
    </aside>
  );
}
