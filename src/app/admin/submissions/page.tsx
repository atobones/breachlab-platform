import Link from "next/link";
import { getRecentSubmissions } from "@/lib/admin/queries";
import { OperativeName } from "@/components/operatives/OperativeName";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string; page?: string }>;
}) {
  const params = await searchParams;
  const userId = params.user?.trim() || undefined;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const rows = await getRecentSubmissions({
    userId,
    limit: PAGE_SIZE + 1, // peek for next page
    offset: (page - 1) * PAGE_SIZE,
  });
  const hasMore = rows.length > PAGE_SIZE;
  const visible = rows.slice(0, PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted font-mono flex items-center gap-3">
        {userId ? (
          <>
            <span>
              filtered by user{" "}
              <span className="text-amber">{userId.slice(0, 8)}</span>
            </span>
            <Link
              href="/admin/submissions"
              className="underline hover:text-amber"
            >
              clear
            </Link>
          </>
        ) : (
          <span>last {PAGE_SIZE * page} submissions (newest first)</span>
        )}
      </div>

      <table className="w-full text-sm font-mono tabular-nums">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="py-1">When</th>
            <th className="py-1">Operative</th>
            <th className="py-1">Level</th>
            <th className="py-1 text-right">Points</th>
            <th className="py-1">Source IP</th>
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-4 text-center text-muted">
                no submissions
              </td>
            </tr>
          ) : (
            visible.map((s) => (
              <tr key={s.id} className="border-t border-amber/10">
                <td className="py-2 text-xs text-muted">
                  {s.submittedAt.toISOString().slice(0, 19).replace("T", " ")}
                </td>
                <td className="py-2">
                  <OperativeName
                    username={s.username}
                    isHallOfFame={s.isHallOfFame}
                    href={`/admin/submissions?user=${s.userId}`}
                  />
                </td>
                <td className="py-2">
                  <span className="text-muted">{s.trackSlug}</span> · L
                  {s.levelIdx}{" "}
                  <span className="text-xs text-muted">{s.levelTitle}</span>
                </td>
                <td className="py-2 text-right text-amber">
                  {s.pointsAwarded}
                </td>
                <td className="py-2 text-xs text-muted">
                  {s.sourceIp ?? "—"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="flex gap-2 text-xs font-mono">
        {page > 1 ? (
          <Link
            href={`/admin/submissions?${new URLSearchParams({
              ...(userId ? { user: userId } : {}),
              page: String(page - 1),
            }).toString()}`}
            className="px-2 py-1 border border-amber/30 text-amber hover:bg-amber/10"
          >
            ← prev
          </Link>
        ) : null}
        {hasMore ? (
          <Link
            href={`/admin/submissions?${new URLSearchParams({
              ...(userId ? { user: userId } : {}),
              page: String(page + 1),
            }).toString()}`}
            className="px-2 py-1 border border-amber/30 text-amber hover:bg-amber/10"
          >
            next →
          </Link>
        ) : null}
      </div>
    </div>
  );
}
