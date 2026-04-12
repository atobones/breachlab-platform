import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DonateButton } from "@/components/DonateButton";

describe("DonateButton", () => {
  it("renders the DONATE label", () => {
    render(<DonateButton />);
    expect(screen.getByRole("link", { name: /donate/i })).toBeInTheDocument();
  });

  it("links to /donate", () => {
    render(<DonateButton />);
    const link = screen.getByRole("link", { name: /donate/i });
    expect(link).toHaveAttribute("href", "/donate");
  });

  it("uses amber accent class", () => {
    render(<DonateButton />);
    const link = screen.getByRole("link", { name: /donate/i });
    expect(link.className).toMatch(/amber/);
  });
});
