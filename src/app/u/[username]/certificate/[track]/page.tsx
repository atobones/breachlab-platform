import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTrackCertificate } from "@/lib/certificate/queries";
import { OperativeCertificate } from "@/components/certificate/OperativeCertificate";
import { PhantomCertificate } from "@/components/certificate/PhantomCertificate";

export const dynamic = "force-dynamic";

const SUPPORTED_TRACKS = new Set(["ghost", "phantom"]);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; track: string }>;
}): Promise<Metadata> {
  const { username, track } = await params;
  const trackLabel = track.charAt(0).toUpperCase() + track.slice(1);
  return {
    title: `${username} · ${trackLabel} Operative Certificate · BreachLab`,
    description: `Verified BreachLab ${trackLabel} track graduate. Operative @${username}.`,
  };
}

export default async function TrackCertificatePage({
  params,
}: {
  params: Promise<{ username: string; track: string }>;
}) {
  const { username, track } = await params;
  if (!SUPPORTED_TRACKS.has(track)) notFound();

  const cert = await getTrackCertificate(username, track);
  if (!cert) notFound();

  return (
    <div className="py-4">
      {track === "phantom" ? (
        <PhantomCertificate cert={cert} />
      ) : (
        <OperativeCertificate cert={cert} />
      )}
      <div className="mt-6 text-center">
        <Link
          href={`/u/${cert.username}`}
          className="text-xs text-muted hover:text-amber"
        >
          ← Back to profile
        </Link>
      </div>
    </div>
  );
}
