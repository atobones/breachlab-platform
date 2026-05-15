import { StatusStrip } from "./StatusStrip";
import { ConquestWall } from "./ConquestWall";
import { LiveFeed } from "./LiveFeed";
import { Heartbeat } from "./Heartbeat";
import { TopBurners } from "./TopBurners";
import { ShellSlot } from "./ShellSlot";
import { BattlesRail } from "./BattlesRail";

// Renders only on ultrawide (`3xl:`), defined at 2200px in globals.css.
// Below that breakpoint the component disappears entirely — the existing
// single-column layout is untouched.
//
// The rail hosts two sibling sub-views:
//   - default (status / conquest / feed / heartbeat / burners / tail-log)
//   - battles teaser (#ops-rail-battles)
// CSS-only swap via `:target` + `:has()` (see globals.css). The sidebar's
// Battles link points to `#ops-rail-battles` on ultrawide and to `/battles`
// otherwise.
export function OpsWallRail() {
  return (
    <aside
      className="hidden 3xl:flex flex-1 min-w-0 p-4 pl-0 sticky top-0 self-start h-[calc(100vh-1.5rem)] ops-wall-rail"
      aria-label="Ops Wall — ultrawide telemetry"
    >
      <section
        id="ops-rail-default"
        className="ops-rail-default flex flex-col gap-3 flex-1 min-w-0 min-h-0"
      >
        <StatusStrip />
        <div className="grid grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)] gap-3 flex-1 min-h-0">
          <ConquestWall />
          <div className="grid grid-rows-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 min-h-0">
            <LiveFeed />
            <Heartbeat />
            <TopBurners />
          </div>
        </div>
        <ShellSlot />
      </section>
      <BattlesRail />
    </aside>
  );
}
