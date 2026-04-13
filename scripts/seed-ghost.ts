import { db } from "../src/lib/db/client";
import { tracks, levels, flags } from "../src/lib/db/schema";
import { hashToken } from "../src/lib/auth/tokens";
import { eq, and } from "drizzle-orm";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const GHOST_LEVELS = [
  { idx: 0, title: "First Contact" },
  { idx: 1, title: "Name Game" },
  { idx: 2, title: "In The Shadows" },
  { idx: 3, title: "Access Denied" },
  { idx: 4, title: "Signal in the Noise" },
  { idx: 5, title: "The Listener" },
  { idx: 6, title: "Ghost in the Machine" },
  { idx: 7, title: "Lost in Translation" },
  { idx: 8, title: "Something's Running" },
];

async function main() {
  const existing = await db
    .select()
    .from(tracks)
    .where(eq(tracks.slug, "ghost"));
  let trackId: string;
  if (existing.length > 0) {
    trackId = existing[0].id;
    console.log(`Ghost track already exists: ${trackId}`);
  } else {
    const [row] = await db
      .insert(tracks)
      .values({
        slug: "ghost",
        name: "Ghost",
        description: "Linux and shell fundamentals. The first BreachLab track.",
        status: "live",
        orderIdx: 0,
      })
      .returning({ id: tracks.id });
    trackId = row.id;
    console.log(`Created Ghost track: ${trackId}`);
  }

  const plaintextFlags: Record<string, string> = {};
  for (const l of GHOST_LEVELS) {
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
        pointsBase: 100 + l.idx * 20,
        pointsFirstBloodBonus: 50,
      })
      .returning({ id: levels.id });
    const rand = crypto.randomBytes(8).toString("hex");
    const flagValue = `FLAG{ghost_l${l.idx}_${rand}}`;
    const hash = await hashToken(flagValue);
    await db.insert(flags).values({ levelId: lvl.id, flagHash: hash });
    plaintextFlags[`ghost_l${l.idx}`] = flagValue;
    console.log(`seeded level ${l.idx}: ${flagValue}`);
  }

  if (Object.keys(plaintextFlags).length > 0) {
    const outPath = path.resolve(".seed-flags.ghost.local.txt");
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
