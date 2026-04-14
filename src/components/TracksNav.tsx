import Link from "next/link";

type TrackStatus = "LIVE" | "SOON" | "PLANNED";
type Track = { slug: string; name: string; status: TrackStatus };

const TRACKS: Track[] = [
  { slug: "ghost", name: "Ghost", status: "LIVE" },
  { slug: "phantom", name: "Phantom", status: "LIVE" },
  { slug: "specter", name: "Specter", status: "SOON" },
  { slug: "cipher", name: "Cipher", status: "PLANNED" },
  { slug: "mirage", name: "Mirage", status: "PLANNED" },
  { slug: "nexus", name: "Nexus", status: "PLANNED" },
  { slug: "oracle", name: "Oracle", status: "PLANNED" },
];

const STATUS_COLOR: Record<TrackStatus, string> = {
  LIVE: "text-green",
  SOON: "text-amber",
  PLANNED: "text-muted",
};

export function TracksNav() {
  return (
    <nav aria-label="Tracks">
      <h2 className="text-muted text-sm uppercase mb-2">▸ Tracks</h2>
      <ul className="space-y-1 text-sm">
        {TRACKS.map((t) => (
          <li key={t.slug} className="flex justify-between">
            <Link href={`/tracks/${t.slug}`}>{t.name}</Link>
            <span className={STATUS_COLOR[t.status]}>{t.status}</span>
          </li>
        ))}
      </ul>
    </nav>
  );
}
