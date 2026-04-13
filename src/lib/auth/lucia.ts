import { Lucia } from "lucia";
import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { db } from "@/lib/db/client";
import { sessions, users } from "@/lib/db/schema";

const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    name: "breachlab_session",
    expires: false,
    attributes: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  },
  getUserAttributes: (attrs) => ({
    username: attrs.username,
    email: attrs.email,
    emailVerified: attrs.emailVerified,
    totpEnabled: attrs.totpSecret !== null,
    isAdmin: attrs.isAdmin,
  }),
});

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: {
      username: string;
      email: string;
      emailVerified: boolean;
      totpSecret: string | null;
      isAdmin: boolean;
    };
  }
}
