import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { loadWriteup } from "@/lib/writeups";
import { userCompletedAllLevels } from "@/lib/writeup-access";

export const dynamic = "force-dynamic";

type Params = { track: string; level: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const p = await params;
  const writeup = await loadWriteup(p.track, Number(p.level)).catch(() => null);
  if (!writeup) return { title: "Writeup — BreachLab" };
  return {
    title: `${writeup.title} — BreachLab`,
    description: `${writeup.track} L${writeup.level} writeup, gated.`,
  };
}

export default async function WriteupPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const p = await params;
  const levelNum = Number(p.level);
  if (!Number.isFinite(levelNum)) notFound();

  const writeup = await loadWriteup(p.track, levelNum);
  if (!writeup) notFound();

  const { user } = await getCurrentSession();

  if (!user) {
    return (
      <article className="space-y-6 max-w-3xl">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted">
            {writeup.track} · L{writeup.level}
          </p>
          <h1 className="text-amber text-2xl phosphor">{writeup.title}</h1>
        </header>
        <section className="border border-amber/30 px-4 py-4 text-sm space-y-3">
          <p>
            Writeups are gated behind track progress to avoid becoming a
            search-engine cheat path.
          </p>
          <p>
            <Link
              href="/login"
              className="text-amber hover:underline"
            >
              Log in
            </Link>{" "}
            to verify you&apos;ve cleared the prerequisites for this level.
          </p>
        </section>
      </article>
    );
  }

  const allowed = await userCompletedAllLevels(
    user.id,
    writeup.track,
    writeup.prereqLevels,
  );

  if (!allowed) {
    const need = writeup.prereqLevels
      .map((l) => `${writeup.track} L${l}`)
      .join(", ");
    return (
      <article className="space-y-6 max-w-3xl">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted">
            {writeup.track} · L{writeup.level}
          </p>
          <h1 className="text-amber text-2xl phosphor">{writeup.title}</h1>
        </header>
        <section className="border border-amber/30 px-4 py-4 text-sm space-y-3">
          <p>Locked.</p>
          <p>
            This writeup unlocks once you&apos;ve cleared {need}. Until then
            we&apos;d rather you hit the wall than skim the answer — that&apos;s
            where the learning happens.
          </p>
          <p className="text-muted">
            <Link
              href={`/tracks/${writeup.track}`}
              className="text-amber hover:underline"
            >
              Back to {writeup.track}
            </Link>
          </p>
        </section>
      </article>
    );
  }

  return (
    <article className="space-y-6 max-w-3xl writeup-content">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted">
          {writeup.track} · L{writeup.level} · {writeup.difficulty} ·{" "}
          {writeup.estimatedTime}
        </p>
        <h1 className="text-amber text-2xl phosphor">{writeup.title}</h1>
        {writeup.prerequisites.length > 0 ? (
          <details className="text-xs text-muted">
            <summary className="cursor-pointer hover:text-amber">
              Background you should already have
            </summary>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {writeup.prerequisites.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </details>
        ) : null}
      </header>
      <div
        className="prose-writeup text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: writeup.html }}
      />
      <footer className="text-xs text-muted border-t border-border pt-3">
        Found a better approach or a bug in this walkthrough? Ping{" "}
        <code>#writeups</code> on Discord.
      </footer>
    </article>
  );
}
