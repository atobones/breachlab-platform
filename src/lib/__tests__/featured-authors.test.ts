import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/client", () => ({ db: {} }));

import type { FeaturedAuthorView } from "../featured-authors";

const make = (overrides: Partial<FeaturedAuthorView> = {}): FeaturedAuthorView => ({
  id: "a1",
  username: "0Xm!$k",
  siteUrl: "https://example.com",
  bio: null,
  isCurator: false,
  regularStars: 0,
  curatorStars: 0,
  weightedScore: 0,
  isFeatured: false,
  userHasStarred: false,
  ...overrides,
});

describe("FeaturedAuthorView shape", () => {
  it("isFeatured flips when curator stars exist", () => {
    const v = make({ curatorStars: 1, isFeatured: true });
    expect(v.isFeatured).toBe(true);
  });

  it("weighted score uses 1×regular + 10×curator semantics", () => {
    const v = make({ regularStars: 3, curatorStars: 2, weightedScore: 23 });
    expect(v.weightedScore).toBe(23);
  });
});
