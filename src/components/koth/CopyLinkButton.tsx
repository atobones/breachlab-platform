"use client";

import { useState } from "react";

type Props = {
  // The relative URL (e.g. "/battles/koth/replay/abc-def"). We resolve
  // to absolute on the client side via window.location.origin so the
  // share link works in any environment.
  path: string;
  // Optional label override — defaults to "share link"
  label?: string;
};

export function CopyLinkButton({ path, label = "share link" }: Props) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      const url = window.location.origin + path;
      await navigator.clipboard.writeText(url);
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 1600);
    } catch {
      setStatus("failed");
      setTimeout(() => setStatus("idle"), 2000);
    }
  }

  const cls =
    status === "copied"
      ? "border-green text-green bg-green/10"
      : status === "failed"
        ? "border-red text-red bg-red/10"
        : "border-amber/60 text-amber hover:bg-amber/10";

  const text =
    status === "copied"
      ? "✓ COPIED"
      : status === "failed"
        ? "× CLIPBOARD BLOCKED"
        : `▸ ${label}`;

  return (
    <button
      onClick={copy}
      className={`border ${cls} px-3 py-2 transition-colors font-mono text-[12px] uppercase tracking-wider`}
      data-testid="copy-link-button"
    >
      {text}
    </button>
  );
}
