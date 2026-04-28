import Link from "next/link";
import { getPublicCredits } from "@/lib/hall-of-fame/queries";
import { OperativeName } from "@/components/operatives/OperativeName";
import { DISCORD_INVITE_URL } from "@/lib/links";

export const dynamic = "force-dynamic";

const SEVERITY_STYLE: Record<string, { label: string; className: string }> = {
  critical: { label: "CRITICAL", className: "text-red-400 border-red-400/40" },
  high: { label: "HIGH", className: "text-orange-400 border-orange-400/40" },
  medium: { label: "MEDIUM", className: "text-amber border-amber/40" },
  low: { label: "LOW", className: "text-green-400 border-green-400/40" },
};

function prUrl(prRef: string): string {
  // Format: "phantom#32" | "platform#36" | "ghost#13"
  const m = prRef.match(/^(phantom|platform|ghost)#(\d+)$/);
  if (!m) return "#";
  const [, repo, num] = m;
  const suffix = repo === "platform" ? "breachlab-platform" : `breachlab-${repo}`;
  return `https://github.com/atobones/${suffix}/pull/${num}`;
}

export default async function HallOfFamePage() {
  const credits = await getPublicCredits();

  return (
    <div className="space-y-8" data-testid="hall-of-fame-page">
      <header className="space-y-3">
        <h1 className="hof-name text-2xl">
          Hall of Fame
        </h1>
        <p className="text-sm text-muted max-w-2xl">
          White-hat contributors who reported real vulnerabilities in the
          BreachLab platform, wargame containers, or supporting infrastructure.
          Every credit here shipped a fix — names carry forward across the site
          in gold.
        </p>
        <a
          href={DISCORD_INVITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 border border-[#facc15]/40 text-[#facc15] px-3 py-1.5 text-xs hover:bg-[#facc15]/10 transition-colors"
        >
          Found a security issue? Report on Discord →
        </a>
      </header>

      {credits.length === 0 ? (
        <p className="text-sm text-muted">
          No confirmed reports yet. Be the first — ping{" "}
          <a
            href={DISCORD_INVITE_URL}
            className="text-amber hover:underline"
          >
            Discord
          </a>
          .
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {credits.map((c) => {
            const sev = SEVERITY_STYLE[c.severity] ?? SEVERITY_STYLE.medium;
            return (
              <article
                key={c.id}
                className="border border-[#facc15]/20 bg-black/20 p-4 space-y-2 transition-colors hover:border-[#facc15]/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <OperativeName
                      username={c.username}
                      isHallOfFame={c.isHallOfFame}
                      href={c.username ? `/u/${c.username}` : null}
                      className="truncate"
                      anonymousLabel={c.displayName}
                    />
                    {c.discordHandle && !c.username && (
                      <span className="text-xs text-muted">
                        @{c.discordHandle}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-mono border px-1.5 py-0.5 whitespace-nowrap ${sev.className}`}
                  >
                    {sev.label}
                  </span>
                </div>

                <h2 className="text-sm text-foreground">{c.findingTitle}</h2>

                {c.findingDescription && (
                  <p className="text-xs text-muted leading-relaxed">
                    {c.findingDescription}
                  </p>
                )}

                <div className="flex items-center gap-3 flex-wrap pt-1 text-[11px] text-muted font-mono">
                  {c.classRef && (
                    <span className="border border-muted/30 px-1.5 py-0.5">
                      {c.classRef}
                    </span>
                  )}
                  {c.prRef && (
                    <a
                      href={prUrl(c.prRef)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber hover:underline"
                    >
                      {c.prRef}
                    </a>
                  )}
                  <span className="text-[#facc15]">
                    +{c.securityScore} score
                  </span>
                  {c.externalLink && (
                    <a
                      href={c.externalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      profile ↗
                    </a>
                  )}
                  {c.awardedAt && (
                    <span>
                      {new Date(c.awardedAt).toISOString().slice(0, 10)}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <footer className="border-t border-border pt-4">
        <p className="text-xs text-muted">
          Credits are awarded manually after a fix lands. Responsible
          disclosure: DM an admin on Discord — do not post unfixed findings
          in public channels. Report-to-credit turnaround is usually the
          same day for confirmed reproducible bugs.
        </p>
        <p className="text-xs text-muted mt-2">
          Also see{" "}
          <Link href="/hall-of-operatives" className="text-amber hover:underline">
            Hall of Operatives
          </Link>{" "}
          for project sponsors.
        </p>
      </footer>
    </div>
  );
}
