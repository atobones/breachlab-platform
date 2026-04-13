import { notFound } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getCurrentSession();
  if (!user || !user.isAdmin || !user.totpEnabled) {
    notFound();
  }
  return (
    <div className="space-y-6">
      <header className="border-b border-amber/30 pb-3">
        <h1 className="text-amber text-xl">Admin</h1>
        <p className="text-xs text-muted">Review queue &middot; signed in as {user.username}</p>
      </header>
      {children}
    </div>
  );
}
