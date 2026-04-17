"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { registerAction } from "@/app/register/actions";

const initialState = { error: null as string | null };

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initialState);
  return (
    <form action={formAction} className="space-y-3 text-sm">
      <label className="block">
        <span className="block text-muted mb-1">Username</span>
        <input
          name="username"
          required
          minLength={3}
          maxLength={32}
          className="w-full bg-bg border border-border p-2 text-text focus:outline-none focus:border-amber"
        />
      </label>
      <label className="block">
        <span className="block text-muted mb-1">Email</span>
        <input
          name="email"
          type="email"
          required
          className="w-full bg-bg border border-border p-2 text-text focus:outline-none focus:border-amber"
        />
      </label>
      <label className="block">
        <span className="block text-muted mb-1">Password (min 12)</span>
        <input
          name="password"
          type="password"
          required
          minLength={12}
          className="w-full bg-bg border border-border p-2 text-text focus:outline-none focus:border-amber"
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
      {pending ? (<span>[ <span className="dots" /> ]</span>) : "[ Register ]"}
    </button>
  );
}
