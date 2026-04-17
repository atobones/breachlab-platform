"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitFlagAction } from "@/app/submit/actions";

const initialState = {
  ok: false,
  error: null as string | null,
  message: null as string | null,
};

export function SubmitForm() {
  const [state, formAction] = useActionState(submitFlagAction, initialState);
  return (
    <form action={formAction} className="space-y-3 text-sm">
      <label className="block">
        <span className="block text-muted mb-1">Flag</span>
        <input
          name="flag"
          required
          placeholder="FLAG{...}"
          autoFocus
          className="w-full bg-bg border border-border p-2 text-text focus:outline-none focus:border-amber"
        />
      </label>
      {state.error && <p className="text-red text-xs">{state.error}</p>}
      {state.ok && state.message && (
        <p className="text-green text-xs">{state.message}</p>
      )}
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
      {pending ? "..." : "[ Submit ]"}
    </button>
  );
}
