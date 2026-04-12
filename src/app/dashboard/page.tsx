import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";

export default async function DashboardPage() {
  const { user } = await getCurrentSession();
  if (!user) redirect("/login");
  return (
    <div className="space-y-6">
      <h1 className="text-amber text-xl">Operative dashboard</h1>
      <p className="text-sm">
        Welcome, <span className="text-amber">{user.username}</span>.
      </p>
      {!user.emailVerified && (
        <p className="text-red text-xs">
          Email not verified. Check your inbox for the verification link.
        </p>
      )}
      <ul className="text-sm space-y-2">
        <li>
          <a href="/dashboard/account">Account settings</a>
        </li>
        <li>
          <a href="/dashboard/2fa">
            Two-factor authentication{" "}
            <span className={user.totpEnabled ? "text-green" : "text-muted"}>
              ({user.totpEnabled ? "enabled" : "disabled"})
            </span>
          </a>
        </li>
      </ul>
      <p className="text-muted text-xs">
        Tracks, submissions, badges, and leaderboard arrive in Plan 03+.
      </p>
    </div>
  );
}
