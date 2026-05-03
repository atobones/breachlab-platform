import Link from "next/link";
import type { Level } from "@/lib/db/schema";
import type { FirstBloodInfo } from "./LevelTable";
import { OperativeName } from "@/components/operatives/OperativeName";

// Specter I structured into thematic acts. Mapping is layout-only
// (no DB column); update here when adding levels.
type SpecterAct = "act1" | "act2" | "act3" | "act4";
const SPECTER_ACT_BY_IDX: Record<number, SpecterAct> = {
  0: "act1", 1: "act1", 2: "act1", 3: "act1",
  4: "act2", 5: "act2",
  6: "act3", 7: "act3",
  8: "act4", 9: "act4", 10: "act4", 11: "act4", 12: "act4", 13: "act4",
};
const ACT_ORDER: SpecterAct[] = ["act1", "act2", "act3", "act4"];
const ACT_LABEL: Record<SpecterAct, string> = {
  act1: "Act I — Foundations",
  act2: "Act II — People & Tradecraft",
  act3: "Act III — Image & Synthetic Media",
  act4: "Act IV — Deep Investigation & Capstone",
};

export function SpecterLevelTable({
  levels,
  solvedLevelIds,
  unlockedLevelIds,
  authed,
  firstBloodByLevelId,
  solveCountByLevelId,
}: {
  levels: Level[];
  solvedLevelIds: Set<string>;
  unlockedLevelIds: Set<string>;
  authed: boolean;
  firstBloodByLevelId: Map<string, FirstBloodInfo>;
  solveCountByLevelId?: Map<string, number>;
}) {
  const byAct: Record<SpecterAct, Level[]> = {
    act1: [], act2: [], act3: [], act4: [],
  };
  for (const l of levels) {
    const a = SPECTER_ACT_BY_IDX[l.idx] ?? "act4";
    byAct[a].push(l);
  }

  return (
    <div className="space-y-6">
      {ACT_ORDER.map((act) => {
        const rows = byAct[act];
        if (rows.length === 0) return null;
        return (
          <section key={act}>
            <h3 className="text-sm uppercase tracking-wider mb-2 text-green">
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
                  const unlocked = unlockedLevelIds.has(l.id);
                  const fb = firstBloodByLevelId.get(l.id);
                  return (
                    <tr key={l.id} className="border-b border-border/50">
                      <td className="py-1 text-muted">{l.idx}</td>
                      <td className="py-1">
                        <Link
                          href={`/tracks/specter/${l.idx}`}
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
                          <>
                            @
                            <OperativeName
                              username={fb.username}
                              isHallOfFame={fb.isHallOfFame}
                              href={`/u/${fb.username}`}
                              className={fb.isHallOfFame ? "" : "text-amber"}
                            />
                          </>
                        ) : l.pointsFirstBloodBonus > 0 ? (
                          <span className="text-amber text-xs">
                            FIRST BLOOD AVAILABLE
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="py-1 text-right whitespace-nowrap">
                        {!authed ? (
                          <span className="text-muted">—</span>
                        ) : solved ? (
                          <span className="text-green">solved</span>
                        ) : unlocked ? (
                          <span className="text-amber">available</span>
                        ) : (
                          <span className="text-muted">locked</span>
                        )}
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
