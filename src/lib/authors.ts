import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export type AuthorView = {
  id: string | null; // null for synthetic curated author
  username: string;
  siteUrl: string | null;
  bio: string | null;
  isCurator: boolean;
};

const CURATED_AUTHOR: AuthorView = {
  id: null,
  username: "Ato",
  siteUrl: "https://breachlab.io",
  bio: "Founder",
  isCurator: true,
};

export function getCuratedAuthor(): AuthorView {
  return CURATED_AUTHOR;
}

export async function getAuthorByUsername(
  username: string,
): Promise<AuthorView | null> {
  const row = await db
    .select({
      id: users.id,
      username: users.username,
      siteUrl: users.siteUrl,
      bio: users.authorBio,
      isCurator: users.isCurator,
    })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (row.length === 0) return null;
  return row[0];
}
