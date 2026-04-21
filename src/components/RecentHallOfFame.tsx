import { getPublicCredits } from "@/lib/hall-of-fame/queries";
import { OperativeName } from "@/components/operatives/OperativeName";

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
    <ul className="ops-hof">
      {latest.map((c) => {
        const when = c.awardedAt
          ? new Date(c.awardedAt).toISOString().slice(5, 10).replace("-", "/")
          : "—/—";
        const name = c.username ?? c.displayName;
        const sevClass = `ops-hof-sev sev-${c.severity}`;
        return (
          <li key={c.id} className="ops-hof-row">
            <span className="ops-hof-date">{when}</span>
            <span className="ops-hof-name">
              <OperativeName
                username={name}
                isHallOfFame={c.isHallOfFame}
                href={c.username ? `/u/${c.username}` : null}
              />
            </span>
            <span className={sevClass}>{c.severity}</span>
            <span className="ops-hof-title" title={c.findingTitle}>
              {c.findingTitle}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
