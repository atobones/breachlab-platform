"use client";

export function CertificateActions() {
  return (
    <div
      data-print-hide
      className="flex items-center justify-end gap-3 mb-4 max-w-3xl mx-auto"
    >
      <button
        type="button"
        onClick={() => window.print()}
        className="text-xs text-amber border border-amber/40 px-3 py-1.5 hover:bg-amber/10 tracking-wider"
        title="Opens the print dialog — choose 'Save as PDF' as the destination"
      >
        ↓ DOWNLOAD (PDF)
      </button>
    </div>
  );
}
