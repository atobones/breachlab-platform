"use client";

import { useState, useTransition } from "react";
import { issueSpecterTokenAction } from "@/lib/specter/issue-token-action";

// Bare token-issuer: just the button + token display + error line.
// No wrapper section, no preamble. Embed inside a parent SSH/access
// panel that already labels what the token is.
export function SpecterTokenIssuer() {
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
    <div className="space-y-2 text-sm">
      <button
        type="button"
        onClick={issue}
        disabled={pending}
        className="btn-bracket text-sm disabled:opacity-50"
      >
        {pending ? "Issuing…" : token ? "Regenerate token" : "Generate token"}
      </button>
      {token && (
        <div className="space-y-1">
          <code className="block break-all bg-bg border border-border p-2 text-text text-xs">
            {token}
          </code>
          <p className="text-muted text-xs">
            Shown once · 7-day expiry · click again for a fresh one.
          </p>
        </div>
      )}
      {error && <p className="text-red text-xs">{error}</p>}
    </div>
  );
}
