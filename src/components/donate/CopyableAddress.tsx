"use client";

import { useState } from "react";

export function CopyableAddress({
  label,
  address,
}: {
  label: string;
  address: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard API blocked — the user can still select & copy manually */
    }
  }

  return (
    <div className="space-y-2 max-w-xl">
      <p className="text-xs text-amber uppercase tracking-wider">{label}</p>
      <div className="flex items-center gap-2 border border-amber/40 p-3">
        <code className="text-amber text-xs break-all flex-1 select-all">
          {address}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 border border-amber/40 hover:border-amber hover:bg-amber/10 px-2 py-1 text-[11px] text-amber transition-colors"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
