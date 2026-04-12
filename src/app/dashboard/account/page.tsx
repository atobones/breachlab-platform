import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { logoutAction } from "@/app/login/actions";

export default async function AccountPage() {
  const { user } = await getCurrentSession();
  if (!user) redirect("/login");
  return (
    <div className="space-y-4 max-w-md">
      <h1 className="text-amber text-xl">Account</h1>
      <dl className="text-sm space-y-1">
        <div>
          <dt className="text-muted inline">Username: </dt>
          <dd className="inline">{user.username}</dd>
        </div>
        <div>
          <dt className="text-muted inline">Email: </dt>
          <dd className="inline">{user.email}</dd>
        </div>
        <div>
          <dt className="text-muted inline">Email verified: </dt>
          <dd className={`inline ${user.emailVerified ? "text-green" : "text-red"}`}>
            {user.emailVerified ? "yes" : "no"}
          </dd>
        </div>
      </dl>
      <form action={logoutAction}>
        <button
          type="submit"
          className="border border-red text-red px-4 py-2 hover:bg-red hover:text-bg"
        >
          [ Logout ]
        </button>
      </form>
    </div>
  );
}
