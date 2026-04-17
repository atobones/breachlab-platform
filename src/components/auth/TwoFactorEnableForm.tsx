"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { confirmEnable2faAction } from "@/app/dashboard/2fa/actions";

const initialState = {
  secret: null as string | null,
  qrDataUrl: null as string | null,
  error: null as string | null,
  done: false,
};

export function TwoFactorEnableForm({
  secret,
  qrDataUrl,
}: {
  secret: string;
  qrDataUrl: string;
}) {
  const [state, formAction] = useActionState(
    confirmEnable2faAction,
    initialState
  );
  if (state.done) {
    return (
      <p className="text-green text-sm">
        2FA enabled. Keep your authenticator safe.
      </p>
    );
  }
  return (
    <form action={formAction} className="space-y-3 text-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qrDataUrl} alt="TOTP QR" className="border border-border" />
      <p className="text-muted text-xs break-all">Manual: {secret}</p>
      <input type="hidden" name="secret" value={secret} />
      <label className="block">
        <span className="block text-muted mb-1">6-digit code</span>
        <input
          name="code"
          inputMode="numeric"
          pattern="\d{6}"
          required
          autoFocus
          className="w-full bg-bg border border-border p-2 text-text focus:outline-none focus:border-amber tracking-widest"
        />
      </label>
      {state.error && <p className="text-red text-xs">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="border border-amber text-amber px-4 py-2 hover:bg-amber/10 hover:border-amber transition-colors disabled:opacity-50"
    >
      {pending ? "..." : "[ Enable 2FA ]"}
    </button>
  );
}
