import { getSuspiciousRuns } from "@/lib/speedrun/queries";
import { ReviewQueueTable } from "@/components/admin/ReviewQueueTable";

export const dynamic = "force-dynamic";

export default async function AdminReviewPage() {
  const runs = await getSuspiciousRuns();
  if (runs.length === 0) {
    return (
      <section className="space-y-2">
        <h2 className="text-lg text-amber">Suspicious runs</h2>
        <p className="text-xs text-muted">No suspicious runs awaiting review.</p>
      </section>
    );
  }
  return (
    <section className="space-y-3">
      <h2 className="text-lg text-amber">Suspicious runs ({runs.length})</h2>
      <ReviewQueueTable runs={runs} />
    </section>
  );
}
