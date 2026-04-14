import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getGhostCertificate } from "@/lib/certificate/queries";
import { OperativeCertificate } from "@/components/certificate/OperativeCertificate";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `${username} · Ghost Operative Certificate · BreachLab`,
    description: `Verified BreachLab Ghost track graduate. Operative @${username}.`,
  };
}

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const cert = await getGhostCertificate(username);
  if (!cert) notFound();
  return (
    <div className="py-4">
      <OperativeCertificate cert={cert} />
      <div className="mt-6 text-center">
        <a
          href={`/u/${cert.username}`}
          className="text-xs text-muted hover:text-amber"
        >
          ← Back to profile
        </a>
      </div>
    </div>
  );
}
