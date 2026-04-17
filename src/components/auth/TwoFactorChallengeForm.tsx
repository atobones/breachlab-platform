"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { verifyTwoFactorAction } from "@/app/login/actions";

const initialState = { error: null as string | null };

export function TwoFactorChallengeForm() {
  const [state, formAction] = useActionState(
    verifyTwoFactorAction,
    initialState
  );
  return (
    <form action={formAction} className="space-y-3 text-sm">
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
      {pending ? "..." : "[ Verify ]"}
    </button>
  );
}
