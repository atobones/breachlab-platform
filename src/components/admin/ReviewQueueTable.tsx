"use client";
import { useTransition } from "react";
import type { SuspiciousRunRow } from "@/lib/speedrun/queries";
import { approveRun, rejectRun } from "@/app/admin/review/actions";

function formatTime(totalSeconds: number | null): string {
  if (totalSeconds === null) return "—";
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function promptTotp(actionLabel: string): string | null {
  const code = window.prompt(`6-digit TOTP code to confirm: ${actionLabel}`);
  if (code === null) return null;
  const cleaned = code.trim();
  if (!/^\d{6}$/.test(cleaned)) {
    alert("TOTP code must be 6 digits");
    return null;
  }
  return cleaned;
}

export function ReviewQueueTable({ runs }: { runs: SuspiciousRunRow[] }) {
  const [pending, start] = useTransition();

  return (
    <table className="w-full text-sm font-mono">
      <thead>
        <tr className="text-left text-muted text-xs">
          <th className="py-1">Operative</th>
          <th className="py-1">Track</th>
          <th className="py-1">Time</th>
          <th className="py-1">Started</th>
          <th className="py-1">Actions</th>
        </tr>
      </thead>
      <tbody>
        {runs.map((run) => (
          <tr key={run.id} className="border-t border-amber/10">
            <td className="py-2 text-amber">{run.username}</td>
            <td className="py-2">{run.trackName}</td>
            <td className="py-2">{formatTime(run.totalSeconds)}</td>
            <td className="py-2 text-xs text-muted">
              {run.startedAt.toISOString().slice(0, 19).replace("T", " ")}
            </td>
            <td className="py-2 flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  const label = `approve run for ${run.username}`;
                  if (!confirm(`Confirm ${label}?`)) return;
                  const code = promptTotp(label);
                  if (!code) return;
                  start(async () => {
                    const r = await approveRun(run.id, code);
                    if (!r.ok) alert(r.error);
                  });
                }}
                className="text-xs px-2 py-1 border border-amber/40 text-amber hover:bg-amber/10 disabled:opacity-40"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  const label = `reject run for ${run.username}`;
                  if (!confirm(`Confirm ${label}?`)) return;
                  const code = promptTotp(label);
                  if (!code) return;
                  start(async () => {
                    const r = await rejectRun(run.id, code);
                    if (!r.ok) alert(r.error);
                  });
                }}
                className="text-xs px-2 py-1 border border-red-400/40 text-red-400 hover:bg-red-400/10 disabled:opacity-40"
              >
                Reject
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
