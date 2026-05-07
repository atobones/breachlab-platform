import { OpsBroadcastForm } from "@/components/admin/OpsBroadcastForm";
import { db } from "@/lib/db/client";
import { eq, and, isNotNull } from "drizzle-orm";
import { users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminOpsBroadcastPage() {
  const verified = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.emailVerified, true), isNotNull(users.email)));
  const total = verified.length;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="border border-amber/30 bg-amber/5 p-3 text-xs font-mono text-amber">
        <div className="font-bold uppercase tracking-wider mb-1">[ heads-up ]</div>
        <ul className="space-y-1 list-disc pl-4 text-text/80 normal-case tracking-normal">
          <li>
            Sends a plain-text email to every email-verified user — currently{" "}
            <span className="text-amber">{total}</span> recipient
            {total === 1 ? "" : "s"}.
          </li>
          <li>
            For incident notices only (host-key rotation, downtime, breaking
            level changes). Not for marketing.
          </li>
          <li>
            Audited under <code>ops.broadcast</code> in admin_audit_log with
            actor + sent/failed totals.
          </li>
          <li>
            The on-site banner is separate — set{" "}
            <code>OPS_ALERT_TITLE</code> + <code>OPS_ALERT_MESSAGE</code> env
            vars in Vercel and redeploy. Empty values = no banner.
          </li>
        </ul>
      </div>
      <OpsBroadcastForm recipientCount={total} />
    </div>
  );
}
