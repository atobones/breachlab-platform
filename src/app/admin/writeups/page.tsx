import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { writeups as wTable, users as uTable } from "@/lib/db/schema";
import { AdminWriteupActions } from "@/components/admin/AdminWriteupActions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin: writeups queue — BreachLab" };

export default async function AdminWriteupsPage() {
  const { user } = await getCurrentSession();
  if (!user) redirect("/login");
  if (!user.isAdmin && !(user as any).isCurator) {
    redirect("/");
  }

  const pending = await db
    .select({
      id: wTable.id,
      title: wTable.title,
      brief: wTable.brief,
      externalUrl: wTable.externalUrl,
      trackSlug: wTable.trackSlug,
      levelIdx: wTable.levelIdx,
      submittedAt: wTable.submittedAt,
      authorUsername: uTable.username,
    })
    .from(wTable)
    .innerJoin(uTable, eq(wTable.authorId, uTable.id))
    .where(eq(wTable.status, "pending"));

  return (
    <article className="space-y-6 max-w-3xl">
      <h1 className="text-amber text-2xl phosphor">Pending writeups</h1>

      {pending.length === 0 ? (
        <p className="text-sm text-muted">Queue is empty.</p>
      ) : null}

      <ul className="space-y-4">
        {pending.map((w) => (
          <li key={w.id} className="border border-border px-4 py-3 space-y-2">
            <div className="text-sm">
              <span className="text-muted">{w.trackSlug} L{w.levelIdx}</span> ·{" "}
              <span className="text-amber">{w.title}</span> · by{" "}
              <span className="text-text">{w.authorUsername}</span>
            </div>
            <p className="text-xs text-muted">{w.brief}</p>
            <a
              href={w.externalUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-xs text-amber hover:underline"
            >
              {w.externalUrl}
            </a>
            <AdminWriteupActions id={w.id} />
          </li>
        ))}
      </ul>
    </article>
  );
}
