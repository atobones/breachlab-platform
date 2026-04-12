import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TracksNav } from "@/components/TracksNav";
import { LiveOpsWidget } from "@/components/LiveOpsWidget";
import { TopFiveWidget } from "@/components/TopFiveWidget";
import { RecentTickerWidget } from "@/components/RecentTickerWidget";
import { SidebarLinks } from "@/components/SidebarLinks";

describe("TracksNav", () => {
  it("lists Ghost as LIVE and at least Phantom as SOON", () => {
    render(<TracksNav />);
    expect(screen.getByText("Ghost")).toBeInTheDocument();
    expect(screen.getByText("LIVE")).toBeInTheDocument();
    expect(screen.getByText("Phantom")).toBeInTheDocument();
    expect(screen.getAllByText("SOON").length).toBeGreaterThan(0);
  });

  it("links Ghost to /tracks/ghost", () => {
    render(<TracksNav />);
    const ghostLink = screen.getByRole("link", { name: /ghost/i });
    expect(ghostLink).toHaveAttribute("href", "/tracks/ghost");
  });
});

describe("LiveOpsWidget", () => {
  it("renders an online count", () => {
    render(<LiveOpsWidget />);
    expect(screen.getByText(/online now/i)).toBeInTheDocument();
  });
});

describe("TopFiveWidget", () => {
  it("renders five rows", () => {
    render(<TopFiveWidget />);
    const rows = screen.getAllByTestId("top-five-row");
    expect(rows.length).toBe(5);
  });

  it("links to /leaderboard", () => {
    render(<TopFiveWidget />);
    expect(screen.getByRole("link", { name: /full board/i })).toHaveAttribute(
      "href",
      "/leaderboard"
    );
  });
});

describe("RecentTickerWidget", () => {
  it("renders at least one recent event", () => {
    render(<RecentTickerWidget />);
    expect(screen.getAllByTestId("recent-event").length).toBeGreaterThan(0);
  });
});

describe("SidebarLinks", () => {
  it("includes Rules, Discord, GitHub", () => {
    render(<SidebarLinks />);
    expect(screen.getByRole("link", { name: /rules/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /discord/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /github/i })).toBeInTheDocument();
  });
});
