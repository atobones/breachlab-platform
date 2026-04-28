"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitFlagAction } from "@/app/submit/actions";
import type { SpecterNextCreds } from "@/lib/tracks/submit";

const initialState = {
  ok: false,
  error: null as string | null,
  message: null as string | null,
  specterNext: null as SpecterNextCreds | null,
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
          placeholder="e.g. W3lc0m3T0Gh0st"
          autoFocus
          autoComplete="off"
          spellCheck={false}
          className="w-full bg-bg border border-border p-2 text-text focus:outline-none focus:border-amber"
        />
      </label>
      {state.error && <p className="text-red text-xs">{state.error}</p>}
      {state.ok && state.message && (
        <p className="text-green text-xs">{state.message}</p>
      )}
      {state.ok && state.specterNext && (
        <SpecterNextBlock creds={state.specterNext} />
      )}
      <SubmitButton />
    </form>
  );
}

function SpecterNextBlock({ creds }: { creds: SpecterNextCreds }) {
  const sshCmd = `ssh ${creds.sshUser}@${creds.sshHost} -p ${creds.sshPort}`;
  return (
    <div className="border border-amber/40 bg-amber/5 p-3 space-y-2 text-xs">
      <p className="text-amber">
        Specter L{creds.levelIdx} unlocked: {creds.level}
      </p>
      <div>
        <span className="text-muted">SSH:</span>{" "}
        <code className="text-text">{sshCmd}</code>
      </div>
      <div>
        <span className="text-muted">Password:</span>{" "}
        <code className="text-text break-all">{creds.password}</code>
      </div>
      <p className="text-muted">
        Per-player password — distinct from your flag. Save it now; it
        is shown here once, but it&apos;s deterministic so you can ask
        the platform to re-issue it from your dashboard at any time.
      </p>
    </div>
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
      {pending ? (<span>[ <span className="dots" /> ]</span>) : "[ Submit ]"}
    </button>
  );
}
