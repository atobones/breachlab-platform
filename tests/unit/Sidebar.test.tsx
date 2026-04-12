import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/auth/UserMenu", () => ({
  UserMenu: () => <div>Operative</div>,
}));

import { Sidebar } from "@/components/Sidebar";

async function renderAsync() {
  const node = await Sidebar();
  return render(node);
}

describe("Sidebar", () => {
  it("renders the BreachLab logo text", async () => {
    await renderAsync();
    expect(screen.getByText(/BreachLab/i)).toBeInTheDocument();
  });

  it("renders Donate before Tracks", async () => {
    await renderAsync();
    const html = document.body.innerHTML;
    expect(html.indexOf("Donate")).toBeLessThan(html.indexOf("Tracks"));
  });

  it("contains TracksNav, LiveOps, TopFive, Recent, Links, Operative", async () => {
    await renderAsync();
    expect(screen.getByText(/Tracks/i)).toBeInTheDocument();
    expect(screen.getByText(/Live Ops/i)).toBeInTheDocument();
    expect(screen.getByText(/Top 5/i)).toBeInTheDocument();
    expect(screen.getByText(/Recent/i)).toBeInTheDocument();
    expect(screen.getByText(/Links/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Operative/i).length).toBeGreaterThan(0);
  });
});
