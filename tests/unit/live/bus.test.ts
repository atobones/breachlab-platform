import { describe, it, expect } from "vitest";
import { liveBus } from "@/lib/live/bus";
import type { LiveEvent } from "@/lib/live/events";

describe("liveBus", () => {
  it("delivers events to subscribers", async () => {
    const received: LiveEvent[] = [];
    const unsubscribe = liveBus.subscribe((e) => received.push(e));
    liveBus.publish({
      type: "submission",
      at: new Date().toISOString(),
      username: "ghost_op",
      trackSlug: "ghost",
      levelIdx: 3,
      levelTitle: "Signal in the Noise",
    });
    await Promise.resolve();
    expect(received.length).toBe(1);
    expect(received[0].username).toBe("ghost_op");
    unsubscribe();
  });

  it("does not deliver after unsubscribe", () => {
    let count = 0;
    const unsubscribe = liveBus.subscribe(() => count++);
    unsubscribe();
    liveBus.publish({
      type: "submission",
      at: new Date().toISOString(),
      username: "x",
      trackSlug: "ghost",
      levelIdx: 0,
      levelTitle: "x",
    });
    expect(count).toBe(0);
  });
});
