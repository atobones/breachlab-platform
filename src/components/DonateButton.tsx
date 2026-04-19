import Link from "next/link";

export function DonateButton() {
  return (
    <Link href="/donate" className="btn-bracket text-sm">
      Donate
    </Link>
  );
}
