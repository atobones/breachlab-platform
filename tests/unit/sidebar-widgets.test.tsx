import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TracksNav } from "@/components/TracksNav";
import { SidebarLinks } from "@/components/SidebarLinks";

// LiveOpsWidget and TopFiveWidget are now async Server Components backed
// by DB queries — covered by e2e tests (tracks.spec.ts) instead of unit.
// RecentTickerWidget is a client component subscribing to SSE — also covered by e2e.

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

describe("SidebarLinks", () => {
  it("includes Rules, Discord, GitHub", () => {
    render(<SidebarLinks />);
    expect(screen.getByRole("link", { name: /rules/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /discord/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /github/i })).toBeInTheDocument();
  });
});
