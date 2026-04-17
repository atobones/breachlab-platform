import { notFound } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { AdminNav } from "@/components/admin/AdminNav";

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
    <div className="space-y-5">
      <header className="flex items-baseline justify-between border-b border-amber/30 pb-3">
        <h1 className="text-amber text-xl font-mono">▸ Admin</h1>
        <p className="text-xs text-muted font-mono">
          signed in as <span className="text-amber">{user.username}</span>
        </p>
      </header>
      <AdminNav />
      <div>{children}</div>
    </div>
  );
}
