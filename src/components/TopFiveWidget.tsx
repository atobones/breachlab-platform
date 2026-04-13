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
  return (
    <section>
      <h2 className="text-muted text-sm uppercase mb-2">▸ Top 5</h2>
      <ul className="text-sm space-y-1">
        {padded.slice(0, 5).map((row, i) => (
          <li
            key={row.userId}
            data-testid="top-five-row"
            className="flex justify-between"
          >
            <span>
              {i + 1}. {row.username === "—" ? "—" : `@${row.username}`}
            </span>
            <span className="text-muted">{row.points}</span>
          </li>
        ))}
      </ul>
      <Link href="/leaderboard" className="text-xs">
        [full board →]
      </Link>
    </section>
  );
}
