"use client";

import { useState } from "react";

type Props = {
  isOwner: boolean;
  username: string;
  track: string;
  serial: string;
};

export function CertificateActions({
  isOwner,
  username,
  track,
  serial,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cert is publicly viewable so recruiters can verify, but only the
  // holder needs the download — they're the one putting it on LinkedIn.
  if (!isOwner) return null;

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const el =
        document.querySelector('[data-testid="phantom-certificate"]') ??
        document.querySelector('[data-testid="operative-certificate"]');
      if (!(el instanceof HTMLElement)) {
        throw new Error("certificate element not found");
      }
      // Lazy-loaded so the 30 KB lib only ships when this button is used.
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(el, {
        backgroundColor: "#0a0a0a",
        pixelRatio: 2,
        cacheBust: true,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `breachlab-${track}-${username}-${serial}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error("[certificate] download failed", err);
      setError("Could not generate the image. Try again, or screenshot.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      data-print-hide
      className="flex items-center justify-end gap-3 mb-4 max-w-3xl mx-auto"
    >
      {error && <span className="text-red text-xs">{error}</span>}
      <button
        type="button"
        onClick={download}
        disabled={busy}
        className="text-xs text-amber border border-amber/40 px-3 py-1.5 hover:bg-amber/10 tracking-wider disabled:opacity-60"
      >
        {busy ? "GENERATING…" : "↓ DOWNLOAD (PNG)"}
      </button>
    </div>
  );
}
