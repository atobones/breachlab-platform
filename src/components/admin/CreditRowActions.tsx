"use client";
import { useTransition } from "react";
import {
  confirmCredit,
  rejectCredit,
  deleteCredit,
} from "@/app/admin/hall-of-fame/actions";

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

export function CreditRowActions({
  creditId,
  label,
  status,
}: {
  creditId: string;
  label: string;
  status: string;
}) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2 text-[11px]">
      {status === "pending" && (
        <>
          <button
            disabled={pending}
            onClick={() => {
              const actionLabel = `CONFIRM credit for ${label} (fires Discord announce + updates score)`;
              if (!confirm(`${actionLabel}?`)) return;
              const code = promptTotp(actionLabel);
              if (!code) return;
              start(async () => {
                const r = await confirmCredit(creditId, code);
                if (!r.ok) alert(r.error);
              });
            }}
            className="px-2 py-0.5 border border-[#facc15]/40 text-[#facc15] hover:bg-[#facc15]/10 disabled:opacity-40"
          >
            confirm
          </button>
          <button
            disabled={pending}
            onClick={() => {
              const actionLabel = `reject credit for ${label}`;
              if (!confirm(`${actionLabel}?`)) return;
              const code = promptTotp(actionLabel);
              if (!code) return;
              start(async () => {
                const r = await rejectCredit(creditId, code);
                if (!r.ok) alert(r.error);
              });
            }}
            className="px-2 py-0.5 border border-muted/30 text-muted hover:bg-muted/10 disabled:opacity-40"
          >
            reject
          </button>
        </>
      )}
      <button
        disabled={pending}
        onClick={() => {
          const actionLabel = `permanently DELETE credit for ${label}${status === "confirmed" ? " (reverses score)" : ""}`;
          if (!confirm(`${actionLabel}?`)) return;
          const code = promptTotp(actionLabel);
          if (!code) return;
          start(async () => {
            const r = await deleteCredit(creditId, code);
            if (!r.ok) alert(r.error);
          });
        }}
        className="px-2 py-0.5 border border-red-400/40 text-red-400 hover:bg-red-400/10 disabled:opacity-40"
      >
        delete
      </button>
    </div>
  );
}
