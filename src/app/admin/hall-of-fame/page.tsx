import Link from "next/link";
import { getAllCredits } from "@/lib/hall-of-fame/queries";
import { CreditRowActions } from "@/components/admin/CreditRowActions";
import { CreateCreditForm } from "@/components/admin/CreateCreditForm";

export const dynamic = "force-dynamic";

type StatusParam = "pending" | "confirmed" | "rejected" | "all";
const VALID_STATUS: StatusParam[] = ["pending", "confirmed", "rejected", "all"];

function isStatusParam(v: string | undefined): v is StatusParam {
  return v !== undefined && (VALID_STATUS as string[]).includes(v);
}

export default async function AdminHallOfFamePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const rawStatus = params.status;
  const status: StatusParam = isStatusParam(rawStatus) ? rawStatus : "pending";

  const credits = await getAllCredits({ status });
  const counts = await Promise.all([
    getAllCredits({ status: "pending" }).then((r) => r.length),
    getAllCredits({ status: "confirmed" }).then((r) => r.length),
    getAllCredits({ status: "rejected" }).then((r) => r.length),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 text-xs font-mono">
        <span className="text-muted">
          {counts[0]} pending · {counts[1]} confirmed · {counts[2]} rejected
        </span>
        <div className="flex gap-2 ml-auto">
          {VALID_STATUS.map((s) => (
            <Link
              key={s}
              href={`/admin/hall-of-fame?status=${s}`}
              className={
                s === status
                  ? "text-amber border border-amber/40 px-2 py-0.5"
                  : "text-muted border border-muted/20 px-2 py-0.5 hover:text-amber"
              }
            >
              {s}
            </Link>
          ))}
        </div>
      </div>

      <CreateCreditForm />

      <table className="w-full text-sm font-mono tabular-nums">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="py-1">Reporter</th>
            <th className="py-1">Finding</th>
            <th className="py-1">Class</th>
            <th className="py-1">Severity</th>
            <th className="py-1 text-right">Score</th>
            <th className="py-1">PR</th>
            <th className="py-1">Status</th>
            <th className="py-1">When</th>
            <th className="py-1">Actions</th>
          </tr>
        </thead>
        <tbody>
          {credits.length === 0 ? (
            <tr>
              <td colSpan={9} className="py-4 text-center text-muted">
                no credits in this view
              </td>
            </tr>
          ) : (
            credits.map((c) => (
              <tr key={c.id} className="border-t border-amber/10 align-top">
                <td className="py-2">
                  <div className="text-amber">{c.displayName}</div>
                  {c.discordHandle && (
                    <div className="text-[10px] text-muted">@{c.discordHandle}</div>
                  )}
                  {c.username && (
                    <div className="text-[10px] text-muted">
                      linked: {c.username}{" "}
                      {c.isHallOfFame ? (
                        <span className="text-[#facc15]">(HoF)</span>
                      ) : null}
                    </div>
                  )}
                </td>
                <td className="py-2 max-w-xs">
                  <div>{c.findingTitle}</div>
                  {c.findingDescription && (
                    <div className="text-[10px] text-muted mt-0.5">
                      {c.findingDescription.slice(0, 140)}
                      {c.findingDescription.length > 140 ? "…" : ""}
                    </div>
                  )}
                </td>
                <td className="py-2 text-xs text-muted">{c.classRef ?? "—"}</td>
                <td className="py-2 text-xs uppercase">{c.severity}</td>
                <td className="py-2 text-right text-amber">{c.securityScore}</td>
                <td className="py-2 text-xs text-muted">{c.prRef ?? "—"}</td>
                <td className="py-2 text-xs">
                  <span
                    className={
                      c.status === "confirmed"
                        ? "text-[#facc15]"
                        : c.status === "rejected"
                          ? "text-red-400"
                          : "text-muted"
                    }
                  >
                    {c.status}
                  </span>
                </td>
                <td className="py-2 text-xs text-muted">
                  {(c.awardedAt ?? c.createdAt).toISOString().slice(0, 10)}
                </td>
                <td className="py-2">
                  <CreditRowActions
                    creditId={c.id}
                    label={c.displayName}
                    status={c.status}
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
