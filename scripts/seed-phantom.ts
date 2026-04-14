import { db } from "../src/lib/db/client";
import { tracks, levels, flags } from "../src/lib/db/schema";
import { hashToken } from "../src/lib/auth/tokens";
import { eq, and } from "drizzle-orm";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

type PhantomLevel = {
  idx: number;
  title: string;
  description?: string;
  pointsBase: number;
  pointsFirstBloodBonus: number;
};

const PHANTOM_LEVELS: PhantomLevel[] = [
  { idx: 0, title: "Recon Gateway", pointsBase: 300, pointsFirstBloodBonus: 50 },
  { idx: 1, title: "Sudo Allowlist", pointsBase: 320, pointsFirstBloodBonus: 50 },
  { idx: 2, title: "Preload", pointsBase: 340, pointsFirstBloodBonus: 50 },
  { idx: 3, title: "Wild Card", pointsBase: 360, pointsFirstBloodBonus: 50 },
  { idx: 4, title: "Edit Escape", pointsBase: 380, pointsFirstBloodBonus: 50 },
  { idx: 5, title: "Local Authority", pointsBase: 420, pointsFirstBloodBonus: 50 },
  { idx: 6, title: "Capable Interpreter", pointsBase: 460, pointsFirstBloodBonus: 50 },
  { idx: 7, title: "Read Everything", pointsBase: 500, pointsFirstBloodBonus: 50 },
  { idx: 8, title: "Live Injection", pointsBase: 540, pointsFirstBloodBonus: 50 },
  { idx: 9, title: "Writable Rules", pointsBase: 580, pointsFirstBloodBonus: 50 },
  { idx: 10, title: "Writable Authority", pointsBase: 620, pointsFirstBloodBonus: 50 },
  { idx: 11, title: "Schedule Hijack", pointsBase: 660, pointsFirstBloodBonus: 50 },
  { idx: 12, title: "Group Privilege", pointsBase: 700, pointsFirstBloodBonus: 50 },
  { idx: 13, title: "The Socket", pointsBase: 800, pointsFirstBloodBonus: 50 },
  { idx: 14, title: "Privileged", pointsBase: 860, pointsFirstBloodBonus: 50 },
  { idx: 15, title: "Release Agent", pointsBase: 920, pointsFirstBloodBonus: 50 },
  { idx: 16, title: "Self Exe", pointsBase: 980, pointsFirstBloodBonus: 50 },
  { idx: 17, title: "Leaky Vessels", pointsBase: 1040, pointsFirstBloodBonus: 50 },
  { idx: 18, title: "Bad Pod", pointsBase: 1100, pointsFirstBloodBonus: 50 },
  { idx: 19, title: "Kubelet Door", pointsBase: 1200, pointsFirstBloodBonus: 50 },
  {
    idx: 20,
    title: "Phantom Operative",
    description:
      "[HIDDEN] Graduation gate — unlocked after solving all 20 public Phantom levels",
    pointsBase: 2000,
    pointsFirstBloodBonus: 0,
  },
];

async function main() {
  const existing = await db
    .select()
    .from(tracks)
    .where(eq(tracks.slug, "phantom"));
  let trackId: string;
  if (existing.length > 0) {
    trackId = existing[0].id;
    console.log(`Phantom track already exists: ${trackId}`);
  } else {
    const [row] = await db
      .insert(tracks)
      .values({
        slug: "phantom",
        name: "Phantom",
        description:
          "Post-exploitation — Linux privilege escalation, container escape, Kubernetes pod escape.",
        status: "live",
        orderIdx: 1,
      })
      .returning({ id: tracks.id });
    trackId = row.id;
    console.log(`Created Phantom track: ${trackId}`);
  }

  const plaintextFlags: Record<string, string> = {};
  for (const l of PHANTOM_LEVELS) {
    const existingLevel = await db
      .select({ id: levels.id })
      .from(levels)
      .where(and(eq(levels.trackId, trackId), eq(levels.idx, l.idx)))
      .limit(1);
    if (existingLevel.length > 0) {
      console.log(`level ${l.idx} already exists, skipping`);
      continue;
    }
    const [lvl] = await db
      .insert(levels)
      .values({
        trackId,
        idx: l.idx,
        title: l.title,
        description: l.description ?? "",
        pointsBase: l.pointsBase,
        pointsFirstBloodBonus: l.pointsFirstBloodBonus,
      })
      .returning({ id: levels.id });
    const rand = crypto.randomBytes(8).toString("hex");
    const flagValue = `FLAG{phantom_l${l.idx}_${rand}}`;
    const hash = await hashToken(flagValue);
    await db.insert(flags).values({ levelId: lvl.id, flagHash: hash });
    plaintextFlags[`phantom_l${l.idx}`] = flagValue;
    console.log(`seeded level ${l.idx}: ${flagValue}`);
  }

  if (Object.keys(plaintextFlags).length > 0) {
    const outPath = path.resolve(".seed-flags.phantom.local.txt");
    const existingContent = await fs.readFile(outPath, "utf8").catch(() => "");
    const merged =
      existingContent +
      "\n" +
      new Date().toISOString() +
      "\n" +
      Object.entries(plaintextFlags)
        .map(([k, v]) => `${k} = ${v}`)
        .join("\n") +
      "\n";
    await fs.writeFile(outPath, merged.trim() + "\n", "utf8");
    console.log(`wrote plaintext flags to ${outPath}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
