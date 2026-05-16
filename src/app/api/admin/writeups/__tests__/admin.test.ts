import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/session", () => ({ getCurrentSession: vi.fn() }));
vi.mock("@/lib/db/client", () => ({
  db: {
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) }),
  },
}));

import { POST as approve } from "../[id]/approve/route";
import { POST as reject } from "../[id]/reject/route";
import { getCurrentSession } from "@/lib/auth/session";

const ctx = { params: Promise.resolve({ id: "w1" }) } as any;
const makeReq = (body: any) =>
  new Request("http://test/api/admin/writeups/w1/approve", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => vi.clearAllMocks());

describe("approve/reject", () => {
  it("401 when not logged in", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: null });
    const res = await approve(makeReq({}), ctx);
    expect(res.status).toBe(401);
  });

  it("403 when not curator", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: { id: "u1", isAdmin: false, isCurator: false } });
    const res = await approve(makeReq({}), ctx);
    expect(res.status).toBe(403);
  });

  it("approve happy path (admin)", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: { id: "u1", isAdmin: true, isCurator: false } });
    const res = await approve(makeReq({}), ctx);
    expect(res.status).toBe(200);
  });

  it("approve happy path (curator)", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: { id: "u1", isAdmin: false, isCurator: true } });
    const res = await approve(makeReq({}), ctx);
    expect(res.status).toBe(200);
  });

  it("reject requires reason", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: { id: "u1", isAdmin: true, isCurator: false } });
    const res = await reject(makeReq({}), ctx);
    expect(res.status).toBe(400);
  });

  it("reject happy path", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: { id: "u1", isAdmin: true, isCurator: false } });
    const res = await reject(makeReq({ reason: "low quality" }), ctx);
    expect(res.status).toBe(200);
  });
});
