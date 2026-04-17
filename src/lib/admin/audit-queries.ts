import { desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { adminAuditLog, type AdminAuditRow } from "@/lib/db/schema";

export async function getRecentAudit(limit: number = 200): Promise<AdminAuditRow[]> {
  return db
    .select()
    .from(adminAuditLog)
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(Math.min(limit, 500));
}
