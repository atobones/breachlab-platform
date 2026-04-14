import { describe, it, expect } from "vitest";
import {
  PHANTOM_LEVEL_CONTENT,
  type PhantomLevelContent,
  type PhantomTier,
} from "@/lib/tracks/phantom-level-content";

const TIERS: PhantomTier[] = ["recruit", "operator", "phantom", "graduate"];

const SPOILER_WORDS = [
  "CVE-",
  "LD_PRELOAD",
  "docker.sock",
  "/var/run/docker.sock",
  "nsenter",
  "setuid",
  "chroot",
  "release_agent",
  "kubelet",
  "runc",
  "/proc/self/exe",
  "Leaky Vessels",
  "cap_setuid",
  "cap_dac_read_search",
  "cap_sys_ptrace",
  "pkexec",
  "polkit",
  "PwnKit",
  "Bad Pods",
  "hostPath",
];

function countSentences(s: string): number {
  return s
    .split(/[.!?]+\s+/)
    .map((x) => x.trim())
    .filter((x) => x.length > 0).length;
}

describe("phantom content invariants", () => {
  const entries = Object.entries(PHANTOM_LEVEL_CONTENT).map(
    ([k, v]) => [Number(k), v] as [number, PhantomLevelContent],
  );

  it("has exactly 21 levels (0..20)", () => {
    expect(entries).toHaveLength(21);
    const indices = entries.map(([i]) => i).sort((a, b) => a - b);
    for (let i = 0; i <= 20; i++) expect(indices).toContain(i);
  });

  it("every tier is one of the four valid tiers", () => {
    for (const [, c] of entries) {
      expect(TIERS).toContain(c.tier);
    }
  });

  it("level 20 is the hidden graduate", () => {
    const final = PHANTOM_LEVEL_CONTENT[20];
    expect(final).toBeDefined();
    expect(final.hidden).toBe(true);
    expect(final.tier).toBe("graduate");
  });

  it("tier distribution matches plan (5 recruit / 8 operator / 6 phantom / 2 graduate)", () => {
    const counts: Record<PhantomTier, number> = {
      recruit: 0,
      operator: 0,
      phantom: 0,
      graduate: 0,
    };
    for (const [, c] of entries) counts[c.tier]++;
    expect(counts.recruit).toBe(5);
    expect(counts.operator).toBe(8);
    expect(counts.phantom).toBe(6);
    expect(counts.graduate).toBe(2);
  });

  it("every goal is between 1 and 6 sentences (hidden graduate may be longer)", () => {
    for (const [idx, c] of entries) {
      const n = countSentences(c.goal);
      // L20 is the chained graduation — allow up to 8 sentences because it
      // describes a multi-step mission. All others: tight 1-6 per spec.
      const max = idx === 20 ? 8 : 6;
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(max);
    }
  });

  it("no goal contains spoiler words (technique names, exploit names, tool names)", () => {
    for (const [idx, c] of entries) {
      for (const word of SPOILER_WORDS) {
        expect(
          c.goal,
          `level ${idx} goal leaks spoiler "${word}"`,
        ).not.toContain(word);
      }
    }
  });

  it("approach hints present on all operator tier levels", () => {
    for (const [idx, c] of entries) {
      if (c.tier === "operator") {
        expect(c.approach, `level ${idx} missing approach`).toBeDefined();
        expect(c.approach!.length).toBeGreaterThan(20);
      }
    }
  });

  it("approach hints absent on recruit/phantom/graduate tiers", () => {
    for (const [idx, c] of entries) {
      if (c.tier !== "operator") {
        expect(
          c.approach,
          `level ${idx} (${c.tier}) should not have approach`,
        ).toBeUndefined();
      }
    }
  });

  it("mitigationVersion matches calendar or legacy format", () => {
    const re = /^(20\d{2}-(0[1-9]|1[0-2])|legacy-20\d{2})$/;
    for (const [idx, c] of entries) {
      expect(
        c.mitigationVersion,
        `level ${idx} mitigationVersion invalid`,
      ).toMatch(re);
    }
  });

  it("every realWorldSkill is non-empty", () => {
    for (const [, c] of entries) {
      expect(c.realWorldSkill.length).toBeGreaterThan(20);
    }
  });
});
