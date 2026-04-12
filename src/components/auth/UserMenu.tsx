import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/session";

export async function UserMenu() {
  const { user } = await getCurrentSession();
  return (
    <section>
      <h2 className="text-muted text-sm uppercase mb-2">▸ Operative</h2>
      {user ? (
        <ul className="text-sm space-y-1">
          <li>
            <Link href="/dashboard">@{user.username}</Link>
          </li>
          <li>
            <Link href="/dashboard/account">Account</Link>
          </li>
        </ul>
      ) : (
        <ul className="text-sm space-y-1">
          <li>
            <Link href="/login">Login</Link>
          </li>
          <li>
            <Link href="/register">Register</Link>
          </li>
        </ul>
      )}
    </section>
  );
}
