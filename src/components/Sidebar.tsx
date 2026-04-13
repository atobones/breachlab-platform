import { TracksNav } from "./TracksNav";
import { TrackLevelsNav } from "./TrackLevelsNav";
import { LiveOpsWidget } from "./LiveOpsWidget";
import { TopFiveWidget } from "./TopFiveWidget";
import { RecentTickerWidget } from "./RecentTickerWidget";
import { SidebarLinks } from "./SidebarLinks";
import { UserMenu } from "./auth/UserMenu";
import { getAllTracksWithLevels } from "@/lib/tracks/all";
import { getCurrentSession } from "@/lib/auth/session";

export async function Sidebar() {
  const { user } = await getCurrentSession();
  const tracksData = await getAllTracksWithLevels(user?.id);
  return (
    <aside className="w-64 shrink-0 border-r border-border p-4 sticky top-0 h-screen overflow-y-auto">
      <div className="mb-6">
        <span className="text-amber text-lg font-bold">BreachLab</span>
      </div>
      <div className="space-y-6">
        <UserMenu />
        <TracksNav />
        <TrackLevelsNav tracksData={tracksData} />
        <LiveOpsWidget />
        <TopFiveWidget />
        <RecentTickerWidget />
        <SidebarLinks />
      </div>
    </aside>
  );
}
