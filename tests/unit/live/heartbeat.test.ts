import { describe, it, expect } from "vitest";
import { parseHeartbeatPayload } from "@/lib/live-ops/heartbeat";

describe("parseHeartbeatPayload", () => {
  it("accepts ghost source", () => {
    expect(parseHeartbeatPayload({ source: "ghost", count: 4 })).toEqual({
      source: "ghost",
      count: 4,
    });
  });

  it("accepts phantom source", () => {
    expect(parseHeartbeatPayload({ source: "phantom", count: 0 })).toEqual({
      source: "phantom",
      count: 0,
    });
  });

  it("rejects unknown source", () => {
    expect(parseHeartbeatPayload({ source: "wraith", count: 1 })).toBeNull();
  });

  it("rejects missing source", () => {
    expect(parseHeartbeatPayload({ count: 1 })).toBeNull();
  });

  it("rejects negative count", () => {
    expect(parseHeartbeatPayload({ source: "ghost", count: -1 })).toBeNull();
  });

  it("rejects non-integer count", () => {
    expect(parseHeartbeatPayload({ source: "ghost", count: 3.5 })).toBeNull();
    expect(
      parseHeartbeatPayload({ source: "ghost", count: "3" as unknown as number })
    ).toBeNull();
  });

  it("rejects absurdly large count (likely bug or abuse)", () => {
    expect(parseHeartbeatPayload({ source: "ghost", count: 100_000 })).toBeNull();
  });

  it("rejects non-object input", () => {
    expect(parseHeartbeatPayload(null)).toBeNull();
    expect(parseHeartbeatPayload("ghost")).toBeNull();
    expect(parseHeartbeatPayload(undefined)).toBeNull();
  });
});
