import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/session", () => ({ getCurrentSession: vi.fn() }));
vi.mock("@/lib/db/client", () => ({
  db: {
    select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ count: 0 }]) }) }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: "w1" }]) }),
      }),
    }),
  },
}));

import { POST } from "../submit/route";
import { getCurrentSession } from "@/lib/auth/session";

const makeReq = (body: any) =>
  new Request("http://test/api/writeups/submit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const validBody = {
  trackSlug: "ghost",
  levelIdx: 1,
  title: "Lvl 1: First Contact",
  brief: "A walkthrough of the first level using ls + cat.",
  externalUrl: "https://0xm1sk.github.io/breachlab-docs/ghost/level-1/",
};

beforeEach(() => vi.clearAllMocks());

describe("POST /api/writeups/submit", () => {
  it("401 when not logged in", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: null });
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(401);
  });

  it("400 on missing field", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: { id: "u1", isAdmin: false } });
    const res = await POST(makeReq({ ...validBody, title: "" }));
    expect(res.status).toBe(400);
  });

  it("400 on bad URL", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: { id: "u1", isAdmin: false } });
    const res = await POST(makeReq({ ...validBody, externalUrl: "not-a-url" }));
    expect(res.status).toBe(400);
  });

  it("400 on title > 120", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: { id: "u1", isAdmin: false } });
    const res = await POST(makeReq({ ...validBody, title: "x".repeat(121) }));
    expect(res.status).toBe(400);
  });

  it("400 on brief > 280", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: { id: "u1", isAdmin: false } });
    const res = await POST(makeReq({ ...validBody, brief: "x".repeat(281) }));
    expect(res.status).toBe(400);
  });

  it("200 happy path", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: { id: "u1", isAdmin: false } });
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("w1");
  });
});
