import Link from "next/link";

export function DonateButton() {
  return (
    <Link
      href="/donate"
      className="inline-block border border-amber text-amber px-3 py-1 hover:bg-amber hover:text-bg transition-colors uppercase tracking-wider text-sm"
    >
      [ Donate ]
    </Link>
  );
}
