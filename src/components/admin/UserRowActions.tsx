"use client";
import { useTransition } from "react";
import {
  toggleUserAdmin,
  resetUserTotp,
  forceEmailReverify,
} from "@/app/admin/users/actions";

type Props = {
  userId: string;
  username: string;
  isAdmin: boolean;
  totpEnabled: boolean;
  emailVerified: boolean;
  isSelf: boolean;
};

export function UserRowActions({
  userId,
  username,
  isAdmin,
  totpEnabled,
  emailVerified,
  isSelf,
}: Props) {
  const [pending, start] = useTransition();

  if (isSelf) {
    return <span className="text-[11px] text-muted">(you)</span>;
  }

  return (
    <div className="flex flex-wrap gap-2 text-[11px]">
      <button
        disabled={pending}
        onClick={() => {
          if (
            !confirm(
              `${isAdmin ? "Demote" : "Promote"} "${username}" ${isAdmin ? "from" : "to"} admin?`
            )
          )
            return;
          start(async () => {
            const r = await toggleUserAdmin(userId, !isAdmin);
            if (!r.ok) alert(r.error);
          });
        }}
        className="px-2 py-0.5 border border-amber/30 text-amber hover:bg-amber/10 disabled:opacity-40"
      >
        {isAdmin ? "demote" : "promote"}
      </button>
      {totpEnabled ? (
        <button
          disabled={pending}
          onClick={() => {
            if (!confirm(`Reset TOTP for "${username}"?`)) return;
            start(async () => {
              const r = await resetUserTotp(userId);
              if (!r.ok) alert(r.error);
            });
          }}
          className="px-2 py-0.5 border border-amber/30 hover:bg-amber/10 disabled:opacity-40"
        >
          reset 2fa
        </button>
      ) : null}
      {emailVerified ? (
        <button
          disabled={pending}
          onClick={() => {
            if (!confirm(`Force re-verify email for "${username}"?`)) return;
            start(async () => {
              const r = await forceEmailReverify(userId);
              if (!r.ok) alert(r.error);
            });
          }}
          className="px-2 py-0.5 border border-amber/30 hover:bg-amber/10 disabled:opacity-40"
        >
          reverify email
        </button>
      ) : null}
    </div>
  );
}
