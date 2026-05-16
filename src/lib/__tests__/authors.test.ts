import { describe, expect, it } from "vitest";
import { getCuratedAuthor } from "../authors";

describe("getCuratedAuthor", () => {
  it("returns a stable derived author record for file-based writeups", () => {
    const a = getCuratedAuthor();
    expect(a.username).toBe("Ato");
    expect(a.siteUrl).toMatch(/^https:\/\/breachlab\.io/);
    expect(a.bio).toContain("Founder");
    expect(a.isCurator).toBe(true);
  });
});
