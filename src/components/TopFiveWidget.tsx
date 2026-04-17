import Link from "next/link";
import { getGlobalTop } from "@/lib/leaderboard/queries";

export async function TopFiveWidget() {
  const rows = await getGlobalTop(5);
  const padded =
    rows.length >= 5
      ? rows
      : [
          ...rows,
          ...Array.from({ length: 5 - rows.length }, (_, i) => ({
            userId: `placeholder-${i}`,
            username: "—",
            points: 0,
            solved: 0,
          })),
        ];
  // Podium hint: amber fades for ranks 1-3, then muted. Monospace makes
  // the rank column naturally aligned, tabular-nums keeps the point
  // column flush.
  const RANK_TONE = [
    "text-amber",
    "text-amber/80",
    "text-amber/60",
    "text-muted",
    "text-muted",
  ];

  return (
    <section>
      <h2 className="text-muted text-sm uppercase mb-2">▸ Top 5</h2>
      <ul className="text-sm space-y-1 tabular-nums">
        {padded.slice(0, 5).map((row, i) => (
          <li
            key={row.userId}
            data-testid="top-five-row"
            className="flex justify-between"
          >
            <span className={RANK_TONE[i]}>
              {i + 1}. {row.username === "—" ? "—" : `@${row.username}`}
            </span>
            <span className="text-muted">{row.points}</span>
          </li>
        ))}
      </ul>
      <Link href="/leaderboard" className="text-xs hover:underline">
        [full board →]
      </Link>
    </section>
  );
}
