import Link from "next/link";
import type { Level } from "@/lib/db/schema";
import {
  getPhantomLevelContent,
  type PhantomTier,
} from "@/lib/tracks/phantom-level-content";
import type { FirstBloodInfo } from "./LevelTable";
import { OperativeName } from "@/components/operatives/OperativeName";

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

// Parse mitigationVersion (either "YYYY-MM" or "YYYY-MM-DD") into a Date;
// return null when it isn't a shape we understand. Used to tag recently-
// changed levels with a NEW chip.
function parseMitigationVersion(v: string): Date | null {
  const ymd = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) return new Date(Date.UTC(+ymd[1], +ymd[2] - 1, +ymd[3]));
  const ym = v.match(/^(\d{4})-(\d{2})$/);
  if (ym) return new Date(Date.UTC(+ym[1], +ym[2] - 1, 1));
  return null;
}

// A level shows the NEW chip when its mitigationVersion landed within the
// last UPDATE_WINDOW_DAYS. Only levels edited with a full YYYY-MM-DD date
// can hit the threshold — coarse "YYYY-MM" entries resolve to the 1st and
// age out within days.
const UPDATE_WINDOW_DAYS = 30;

function isRecentlyUpdated(mitigationVersion: string): boolean {
  const d = parseMitigationVersion(mitigationVersion);
  if (!d) return false;
  const now = Date.now();
  const ageMs = now - d.getTime();
  return ageMs >= 0 && ageMs <= UPDATE_WINDOW_DAYS * 24 * 3600 * 1000;
}

export function PhantomLevelTable({
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
                  const unlocked = unlockedLevelIds.has(l.id);
                  const fb = firstBloodByLevelId.get(l.id);
                  const content = getPhantomLevelContent(l.idx);
                  const recentlyUpdated =
                    content && isRecentlyUpdated(content.mitigationVersion);
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
                          <span className="text-red text-xs">
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
                        {recentlyUpdated && (
                          <span className="ml-2 text-amber text-[10px] border border-amber/40 px-1 uppercase tracking-wider">
                            updated
                          </span>
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
