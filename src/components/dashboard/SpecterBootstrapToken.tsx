"use client";

import { useState } from "react";

type IssueResp = { token: string; expiresAt: string };

// Specter L0 bootstrap token. Player clicks → POST /api/specter/issue-token,
// receives plaintext once, copies into BL_TOKEN env on the L0 ephemeral.
// Token lasts 7 days; lost-token recovery is "click again". The token is
// not auth-bearing on the platform — only the oracle can resolve it (and
// only over the platform-internal SPECTER_ORACLE_SECRET-bearer endpoint),
// so leaks are low-impact.
export function SpecterBootstrapToken() {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function issue() {
    setPending(true);
    setError(null);
    try {
      const r = await fetch("/api/specter/issue-token", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: "{}",
      });
      if (!r.ok) {
        const text = await r.text().catch(() => "");
        let detail = `HTTP ${r.status}`;
        try {
          const parsed = JSON.parse(text) as { error?: string };
          if (parsed.error) detail = parsed.error;
        } catch {
          if (text) detail = `HTTP ${r.status} — ${text.slice(0, 120)}`;
        }
        setError(detail);
        return;
      }
      const body = (await r.json()) as IssueResp;
      setToken(body.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setPending(false);
    }
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
          className="border border-amber text-amber px-3 py-1 hover:bg-amber/10 disabled:opacity-50"
        >
          {pending ? "Issuing…" : "[ Generate token ]"}
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
