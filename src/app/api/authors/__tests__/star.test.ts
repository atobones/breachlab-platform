import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/session", () => ({ getCurrentSession: vi.fn() }));
vi.mock("@/lib/db/client", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue(undefined) }),
    }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
  },
}));

import { POST, DELETE } from "../[id]/star/route";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";

const ctx = { params: Promise.resolve({ id: "a1" }) } as any;
const makeReq = () => new Request("http://test/api/authors/a1/star", { method: "POST" });

function mockAuthorExists(found: boolean) {
  (db.select as any).mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(found ? [{ id: "a1" }] : []),
      }),
    }),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/authors/[id]/star", () => {
  it("401 when not logged in", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: null });
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(401);
  });

  it("404 when author not featured", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: { id: "u1", isAdmin: false } });
    mockAuthorExists(false);
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(404);
  });

  it("200 happy path", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: { id: "u1", isAdmin: false } });
    mockAuthorExists(true);
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/authors/[id]/star", () => {
  it("401 when not logged in", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: null });
    const res = await DELETE(makeReq(), ctx);
    expect(res.status).toBe(401);
  });

  it("200 happy path", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: { id: "u1", isAdmin: false } });
    mockAuthorExists(true);
    const res = await DELETE(makeReq(), ctx);
    expect(res.status).toBe(200);
  });
});
