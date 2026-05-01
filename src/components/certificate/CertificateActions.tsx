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
      // Lazy-loaded so the lib only ships when this button is used.
      // Switched from html-to-image to modern-screenshot 2026-05-01:
      // html-to-image 1.11.13 throws `TypeError: e.trim() ... e is undefined`
      // when computedStyle returns oklch() / CSS-var values it can't parse
      // (Tailwind 4's color stack hits this on Firefox). modern-screenshot
      // is an actively-maintained fork with a drop-in API surface and
      // robust handling of modern CSS. Reported by Randark 2026-05-01.
      const { domToPng } = await import("modern-screenshot");
      // Ensure web fonts finished loading before rasterization — if the
      // monospace font is still streaming when the lib clones the DOM, the
      // PNG falls back to a different glyph metric and the ASCII logo
      // breaks. defstrong reported this 2026-04-23.
      if (typeof document !== "undefined" && "fonts" in document) {
        try {
          await document.fonts.ready;
        } catch {
          /* non-fatal — continue with whatever fonts resolved */
        }
      }
      const dataUrl = await domToPng(el, {
        backgroundColor: "#0a0a0a",
        scale: 2,
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
