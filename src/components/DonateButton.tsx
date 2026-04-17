import Link from "next/link";

export function DonateButton() {
  return (
    <Link
      href="/donate"
      className="inline-block border border-amber text-amber px-3 py-1 hover:bg-amber/10 hover:border-amber transition-colors uppercase tracking-wider text-sm no-underline"
    >
      [ Donate ]
    </Link>
  );
}
