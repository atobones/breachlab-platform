"use client";
import { useState, useTransition } from "react";
import { broadcastOpsEmail } from "@/app/admin/ops-broadcast/actions";

type Props = { recipientCount: number };

export function OpsBroadcastForm({ recipientCount }: Props) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [totp, setTotp] = useState("");
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ready =
    subject.trim().length > 0 &&
    body.trim().length > 0 &&
    /^\d{6}$/.test(totp.trim());

  function handleSend() {
    if (!ready) return;
    if (
      !confirm(
        `Send "${subject.trim()}" to ${recipientCount} email-verified users? This is irreversible.`
      )
    ) {
      return;
    }
    setResult(null);
    setError(null);
    start(async () => {
      const res = await broadcastOpsEmail(subject, body, totp);
      if (!res.ok) {
        setError(res.error);
      } else {
        setResult(
          `sent=${res.sent} failed=${res.failed} total=${res.total}`
        );
        setSubject("");
        setBody("");
        setTotp("");
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSend();
      }}
      className="space-y-3 text-xs font-mono"
    >
      <label className="block">
        <span className="text-muted">subject</span>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={200}
          placeholder="e.g. SSH host keys rotated 2026-05-07"
          className="mt-0.5 w-full bg-black/30 border border-amber/30 px-2 py-1 text-text"
          disabled={pending}
        />
      </label>

      <label className="block">
        <span className="text-muted">body (plain text, no html)</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={10_000}
          rows={12}
          placeholder="Plain text email body. Recipients won't see html — keep it readable."
          className="mt-0.5 w-full bg-black/30 border border-amber/30 px-2 py-1 text-text"
          disabled={pending}
        />
        <span className="text-muted text-[10px]">
          {body.length}/10000 chars
        </span>
      </label>

      <label className="block">
        <span className="text-muted">TOTP (6 digits)</span>
        <input
          type="text"
          value={totp}
          onChange={(e) => setTotp(e.target.value.replace(/\D/g, ""))}
          maxLength={6}
          inputMode="numeric"
          autoComplete="one-time-code"
          className="mt-0.5 w-32 bg-black/30 border border-amber/30 px-2 py-1 text-text tracking-widest"
          disabled={pending}
        />
      </label>

      <button
        type="submit"
        disabled={!ready || pending}
        className="px-3 py-1 border border-red-400/50 text-red-300 hover:bg-red-500/10 disabled:opacity-40"
      >
        {pending ? "sending…" : `send to ${recipientCount}`}
      </button>

      {result && (
        <div className="text-amber border border-amber/40 bg-amber/5 p-2">
          {result}
        </div>
      )}
      {error && (
        <div className="text-red-300 border border-red-400/40 bg-red-500/5 p-2">
          {error}
        </div>
      )}
    </form>
  );
}
