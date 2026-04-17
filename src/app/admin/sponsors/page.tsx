import Link from "next/link";
import { getAllSponsors } from "@/lib/admin/queries";
import { SponsorRowActions } from "@/components/admin/SponsorRowActions";

export const dynamic = "force-dynamic";

function fmtMoney(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export default async function AdminSponsorsPage({
  searchParams,
}: {
  searchParams: Promise<{ ended?: string }>;
}) {
  const params = await searchParams;
  const includeEnded = params.ended === "1";
  const rows = await getAllSponsors({ includeEnded });

  const activeCount = rows.filter((r) => r.endedAt === null).length;
  const endedCount = rows.length - activeCount;
  const mrrCents = rows
    .filter((r) => r.endedAt === null)
    .reduce((acc, r) => acc + r.amountCentsMonthly, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs font-mono text-muted">
        <div>
          {activeCount} active · {endedCount} ended · MRR{" "}
          <span className="text-amber">{fmtMoney(mrrCents)}</span>
        </div>
        <Link
          href={includeEnded ? "/admin/sponsors" : "/admin/sponsors?ended=1"}
          className="underline hover:text-amber"
        >
          {includeEnded ? "hide ended" : "show ended"}
        </Link>
      </div>

      <table className="w-full text-sm font-mono">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="py-1">Operative</th>
            <th className="py-1">Source</th>
            <th className="py-1">Tier</th>
            <th className="py-1 text-right">Monthly</th>
            <th className="py-1">Visibility</th>
            <th className="py-1">Started</th>
            <th className="py-1">Status</th>
            <th className="py-1">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-4 text-center text-muted">
                no sponsors yet
              </td>
            </tr>
          ) : (
            rows.map((s) => (
              <tr
                key={s.id}
                className={`border-t border-amber/10 align-top ${s.endedAt ? "opacity-50" : ""}`}
              >
                <td className="py-2 text-amber">
                  {s.username ?? s.externalId ?? "anonymous"}
                </td>
                <td className="py-2 text-xs">{s.source}</td>
                <td className="py-2 text-xs uppercase">{s.tierCode}</td>
                <td className="py-2 text-right">
                  {fmtMoney(s.amountCentsMonthly)}
                </td>
                <td className="py-2 text-xs text-muted">{s.visibility}</td>
                <td className="py-2 text-xs text-muted">
                  {s.startedAt.toISOString().slice(0, 10)}
                </td>
                <td className="py-2 text-xs">
                  {s.endedAt ? (
                    <span className="text-muted">
                      ended {s.endedAt.toISOString().slice(0, 10)}
                    </span>
                  ) : (
                    <span className="text-green">active</span>
                  )}
                </td>
                <td className="py-2">
                  <SponsorRowActions
                    sponsorId={s.id}
                    label={s.username ?? s.externalId ?? "anonymous"}
                    isActive={s.endedAt === null}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
