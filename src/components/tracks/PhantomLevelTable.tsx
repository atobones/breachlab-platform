import Link from "next/link";
import type { Level } from "@/lib/db/schema";
import {
  getPhantomLevelContent,
  type PhantomTier,
} from "@/lib/tracks/phantom-level-content";
import type { FirstBloodInfo } from "./LevelTable";

const ACT_ORDER: PhantomTier[] = [
  "act1",
  "act2",
  "act3",
  "act4",
  "act5",
];

const ACT_LABEL: Record<PhantomTier, string> = {
  act1: "Act I — Escalation",
  act2: "Act II — Harvest & Persist",
  act3: "Act III — Lateral Movement",
  act4: "Act IV — Container & Cloud",
  act5: "Act V — Operations",
};

// All acts share Phantom's red accent — the rotating red/amber/green
// intended a visual progression but read as chaotic. Flat red matches
// the rest of the Phantom page.
const ACT_COLOR: Record<PhantomTier, string> = {
  act1: "text-red",
  act2: "text-red",
  act3: "text-red",
  act4: "text-red",
  act5: "text-red",
};

export function PhantomLevelTable({
  levels,
  solvedLevelIds,
  firstBloodByLevelId,
  solveCountByLevelId,
}: {
  levels: Level[];
  solvedLevelIds: Set<string>;
  firstBloodByLevelId: Map<string, FirstBloodInfo>;
  solveCountByLevelId?: Map<string, number>;
}) {
  const byAct: Record<PhantomTier, Level[]> = {
    act1: [],
    act2: [],
    act3: [],
    act4: [],
    act5: [],
  };
  for (const l of levels) {
    const c = getPhantomLevelContent(l.idx);
    if (!c) continue;
    byAct[c.tier].push(l);
  }

  return (
    <div className="space-y-6">
      {ACT_ORDER.map((act) => {
        const rows = byAct[act];
        if (rows.length === 0) return null;
        return (
          <section key={act}>
            <h3 className={`text-sm uppercase tracking-wider mb-2 ${ACT_COLOR[act]}`}>
              {ACT_LABEL[act]}
            </h3>
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="text-muted border-b border-border">
                  <th className="text-left py-1">#</th>
                  <th className="text-left py-1">Level</th>
                  <th className="text-right py-1">Points</th>
                  <th className="text-right py-1">Operatives</th>
                  <th className="text-left py-1 pl-4">First Blood</th>
                  <th className="text-right py-1">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => {
                  const solved = solvedLevelIds.has(l.id);
                  const fb = firstBloodByLevelId.get(l.id);
                  return (
                    <tr key={l.id} className="border-b border-border/50">
                      <td className="py-1 text-muted">{l.idx}</td>
                      <td className="py-1">
                        <Link
                          href={`/tracks/phantom/${l.idx}`}
                          className="hover:text-amber"
                        >
                          {l.title}
                        </Link>
                      </td>
                      <td className="py-1 text-right">{l.pointsBase}</td>
                      <td className="py-1 text-right text-muted">
                        {(solveCountByLevelId?.get(l.id) ?? 0) > 0
                          ? solveCountByLevelId!.get(l.id)
                          : "—"}
                      </td>
                      <td className="py-1 pl-4">
                        {fb ? (
                          <span className="text-amber">@{fb.username}</span>
                        ) : l.pointsFirstBloodBonus > 0 ? (
                          <span className="text-red text-xs">
                            FIRST BLOOD AVAILABLE
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td
                        className={`py-1 text-right ${
                          solved ? "text-green" : "text-muted"
                        }`}
                      >
                        {solved ? "solved" : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}
