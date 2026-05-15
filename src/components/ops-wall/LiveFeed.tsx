import Link from "next/link";
import { getRecentSubmits } from "@/lib/leaderboard/queries";
import { OperativeName } from "@/components/operatives/OperativeName";

function relTime(d: Date): string {
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 30) return "now";
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

export async function LiveFeed() {
  const rows = await getRecentSubmits(40);
  return (
    <div className="border border-amber/20 p-3 flex flex-col gap-2 min-h-0">
      <div className="flex items-center justify-between text-[11px] shrink-0">
        <span className="text-amber">[ LIVE FEED ]</span>
        <Link
          href="/leaderboard"
          className="text-muted hover:text-amber transition-colors no-underline"
        >
          full →
        </Link>
      </div>
      {rows.length === 0 ? (
        <div className="text-muted text-[11px]">awaiting first submission</div>
      ) : (
        <ul className="flex flex-col gap-1 text-[11px] overflow-y-auto min-h-0">
          {rows.map((r, i) => (
            <li
              key={i}
              className="flex items-baseline gap-2 tabular-nums"
            >
              <span className="text-amber/40">▸</span>
              <span className="truncate max-w-[10rem]">
                <OperativeName
                  username={r.username}
                  isHallOfFame={r.isHallOfFame}
                  href={`/u/${r.username}`}
                />
              </span>
              <span className="text-muted">
                {r.trackSlug}/{r.levelIdx}
              </span>
              <span className="ml-auto text-amber/50 text-[10px]">
                {relTime(r.submittedAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
