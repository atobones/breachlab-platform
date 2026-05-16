import { redirect } from "next/navigation";
import { count, eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { tracks as tracksTable, levels as levelsTable } from "@/lib/db/schema";
import { WriteupSubmitForm } from "@/components/writeups/WriteupSubmitForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Submit a writeup — BreachLab" };

export default async function SubmitPage() {
  const { user } = await getCurrentSession();
  if (!user) redirect("/login?next=/writeups/submit");

  const allTracks = await db
    .select({ id: tracksTable.id, slug: tracksTable.slug, name: tracksTable.name })
    .from(tracksTable);

  const levelCounts = await Promise.all(
    allTracks.map(async (t) => {
      const [{ c }] = await db
        .select({ c: count() })
        .from(levelsTable)
        .where(eq(levelsTable.trackId, t.id));
      return { slug: t.slug, name: t.name, levelCount: Number(c) };
    }),
  );

  return (
    <article className="space-y-6 max-w-3xl">
      <header className="space-y-2">
        <h1 className="text-amber text-2xl phosphor">Submit a writeup</h1>
        <p className="text-sm text-muted leading-relaxed">
          One submission per level per author. Submissions are reviewed by
          Boss before going live. Use your own external page (blog, GitHub
          pages, MkDocs site) as the canonical source — we link there with
          full attribution.
        </p>
      </header>
      <WriteupSubmitForm tracks={levelCounts} />
    </article>
  );
}
