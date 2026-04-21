import Link from "next/link";
import { getPublicCredits } from "@/lib/hall-of-fame/queries";

const SEV_COLOR: Record<string, string> = {
  critical: "text-red-400",
  high: "text-orange-400",
  medium: "text-amber",
  low: "text-green-400",
};

export async function RecentHallOfFame() {
  const all = await getPublicCredits();
  const latest = all.slice(0, 5);

  if (latest.length === 0) {
    return (
      <div className="ops-stream ops-stream-empty">
        <span className="text-muted">no security contributors yet</span>
      </div>
    );
  }

  return (
    <ul className="ops-stream">
      {latest.map((c) => {
        const when = c.awardedAt
          ? new Date(c.awardedAt).toISOString().slice(5, 10).replace("-", "/")
          : "——/——";
        const name = c.username ?? c.displayName;
        const nameClass = c.isHallOfFame
          ? "text-[#facc15] drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]"
          : "text-amber";
        return (
          <li key={c.id} className="ops-stream-row">
            <span className="ops-stream-ts">{when}</span>
            <span className="ops-stream-line">
              {c.username ? (
                <Link href={`/u/${c.username}`} className={`${nameClass} hover:underline`}>
                  @{name}
                </Link>
              ) : (
                <span className={nameClass}>@{name}</span>
              )}
              <span className="text-muted"> · </span>
              <span className={SEV_COLOR[c.severity] ?? "text-muted"}>
                {c.severity}
              </span>
              <span className="text-muted"> · </span>
              <span className="text-muted/80">
                {c.findingTitle.length > 52
                  ? `${c.findingTitle.slice(0, 52)}…`
                  : c.findingTitle}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
