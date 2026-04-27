import { notFound } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { LiveGlobe } from "@/components/live/LiveGlobe";

export const metadata = {
  title: "Live — BreachLab",
  description:
    "Real-time globe of operative submissions across the BreachLab tracks.",
};

export default async function LivePage() {
  const { user } = await getCurrentSession();
  // Admin-only while in development. 404 (not 403) so the route's
  // existence is not disclosed to the wrong account.
  if (!user || !user.isAdmin) notFound();

  return (
    <div className="space-y-3 max-w-[1600px]">
      <div>
        <h1 className="text-amber text-xl font-mono">Live operations</h1>
        <p className="text-xs text-muted font-mono">
          Real-time submissions across every track. City-level geo only —
          no precise coordinates, no IP. Pins fade after a few seconds.
        </p>
      </div>
      <LiveGlobe />
    </div>
  );
}
