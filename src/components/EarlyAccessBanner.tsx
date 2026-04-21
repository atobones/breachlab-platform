import Link from "next/link";

export function EarlyAccessBanner() {
  return (
    <div className="border-b border-amber/40 bg-amber/5 px-4 py-1.5 text-[11px] uppercase tracking-wider text-amber font-mono flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="font-bold">[ EARLY ACCESS ]</span>
      <span className="text-text/70 normal-case tracking-normal">
        Tracks are live but still hardening — flags can rotate, points can be
        recomputed after integrity audits, levels can be patched.
      </span>
      <Link href="/rules" className="text-amber hover:underline normal-case tracking-normal">
        Rules →
      </Link>
    </div>
  );
}
