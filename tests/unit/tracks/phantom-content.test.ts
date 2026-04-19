import { describe, it, expect } from "vitest";
import {
  PHANTOM_LEVEL_CONTENT,
  type PhantomLevelContent,
  type PhantomTier,
} from "@/lib/tracks/phantom-level-content";

const TIERS: PhantomTier[] = ["act1", "act2", "act3", "act4", "act5"];

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

  it("has exactly 32 levels (0..31)", () => {
    expect(entries).toHaveLength(32);
    const indices = entries.map(([i]) => i).sort((a, b) => a - b);
    for (let i = 0; i <= 31; i++) expect(indices).toContain(i);
  });

  it("every tier is one of the five valid acts", () => {
    for (const [, c] of entries) {
      expect(TIERS).toContain(c.tier);
    }
  });

  it("level 31 is the hidden graduate", () => {
    const final = PHANTOM_LEVEL_CONTENT[31];
    expect(final).toBeDefined();
    expect(final.hidden).toBe(true);
    expect(final.tier).toBe("act5");
  });

  it("tier distribution matches plan (10 act1 / 6 act2 / 4 act3 / 7 act4 / 5 act5)", () => {
    const counts: Record<PhantomTier, number> = {
      act1: 0,
      act2: 0,
      act3: 0,
      act4: 0,
      act5: 0,
    };
    for (const [, c] of entries) counts[c.tier]++;
    expect(counts.act1).toBe(10);
    expect(counts.act2).toBe(6);
    expect(counts.act3).toBe(4);
    expect(counts.act4).toBe(7);
    expect(counts.act5).toBe(5);
  });

  it("every goal is between 1 and 6 sentences (hidden graduate may be longer)", () => {
    for (const [idx, c] of entries) {
      const n = countSentences(c.goal);
      // L31 is the chained graduation — allow up to 8 sentences because it
      // describes a multi-step mission. All others: tight 1-6 per spec.
      const max = idx === 31 ? 8 : 6;
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
