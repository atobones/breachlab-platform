import Link from "next/link";

const PLACEHOLDER = [
  { rank: 1, name: "—", points: 0 },
  { rank: 2, name: "—", points: 0 },
  { rank: 3, name: "—", points: 0 },
  { rank: 4, name: "—", points: 0 },
  { rank: 5, name: "—", points: 0 },
];

export function TopFiveWidget() {
  return (
    <section>
      <h2 className="text-muted text-sm uppercase mb-2">▸ Top 5</h2>
      <ul className="text-sm space-y-1">
        {PLACEHOLDER.map((row) => (
          <li
            key={row.rank}
            data-testid="top-five-row"
            className="flex justify-between"
          >
            <span>
              {row.rank}. {row.name}
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
