"use client";
import { useTransition } from "react";
import { endSponsorship, deleteSponsor } from "@/app/admin/sponsors/actions";

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
            if (!confirm(`End sponsorship for ${label}?`)) return;
            start(async () => {
              const r = await endSponsorship(sponsorId);
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
          if (!confirm(`Permanently DELETE sponsor row for ${label}?`)) return;
          start(async () => {
            const r = await deleteSponsor(sponsorId);
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
