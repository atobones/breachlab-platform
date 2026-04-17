"use client";
import { useTransition } from "react";
import {
  toggleUserAdmin,
  resetUserTotp,
  forceEmailReverify,
  logoutUserAllSessions,
} from "@/app/admin/users/actions";

type Props = {
  userId: string;
  username: string;
  isAdmin: boolean;
  totpEnabled: boolean;
  emailVerified: boolean;
  isSelf: boolean;
};

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

  const btn =
    "px-2 py-0.5 border border-amber/30 text-amber hover:bg-amber/10 disabled:opacity-40";
  const dangerBtn =
    "px-2 py-0.5 border border-red-400/40 text-red-400 hover:bg-red-400/10 disabled:opacity-40";

  return (
    <div className="flex flex-wrap gap-2 text-[11px]">
      <button
        disabled={pending}
        onClick={() => {
          const label = `${isAdmin ? "demote" : "promote"} ${username}`;
          if (!confirm(`Confirm ${label}?`)) return;
          const code = promptTotp(label);
          if (!code) return;
          start(async () => {
            const r = await toggleUserAdmin(userId, !isAdmin, code);
            if (!r.ok) alert(r.error);
          });
        }}
        className={btn}
      >
        {isAdmin ? "demote" : "promote"}
      </button>
      {totpEnabled ? (
        <button
          disabled={pending}
          onClick={() => {
            const label = `reset 2FA for ${username}`;
            if (!confirm(`Confirm ${label}? (kills all their sessions)`)) return;
            const code = promptTotp(label);
            if (!code) return;
            start(async () => {
              const r = await resetUserTotp(userId, code);
              if (!r.ok) alert(r.error);
            });
          }}
          className={btn}
        >
          reset 2fa
        </button>
      ) : null}
      {emailVerified ? (
        <button
          disabled={pending}
          onClick={() => {
            const label = `reverify email of ${username}`;
            if (!confirm(`Confirm ${label}?`)) return;
            const code = promptTotp(label);
            if (!code) return;
            start(async () => {
              const r = await forceEmailReverify(userId, code);
              if (!r.ok) alert(r.error);
            });
          }}
          className={btn}
        >
          reverify email
        </button>
      ) : null}
      <button
        disabled={pending}
        onClick={() => {
          const label = `sign out ALL sessions of ${username}`;
          if (!confirm(`Confirm ${label}? (user will be logged out everywhere)`)) return;
          const code = promptTotp(label);
          if (!code) return;
          start(async () => {
            const r = await logoutUserAllSessions(userId, code);
            if (!r.ok) alert(r.error);
          });
        }}
        className={dangerBtn}
      >
        sign out all
      </button>
    </div>
  );
}
