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
        {publicLevels.map((l) => {
          const isActive = activeLevelIdx === l.idx;
          return (
            <li key={l.id}>
              <Link
                href={`/tracks/${track.slug}/${l.idx}`}
                className={isActive ? "text-amber" : "text-text"}
              >
                Level {l.idx} → Level {l.idx + 1}
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
