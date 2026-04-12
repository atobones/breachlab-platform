import { DonateButton } from "./DonateButton";
import { TracksNav } from "./TracksNav";
import { LiveOpsWidget } from "./LiveOpsWidget";
import { TopFiveWidget } from "./TopFiveWidget";
import { RecentTickerWidget } from "./RecentTickerWidget";
import { SidebarLinks } from "./SidebarLinks";
import { UserMenu } from "./auth/UserMenu";

export async function Sidebar() {
  return (
    <aside className="w-64 shrink-0 border-r border-border p-4 sticky top-0 h-screen overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <span className="text-amber text-lg font-bold">BreachLab</span>
        <DonateButton />
      </div>
      <div className="space-y-6">
        <UserMenu />
        <TracksNav />
        <LiveOpsWidget />
        <TopFiveWidget />
        <RecentTickerWidget />
        <SidebarLinks />
      </div>
    </aside>
  );
}
