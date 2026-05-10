"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { TrackWithLevels } from "@/lib/tracks/all";

export function TrackLevelsNav({
  tracksData,
}: {
  tracksData: TrackWithLevels[];
}) {
  const pathname = usePathname() ?? "";
  const match = pathname.match(/^\/tracks\/([^/]+)(?:\/(\d+))?/);
  if (!match) return null;
  const slug = match[1];
  const activeLevelIdx = match[2] ? Number(match[2]) : null;
  const track = tracksData.find((t) => t.slug === slug);
  if (!track || track.levels.length === 0) return null;

  const onTrackIndex = activeLevelIdx === null;
  const publicLevels = track.levels.filter((l) => !l.hidden);
  const hiddenLevels = track.levels.filter((l) => l.hidden);

  return (
    <section>
      <h2 className="text-muted text-sm uppercase mb-2">▸ {track.name}</h2>
      <ul className="text-xs space-y-1">
        <li>
          <Link
            href={`/tracks/${track.slug}`}
            className={onTrackIndex ? "text-amber" : "text-text"}
          >
            {track.name}
          </Link>
        </li>
        {publicLevels.map((l, i) => {
          const isActive = activeLevelIdx === l.idx;
          // Phantom L9 is currently moved to phantom-deep ephemeral as
          // an OPTIONAL side quest (mono chain skips it). Dim the entry
          // so players see it isn't part of the linear path right now.
          // Drop this conditional once L9 returns to the canonical chain.
          const isOptionalSideQuest = track.slug === "phantom" && l.idx === 9;
          // Last public level: don't render "→ Level (idx+1)" because the
          // next index is either a hidden graduation chain (specter L13 →
          // L14 secret) or the graduation page itself. Either way the
          // arrow leaks the existence of a next level we don't list.
          const isLastPublic = i === publicLevels.length - 1;
          let cls = "text-text";
          if (isActive) cls = "text-amber";
          else if (isOptionalSideQuest) cls = "text-muted italic opacity-50";
          return (
            <li key={l.id}>
              <Link href={`/tracks/${track.slug}/${l.idx}`} className={cls}>
                {isLastPublic
                  ? `Level ${l.idx}`
                  : `Level ${l.idx} → Level ${l.idx + 1}`}
                {isOptionalSideQuest ? " (optional)" : ""}
              </Link>
            </li>
          );
        })}
        {track.bonusUnlocked &&
          hiddenLevels.map((l) => {
            const isActive = activeLevelIdx === l.idx;
            return (
              <li key={l.id} className="pt-1 border-t border-border/40 mt-1">
                <Link
                  href={`/tracks/${track.slug}/${l.idx}`}
                  className={isActive ? "text-amber" : "text-red"}
                >
                  Level {l.idx} → ??? [CLASSIFIED]
                </Link>
              </li>
            );
          })}
      </ul>
    </section>
  );
}
