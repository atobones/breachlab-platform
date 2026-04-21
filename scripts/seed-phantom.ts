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
  // ═══════════════════════════════════════════════════════════════
  // ACT I: ESCALATION (0-9) — Get root on the box
  // ═══════════════════════════════════════════════════════════════
  { idx: 0, title: "Recon Gateway", pointsBase: 300, pointsFirstBloodBonus: 50 },
  { idx: 1, title: "SUID Hunter", pointsBase: 320, pointsFirstBloodBonus: 50 },
  { idx: 2, title: "Sudo Games", pointsBase: 340, pointsFirstBloodBonus: 50 },
  { idx: 3, title: "Inheritance", pointsBase: 360, pointsFirstBloodBonus: 50 },
  { idx: 4, title: "Misplaced Power", pointsBase: 380, pointsFirstBloodBonus: 50 },
  { idx: 5, title: "File Authority", pointsBase: 400, pointsFirstBloodBonus: 50 },
  { idx: 6, title: "Scheduled Sins", pointsBase: 420, pointsFirstBloodBonus: 50 },
  { idx: 7, title: "Local Authority", pointsBase: 460, pointsFirstBloodBonus: 50 },
  { idx: 8, title: "Live Injection", pointsBase: 500, pointsFirstBloodBonus: 50 },
  { idx: 9, title: "Stack Day", pointsBase: 600, pointsFirstBloodBonus: 50 },

  // ═══════════════════════════════════════════════════════════════
  // ACT II: HARVEST & PERSIST (10-15) — Loot, persist, disappear
  // ═══════════════════════════════════════════════════════════════
  { idx: 10, title: "The Harvest", pointsBase: 500, pointsFirstBloodBonus: 50 },
  { idx: 11, title: "Token Hunter", pointsBase: 540, pointsFirstBloodBonus: 50 },
  { idx: 12, title: "Ghost Install", pointsBase: 580, pointsFirstBloodBonus: 50 },
  { idx: 13, title: "Deep Roots", pointsBase: 620, pointsFirstBloodBonus: 50 },
  { idx: 14, title: "Shadow Mode", pointsBase: 700, pointsFirstBloodBonus: 50 },
  { idx: 15, title: "Clean Slate", pointsBase: 750, pointsFirstBloodBonus: 50 },

  // ═══════════════════════════════════════════════════════════════
  // ACT III: LATERAL MOVEMENT (16-19) — Move through the network
  // ═══════════════════════════════════════════════════════════════
  { idx: 16, title: "The Tunnel", pointsBase: 700, pointsFirstBloodBonus: 50 },
  { idx: 17, title: "Internal Hunt", pointsBase: 750, pointsFirstBloodBonus: 50 },
  { idx: 18, title: "Credential Spray", pointsBase: 800, pointsFirstBloodBonus: 50 },
  { idx: 19, title: "Chain Reaction", pointsBase: 900, pointsFirstBloodBonus: 50 },

  // ═══════════════════════════════════════════════════════════════
  // ACT IV: CONTAINER & CLOUD (20-26) — Break out of the box
  // ═══════════════════════════════════════════════════════════════
  { idx: 20, title: "Am I Contained?", pointsBase: 800, pointsFirstBloodBonus: 50 },
  { idx: 21, title: "The Breakout", pointsBase: 860, pointsFirstBloodBonus: 50 },
  { idx: 22, title: "Leaky Vessels", pointsBase: 920, pointsFirstBloodBonus: 50 },
  { idx: 23, title: "Docker API", pointsBase: 960, pointsFirstBloodBonus: 50 },
  { idx: 24, title: "Pod Games", pointsBase: 1000, pointsFirstBloodBonus: 50 },
  { idx: 25, title: "Cluster Takeover", pointsBase: 1100, pointsFirstBloodBonus: 50 },
  { idx: 26, title: "Cloud Reach", pointsBase: 1200, pointsFirstBloodBonus: 50 },

  // ═══════════════════════════════════════════════════════════════
  // ACT V: OPERATIONS (27-31) — Full operator skills
  // ═══════════════════════════════════════════════════════════════
  { idx: 27, title: "Toolsmith", pointsBase: 1000, pointsFirstBloodBonus: 50 },
  { idx: 28, title: "The Heist", pointsBase: 1100, pointsFirstBloodBonus: 50 },
  { idx: 29, title: "Wire Tap", pointsBase: 1100, pointsFirstBloodBonus: 50 },
  { idx: 30, title: "Clean Exit", pointsBase: 1200, pointsFirstBloodBonus: 50 },
  {
    idx: 31,
    title: "Phantom Operative",
    description:
      "[HIDDEN] Final operation — full chain across multiple machines. Time-limited. Detection score tracked.",
    pointsBase: 3000,
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
          "Post-exploitation — privilege escalation, credential harvesting, persistence, lateral movement, container escape, Kubernetes, cloud, and full operational tradecraft.",
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
