"use client";

import { useEffect, useState } from "react";

type Status = "idle" | "sending" | "sent" | "error";

const COOLDOWN_SECONDS = 60;

async function safeParseJson(res: Response): Promise<{
  ok?: boolean;
  error?: string;
  retryAfter?: number;
} | null> {
  // Cloudflare WAF / Turnstile / Caddy challenge layers can intercept
  // POSTs to this endpoint and return an HTML challenge page. Calling
  // .json() on that throws "Unexpected token <" which the user saw as
  // a generic "Network error" — and they kept clicking, sending more
  // mail. Try-parse, return null on non-JSON so the caller surfaces a
  // clear, actionable message instead.
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export function EmailVerificationBanner() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function resend() {
    if (cooldown > 0 || status === "sending") return;
    setStatus("sending");
    setMessage(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      const data = await safeParseJson(res);
      if (!res.ok) {
        setStatus("error");
        if (res.status === 429 && data?.retryAfter) {
          setCooldown(data.retryAfter);
          setMessage(data.error ?? `Try again in ${data.retryAfter}s.`);
        } else if (data?.error) {
          setMessage(data.error);
        } else {
          // Non-JSON response (e.g. Cloudflare challenge HTML) — be
          // honest about what happened so the user doesn't retry-spam.
          setMessage(
            "The request was blocked by the network layer before reaching the server. Refresh and try again."
          );
        }
        return;
      }
      if (!data?.ok) {
        setStatus("error");
        setMessage(data?.error ?? "Could not resend email.");
        return;
      }
      setStatus("sent");
      setMessage("Sent. Check your inbox (and spam).");
      setCooldown(COOLDOWN_SECONDS);
    } catch {
      setStatus("error");
      setMessage("Network error. Try again in a moment.");
    }
  }

  const buttonLabel =
    status === "sending"
      ? "Sending…"
      : cooldown > 0
        ? `Wait ${cooldown}s`
        : "Resend";

  return (
    <div className="border border-red/30 bg-red/5 px-3 py-2 text-xs flex items-center gap-3">
      <span className="text-red flex-1">
        Email not verified. Click the link we sent, or resend it below.
      </span>
      <button
        type="button"
        onClick={resend}
        disabled={status === "sending" || cooldown > 0}
        className="text-amber border border-amber/40 px-2 py-1 hover:bg-amber/10 disabled:opacity-50"
      >
        {buttonLabel}
      </button>
      {message && (
        <span
          className={status === "error" ? "text-red" : "text-muted"}
          role="status"
        >
          {message}
        </span>
      )}
    </div>
  );
}
