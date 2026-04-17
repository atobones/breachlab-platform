import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/session";
import { getUsersPaged } from "@/lib/admin/queries";
import { UserRowActions } from "@/components/admin/UserRowActions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return d.toISOString().slice(0, 19).replace("T", " ");
}

function relative(d: Date | null): string {
  if (!d) return "never";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { user: me } = await getCurrentSession();
  const params = await searchParams;
  const search = params.q?.trim() ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const { rows, total } = await getUsersPaged({
    search: search || undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <form className="flex gap-2 text-sm font-mono">
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder="search username or email…"
          className="flex-1 bg-transparent border border-amber/30 px-2 py-1 text-foreground placeholder:text-muted focus:outline-none focus:border-amber"
        />
        <button
          type="submit"
          className="px-3 py-1 border border-amber/30 text-amber hover:bg-amber/10"
        >
          search
        </button>
        {search ? (
          <Link
            href="/admin/users"
            className="px-3 py-1 border border-muted/30 text-muted hover:text-amber"
          >
            clear
          </Link>
        ) : null}
      </form>

      <div className="text-xs text-muted font-mono">
        {total.toLocaleString()} user{total === 1 ? "" : "s"}
        {search ? ` matching "${search}"` : ""} · page {page} / {totalPages}
      </div>

      <table className="w-full text-sm font-mono">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="py-1">Username</th>
            <th className="py-1">Email</th>
            <th className="py-1">Flags</th>
            <th className="py-1 text-right">Subs</th>
            <th className="py-1">Last seen</th>
            <th className="py-1">Joined</th>
            <th className="py-1">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-4 text-center text-muted">
                no users match
              </td>
            </tr>
          ) : (
            rows.map((u) => (
              <tr key={u.id} className="border-t border-amber/10 align-top">
                <td className="py-2 text-amber">{u.username}</td>
                <td className="py-2 text-xs">{u.email}</td>
                <td className="py-2 text-[11px] space-x-1">
                  {u.isAdmin ? <span className="text-amber">ADM</span> : null}
                  {u.totpEnabled ? (
                    <span className="text-green">2FA</span>
                  ) : null}
                  {u.emailVerified ? (
                    <span className="text-muted">✓</span>
                  ) : (
                    <span className="text-red-400">!</span>
                  )}
                  {u.isSupporter ? (
                    <span className="text-amber">$</span>
                  ) : null}
                </td>
                <td className="py-2 text-right">{u.submissionCount}</td>
                <td className="py-2 text-xs text-muted" title={fmtDate(u.lastSeenAt)}>
                  {relative(u.lastSeenAt)}
                </td>
                <td className="py-2 text-xs text-muted">
                  {fmtDate(u.createdAt).slice(0, 10)}
                </td>
                <td className="py-2">
                  <UserRowActions
                    userId={u.id}
                    username={u.username}
                    isAdmin={u.isAdmin}
                    totpEnabled={u.totpEnabled}
                    emailVerified={u.emailVerified}
                    isSelf={me?.id === u.id}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {totalPages > 1 ? (
        <div className="flex gap-2 text-xs font-mono">
          {page > 1 ? (
            <Link
              href={`/admin/users?${new URLSearchParams({
                ...(search ? { q: search } : {}),
                page: String(page - 1),
              }).toString()}`}
              className="px-2 py-1 border border-amber/30 text-amber hover:bg-amber/10"
            >
              ← prev
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link
              href={`/admin/users?${new URLSearchParams({
                ...(search ? { q: search } : {}),
                page: String(page + 1),
              }).toString()}`}
              className="px-2 py-1 border border-amber/30 text-amber hover:bg-amber/10"
            >
              next →
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
