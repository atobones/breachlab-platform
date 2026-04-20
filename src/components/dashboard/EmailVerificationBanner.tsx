"use client";

import { useState } from "react";

type Status = "idle" | "sending" | "sent" | "error";

export function EmailVerificationBanner() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function resend() {
    setStatus("sending");
    setMessage(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
      });
      const data: { ok?: boolean; error?: string } = await res.json();
      if (!res.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error ?? "Could not resend email.");
        return;
      }
      setStatus("sent");
      setMessage("Sent. Check your inbox (and spam).");
    } catch {
      setStatus("error");
      setMessage("Network error. Try again.");
    }
  }

  return (
    <div className="border border-red/30 bg-red/5 px-3 py-2 text-xs flex items-center gap-3">
      <span className="text-red flex-1">
        Email not verified. Click the link we sent, or resend it below.
      </span>
      <button
        type="button"
        onClick={resend}
        disabled={status === "sending" || status === "sent"}
        className="text-amber border border-amber/40 px-2 py-1 hover:bg-amber/10 disabled:opacity-50"
      >
        {status === "sending"
          ? "Sending…"
          : status === "sent"
            ? "Sent"
            : "Resend"}
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
