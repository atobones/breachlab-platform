import { getRecentAudit } from "@/lib/admin/audit-queries";

export const dynamic = "force-dynamic";

const ACTION_TONE: Record<string, string> = {
  "user.promote": "text-amber",
  "user.demote": "text-muted",
  "user.reset_totp": "text-amber",
  "user.force_email_reverify": "text-muted",
  "user.logout_all_sessions": "text-red-400",
  "self.logout_all_sessions": "text-muted",
  "sponsor.end": "text-muted",
  "sponsor.delete": "text-red-400",
};

export default async function AdminAuditPage() {
  const rows = await getRecentAudit(200);

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted font-mono">
        last {rows.length} admin actions (newest first)
      </div>

      <table className="w-full text-sm font-mono tabular-nums">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="py-1">When</th>
            <th className="py-1">Actor</th>
            <th className="py-1">Action</th>
            <th className="py-1">Target</th>
            <th className="py-1">Source IP</th>
            <th className="py-1">Metadata</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-4 text-center text-muted">
                no admin actions recorded yet
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="border-t border-amber/10 align-top">
                <td className="py-2 text-xs text-muted whitespace-nowrap">
                  {r.createdAt.toISOString().slice(0, 19).replace("T", " ")}
                </td>
                <td className="py-2 text-amber">{r.actorUsername}</td>
                <td className={`py-2 text-xs ${ACTION_TONE[r.action] ?? ""}`}>
                  {r.action}
                </td>
                <td className="py-2 text-xs text-muted font-mono">
                  {r.targetUserId
                    ? `user:${r.targetUserId.slice(0, 8)}`
                    : r.targetSponsorId
                      ? `sponsor:${r.targetSponsorId.slice(0, 8)}`
                      : "—"}
                </td>
                <td className="py-2 text-xs text-muted">
                  {r.ipAddress ?? "—"}
                </td>
                <td className="py-2 text-xs text-muted break-all">
                  {r.metadata ?? ""}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
