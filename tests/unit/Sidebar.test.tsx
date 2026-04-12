import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "@/components/Sidebar";

describe("Sidebar", () => {
  it("renders the BreachLab logo text", () => {
    render(<Sidebar />);
    expect(screen.getByText(/BreachLab/i)).toBeInTheDocument();
  });

  it("renders the Donate button at the top, before tracks", () => {
    render(<Sidebar />);
    const html = document.body.innerHTML;
    const donateIdx = html.indexOf("Donate");
    const tracksIdx = html.indexOf("Tracks");
    expect(donateIdx).toBeGreaterThan(-1);
    expect(tracksIdx).toBeGreaterThan(-1);
    expect(donateIdx).toBeLessThan(tracksIdx);
  });

  it("contains TracksNav, LiveOps, TopFive, Recent, Links", () => {
    render(<Sidebar />);
    expect(screen.getByText(/Tracks/i)).toBeInTheDocument();
    expect(screen.getByText(/Live Ops/i)).toBeInTheDocument();
    expect(screen.getByText(/Top 5/i)).toBeInTheDocument();
    expect(screen.getByText(/Recent/i)).toBeInTheDocument();
    expect(screen.getByText(/Links/i)).toBeInTheDocument();
  });
});
