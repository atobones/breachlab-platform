import { pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { users } from "@/lib/db/schema";

export const sponsors = pgTable("sponsors", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  source: text("source").notNull(), // "github_sponsors" | "liberapay" | "crypto"
  externalId: text("external_id"), // GH sponsor login, Liberapay username, null for crypto
  tierCode: text("tier_code").notNull(), // "recruit" | "operator" | "phantom" | "architect"
  amountCentsMonthly: integer("amount_cents_monthly").notNull().default(0),
  visibility: text("visibility").notNull().default("public"), // "public" | "username_only" | "anonymous" | "hidden"
  dedication: text("dedication"), // only for architect tier ($100+)
  claimToken: text("claim_token").unique(), // for crypto self-claim
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Sponsor = typeof sponsors.$inferSelect;
export type NewSponsor = typeof sponsors.$inferInsert;
