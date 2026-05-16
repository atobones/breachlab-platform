import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getCurrentSession: vi.fn(),
}));
vi.mock("@/lib/db/client", () => ({
  db: {
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue(undefined) }) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    select: vi.fn(),
  },
}));
vi.mock("@/lib/community-writeups", () => ({
  getCommunityWriteupById: vi.fn(),
}));
vi.mock("@/lib/writeup-access", () => ({
  isCommunityWriteupReadable: vi.fn(),
  getCompletedLevelIdxs: vi.fn().mockResolvedValue(new Set()),
}));

import { POST, DELETE } from "../[id]/star/route";
import { getCurrentSession } from "@/lib/auth/session";
import { getCommunityWriteupById } from "@/lib/community-writeups";
import { isCommunityWriteupReadable } from "@/lib/writeup-access";

const makeReq = () => new Request("http://test/api/writeups/abc/star", { method: "POST" });
const ctx = { params: Promise.resolve({ id: "abc" }) } as any;

describe("POST /api/writeups/[id]/star", () => {
  beforeEach(() => vi.clearAllMocks());

  it("401 when not logged in", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: null });
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(401);
  });

  it("404 when writeup not found", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: { id: "u1", isAdmin: false, isCurator: false } });
    (getCommunityWriteupById as any).mockResolvedValue(null);
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(404);
  });

  it("403 when gating denies", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: { id: "u1", isAdmin: false, isCurator: false } });
    (getCommunityWriteupById as any).mockResolvedValue({ trackSlug: "phantom", levelIdx: 17 });
    (isCommunityWriteupReadable as any).mockReturnValue(false);
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(403);
  });

  it("200 happy path POST", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: { id: "u1", isAdmin: false, isCurator: false } });
    (getCommunityWriteupById as any).mockResolvedValue({ trackSlug: "ghost", levelIdx: 1 });
    (isCommunityWriteupReadable as any).mockReturnValue(true);
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(200);
  });

  it("200 happy path DELETE", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: { id: "u1", isAdmin: false, isCurator: false } });
    (getCommunityWriteupById as any).mockResolvedValue({ trackSlug: "ghost", levelIdx: 1 });
    (isCommunityWriteupReadable as any).mockReturnValue(true);
    const res = await DELETE(makeReq(), ctx);
    expect(res.status).toBe(200);
  });
});
