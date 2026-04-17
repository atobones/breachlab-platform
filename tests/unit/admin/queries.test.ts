import { describe, it, expect } from "vitest";
import { rollupSponsors, mergeDailyTrend } from "@/lib/admin/helpers";

describe("rollupSponsors", () => {
  it("returns zero rollup for empty input", () => {
    const r = rollupSponsors([]);
    expect(r.activeCount).toBe(0);
    expect(r.mrrCents).toBe(0);
    expect(r.byTier).toEqual({
      recruit: 0,
      operator: 0,
      phantom: 0,
      architect: 0,
    });
    expect(r.bySource).toEqual({});
  });

  it("buckets by tier thresholds (recruit/operator/phantom/architect)", () => {
    const r = rollupSponsors([
      { amount: 300, source: "github_sponsors" }, // recruit
      { amount: 1000, source: "github_sponsors" }, // operator
      { amount: 2500, source: "liberapay" }, // phantom
      { amount: 10000, source: "crypto" }, // architect
    ]);
    expect(r.byTier).toEqual({
      recruit: 1,
      operator: 1,
      phantom: 1,
      architect: 1,
    });
    expect(r.activeCount).toBe(4);
    expect(r.mrrCents).toBe(13800);
  });

  it("sums MRR correctly", () => {
    const r = rollupSponsors([
      { amount: 1000, source: "github_sponsors" },
      { amount: 2500, source: "github_sponsors" },
      { amount: 500, source: "liberapay" },
    ]);
    expect(r.mrrCents).toBe(4000);
  });

  it("groups by source", () => {
    const r = rollupSponsors([
      { amount: 1000, source: "github_sponsors" },
      { amount: 1000, source: "github_sponsors" },
      { amount: 500, source: "liberapay" },
    ]);
    expect(r.bySource).toEqual({
      github_sponsors: 2,
      liberapay: 1,
    });
  });
});

describe("mergeDailyTrend", () => {
  it("produces `days` entries, oldest first, most recent last", () => {
    const out = mergeDailyTrend([], [], 30);
    expect(out).toHaveLength(30);
    const last = out[out.length - 1].day;
    const today = new Date().toISOString().slice(0, 10);
    expect(last).toBe(today);
  });

  it("zero-fills missing days", () => {
    const out = mergeDailyTrend([], [], 7);
    for (const p of out) {
      expect(p.registrations).toBe(0);
      expect(p.submissions).toBe(0);
    }
  });

  it("merges registration + submission buckets by day", () => {
    const today = new Date().toISOString().slice(0, 10);
    const out = mergeDailyTrend(
      [{ day: today, c: 3 }],
      [{ day: today, c: 12 }],
      3
    );
    const t = out.find((p) => p.day === today)!;
    expect(t.registrations).toBe(3);
    expect(t.submissions).toBe(12);
  });

  it("ignores days outside the window", () => {
    const ancient = "2000-01-01";
    const out = mergeDailyTrend(
      [{ day: ancient, c: 100 }],
      [{ day: ancient, c: 100 }],
      3
    );
    expect(out.find((p) => p.day === ancient)).toBeUndefined();
  });
});
