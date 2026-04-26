import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set");
}

// application_name is reported to Postgres on connect and is captured by
// the security_writes_log trigger (drizzle/0011_security_writes_audit.sql).
// The out-of-band-writes detector flags any row whose application_name
// is not this exact value — that's the signal that someone wrote to a
// security-sensitive table from outside the platform process (psql,
// drizzle CLI, ad-hoc job, etc.).
const queryClient = postgres(url, {
  connection: { application_name: "breachlab-platform" },
});
export const db = drizzle(queryClient);
