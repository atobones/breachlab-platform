"use client";
import { useTransition } from "react";
import { endSponsorship, deleteSponsor } from "@/app/admin/sponsors/actions";

function promptTotp(actionLabel: string): string | null {
  const code = window.prompt(
    `6-digit TOTP code to confirm: ${actionLabel}`
  );
  if (code === null) return null;
  const cleaned = code.trim();
  if (!/^\d{6}$/.test(cleaned)) {
    alert("TOTP code must be 6 digits");
    return null;
  }
  return cleaned;
}

export function SponsorRowActions({
  sponsorId,
  label,
  isActive,
}: {
  sponsorId: string;
  label: string;
  isActive: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2 text-[11px]">
      {isActive ? (
        <button
          disabled={pending}
          onClick={() => {
            const actionLabel = `end sponsorship for ${label}`;
            if (!confirm(`Confirm ${actionLabel}?`)) return;
            const code = promptTotp(actionLabel);
            if (!code) return;
            start(async () => {
              const r = await endSponsorship(sponsorId, code);
              if (!r.ok) alert(r.error);
            });
          }}
          className="px-2 py-0.5 border border-amber/30 text-amber hover:bg-amber/10 disabled:opacity-40"
        >
          end
        </button>
      ) : null}
      <button
        disabled={pending}
        onClick={() => {
          const actionLabel = `permanently DELETE sponsor row for ${label}`;
          if (!confirm(`Confirm ${actionLabel}?`)) return;
          const code = promptTotp(actionLabel);
          if (!code) return;
          start(async () => {
            const r = await deleteSponsor(sponsorId, code);
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
