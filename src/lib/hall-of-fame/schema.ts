import { pgTable, text, timestamp, uuid, integer, index } from "drizzle-orm/pg-core";
import { users } from "@/lib/db/schema";

export const securityCredits = pgTable(
  "security_credits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    displayName: text("display_name").notNull(),
    discordHandle: text("discord_handle"),
    externalLink: text("external_link"),
    findingTitle: text("finding_title").notNull(),
    findingDescription: text("finding_description"),
    classRef: text("class_ref"),
    severity: text("severity").notNull().default("medium"),
    prRef: text("pr_ref"),
    securityScore: integer("security_score").notNull().default(10),
    status: text("status").notNull().default("pending"),
    awardedAt: timestamp("awarded_at", { withTimezone: true }),
    awardedBy: uuid("awarded_by").references(() => users.id, { onDelete: "set null" }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("security_credits_status_idx").on(t.status),
    index("security_credits_user_id_idx").on(t.userId),
  ],
);

export type SecurityCredit = typeof securityCredits.$inferSelect;
export type NewSecurityCredit = typeof securityCredits.$inferInsert;

export const SEVERITY_LEVELS = ["critical", "high", "medium", "low"] as const;
export type Severity = (typeof SEVERITY_LEVELS)[number];

export const CREDIT_STATUSES = ["pending", "confirmed", "rejected"] as const;
export type CreditStatus = (typeof CREDIT_STATUSES)[number];

export const DEFAULT_SCORE_BY_SEVERITY: Record<Severity, number> = {
  critical: 30,
  high: 20,
  medium: 10,
  low: 5,
};
