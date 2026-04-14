import Link from "next/link";
import type { Level } from "@/lib/db/schema";
import { TierBadge } from "./TierBadge";
import {
  getPhantomLevelContent,
  type PhantomTier,
} from "@/lib/tracks/phantom-level-content";
import type { FirstBloodInfo } from "./LevelTable";

const TIER_ORDER: PhantomTier[] = [
  "recruit",
  "operator",
  "phantom",
  "graduate",
];

const TIER_LABEL: Record<PhantomTier, string> = {
  recruit: "Recruit — Sudo domain mastery",
  operator: "Operator — Capabilities, files, legacy docker",
  phantom: "Phantom — Container escape discipline",
  graduate: "Graduate — Kubectl-free + handoff",
};

export function PhantomLevelTable({
  levels,
  solvedLevelIds,
  firstBloodByLevelId,
}: {
  levels: Level[];
  solvedLevelIds: Set<string>;
  firstBloodByLevelId: Map<string, FirstBloodInfo>;
}) {
  const byTier: Record<PhantomTier, Level[]> = {
    recruit: [],
    operator: [],
    phantom: [],
    graduate: [],
  };
  for (const l of levels) {
    const c = getPhantomLevelContent(l.idx);
    if (!c) continue;
    byTier[c.tier].push(l);
  }

  return (
    <div className="space-y-6">
      {TIER_ORDER.map((tier) => {
        const rows = byTier[tier];
        if (rows.length === 0) return null;
        return (
          <section key={tier}>
            <div className="flex items-center gap-3 mb-2">
              <TierBadge tier={tier} size="sm" />
              <span className="text-xs text-muted uppercase tracking-wider">
                {TIER_LABEL[tier]}
              </span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted border-b border-border">
                  <th className="text-left py-1">#</th>
                  <th className="text-left py-1">Level</th>
                  <th className="text-right py-1">Points</th>
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
