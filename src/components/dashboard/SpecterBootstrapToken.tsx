"use client";

import { useState, useTransition } from "react";
import { issueSpecterTokenAction } from "@/lib/specter/issue-token-action";

// Specter L0 bootstrap token. Player clicks → invokes a Server Action
// (issueSpecterTokenAction) which writes a hashed token row and returns
// the plaintext once. Server Actions ride Next's RSC channel rather than
// /api/* fetch, which lets us bypass the Cloudflare Bot Fight Mode
// challenge that blocks the JSON XHR variant. The /api route still
// exists for external CLIs.
//
// Token lasts 7 days; lost-token recovery is "click again". The token is
// not auth-bearing on the platform — only the oracle can resolve it (and
// only over the platform-internal SPECTER_ORACLE_SECRET-bearer endpoint),
// so leaks are low-impact.
export function SpecterBootstrapToken() {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function issue() {
    setError(null);
    startTransition(async () => {
      try {
        const r = await issueSpecterTokenAction();
        if (!r.ok) {
          setError(r.error);
          return;
        }
        setToken(r.token);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed");
      }
    });
  }

  return (
    <section className="border border-border p-3 space-y-2 text-sm">
      <h2 className="text-lg text-amber">Specter L0 bootstrap token</h2>
      <p className="text-xs text-muted">
        Required only for Specter L0 entry. Inside the L0 ephemeral, run{" "}
        <code>export BL_TOKEN=&lt;the-string-below&gt;</code> before{" "}
        <code>/opt/specter-verify</code>. From L1 onward the password issued
        on the previous level&apos;s submit is what you ssh in with — no
        token needed.
      </p>
      {!token && (
        <button
          type="button"
          onClick={issue}
          disabled={pending}
          className="btn-bracket text-sm disabled:opacity-50"
        >
          {pending ? "Issuing…" : "Generate token"}
        </button>
      )}
      {token && (
        <div className="space-y-1">
          <code className="block break-all bg-bg border border-border p-2 text-text text-xs">
            {token}
          </code>
          <p className="text-muted text-xs">
            Save this now — it is shown once. Expires in 7 days. Click
            again any time for a fresh token.
          </p>
        </div>
      )}
      {error && <p className="text-red text-xs">{error}</p>}
    </section>
  );
}
