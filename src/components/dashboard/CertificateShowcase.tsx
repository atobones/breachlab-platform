import Link from "next/link";
import type { EarnedCertificate } from "@/lib/dashboard/certificates";
import { operativeSerial } from "@/lib/certificate/serial";

type TrackTier = "active" | "soon";

type TrackMeta = {
  slug: string;
  name: string;
  tier: TrackTier;
  operativeName?: string;
  badgeKind?: "ghost_graduate" | "phantom_master";
  serialPrefix?: string;
  color?: "amber" | "red";
  description: string;
};

const TRACKS: TrackMeta[] = [
  {
    slug: "ghost",
    name: "Ghost",
    tier: "active",
    operativeName: "Ghost Operative",
    badgeKind: "ghost_graduate",
    serialPrefix: "GHST",
    color: "amber",
    description: "Linux & shell fundamentals",
  },
  {
    slug: "phantom",
    name: "Phantom",
    tier: "active",
    operativeName: "Phantom Operative",
    badgeKind: "phantom_master",
    serialPrefix: "PHNM",
    color: "red",
    description: "Post-exploitation & container escape",
  },
  {
    slug: "specter",
    name: "Specter",
    tier: "soon",
    description: "Web application security",
  },
  {
    slug: "cipher",
    name: "Cipher",
    tier: "soon",
    description: "Cryptography attacks",
  },
  {
    slug: "mirage",
    name: "Mirage",
    tier: "soon",
    description: "Cloud & infrastructure",
  },
  {
    slug: "nexus",
    name: "Nexus",
    tier: "soon",
    description: "CI/CD & supply chain",
  },
  {
    slug: "oracle",
    name: "Oracle",
    tier: "soon",
    description: "AI/LLM security",
  },
];

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function EarnedCard({
  meta,
  cert,
  userId,
  username,
}: {
  meta: TrackMeta;
  cert: EarnedCertificate;
  userId: string;
  username: string;
}) {
  const serial = operativeSerial(
    userId,
    cert.trackId,
    cert.awardedAt,
    meta.serialPrefix,
  );
  const colorClasses =
    meta.color === "red"
      ? "border-red text-red shadow-[0_0_16px_rgba(239,68,68,0.25)]"
      : "border-amber text-amber shadow-[0_0_16px_rgba(245,158,11,0.25)]";
  const hoverClasses =
    meta.color === "red" ? "hover:bg-red/5" : "hover:bg-amber/5";

  return (
    <article
      data-testid={`cert-card-earned-${meta.slug}`}
      className={`border-2 p-4 space-y-3 bg-bg font-mono transition-colors ${colorClasses} ${hoverClasses}`}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[9px] uppercase tracking-[0.3em] opacity-70">
          ★ Operative
        </span>
        <span className="text-[9px] opacity-70">CLASSIFIED</span>
      </div>
      <h3 className="text-lg font-bold uppercase tracking-wider leading-tight">
        {meta.operativeName}
      </h3>
      <dl className="space-y-1 text-[10px]">
        <div className="flex justify-between gap-2">
          <dt className="opacity-50">Serial</dt>
          <dd className="text-right break-all">{serial}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="opacity-50">Graduated</dt>
          <dd>{formatDate(cert.awardedAt)}</dd>
        </div>
      </dl>
      <Link
        href={`/u/${username}/certificate/${meta.slug}`}
        className={`inline-block px-3 py-1 text-[10px] uppercase tracking-widest border ${
          meta.color === "red"
            ? "border-red hover:bg-red hover:text-bg"
            : "border-amber hover:bg-amber hover:text-bg"
        }`}
      >
        View Certificate →
      </Link>
    </article>
  );
}

function LockedActiveCard({ meta }: { meta: TrackMeta }) {
  return (
    <article
      data-testid={`cert-card-locked-${meta.slug}`}
      className="border-2 border-dashed border-border p-4 space-y-3 opacity-60 font-mono"
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[9px] uppercase tracking-[0.3em] text-muted">
          ◌ Locked
        </span>
        <span className="text-[9px] text-muted">AVAILABLE</span>
      </div>
      <h3 className="text-lg text-muted uppercase tracking-wider leading-tight">
        {meta.name}
      </h3>
      <p className="text-[10px] text-muted">{meta.description}</p>
      <Link
        href={`/tracks/${meta.slug}`}
        className="inline-block px-3 py-1 text-[10px] uppercase tracking-widest border border-border text-muted hover:border-amber hover:text-amber"
      >
        Start Track →
      </Link>
    </article>
  );
}

function SoonCard({ meta }: { meta: TrackMeta }) {
  return (
    <article
      data-testid={`cert-card-soon-${meta.slug}`}
      className="border-2 border-dotted border-border/50 p-4 space-y-3 opacity-40 font-mono"
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[9px] uppercase tracking-[0.3em] text-muted">
          ⌇ Soon
        </span>
        <span className="text-[9px] text-muted">PLANNED</span>
      </div>
      <h3 className="text-lg text-muted uppercase tracking-wider leading-tight">
        {meta.name}
      </h3>
      <p className="text-[10px] text-muted">{meta.description}</p>
      <div className="text-[10px] text-muted italic">
        Coming to the BreachLab roadmap.
      </div>
    </article>
  );
}

export function CertificateShowcase({
  earned,
  userId,
  username,
}: {
  earned: EarnedCertificate[];
  userId: string;
  username: string;
}) {
  const bySlug = new Map(earned.map((e) => [e.trackSlug, e]));
  const earnedCount = earned.length;
  const activeCount = TRACKS.filter((t) => t.tier === "active").length;

  return (
    <section
      data-testid="operator-record"
      className="space-y-3"
      aria-label="Operator record"
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-amber text-sm uppercase tracking-widest">
          ▸ Operator Record
        </h2>
        <span className="text-[10px] text-muted font-mono">
          {earnedCount}/{activeCount} active tracks graduated
        </span>
      </div>

      {earnedCount === 0 ? (
        <div className="border border-amber/30 p-6 space-y-3">
          <p className="text-sm">
            You have no certifications yet. Every BreachLab graduate earns
            their first certificate by clearing the Ghost track.
          </p>
          <Link
            href="/tracks/ghost"
            className="inline-block px-4 py-2 border border-amber text-amber text-xs uppercase tracking-widest hover:bg-amber hover:text-bg"
          >
            Start Ghost Track →
          </Link>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TRACKS.map((meta) => {
          const cert = bySlug.get(meta.slug);
          if (cert && meta.tier === "active") {
            return (
              <EarnedCard
                key={meta.slug}
                meta={meta}
                cert={cert}
                userId={userId}
                username={username}
              />
            );
          }
          if (meta.tier === "active") {
            return <LockedActiveCard key={meta.slug} meta={meta} />;
          }
          return <SoonCard key={meta.slug} meta={meta} />;
        })}
      </div>
    </section>
  );
}
