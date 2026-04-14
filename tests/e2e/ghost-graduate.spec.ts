import { test, expect } from "@playwright/test";
import postgres from "postgres";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const DB_URL =
  process.env.DATABASE_URL ??
  "postgres://breachlab:breachlab@127.0.0.1:5432/breachlab";

const sql = postgres(DB_URL);

test.describe("ghost graduation", () => {
  test.beforeAll(async () => {
    await sql`TRUNCATE users, sessions, email_verifications, password_resets, submissions, flags, levels, tracks, speedrun_runs, badges, discord_oauth_states, donations CASCADE`;
    // Re-seed via the project's seed script so all 23 levels + flags are
    // present and the plaintext flag file is up to date.
    execSync("npm run seed:ghost", {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: DB_URL },
      stdio: "ignore",
    });
  });

  test.afterAll(async () => {
    await sql`TRUNCATE users, sessions, email_verifications, password_resets, submissions, flags, levels, tracks, speedrun_runs, badges, discord_oauth_states, donations CASCADE`;
    await sql.end();
  });

  test("user who solves all 22 public levels unlocks level 22 and gets ghost_graduate badge", async ({
    page,
  }) => {
    const username = `grad_${Date.now()}`;
    const email = `${username}@test.local`;
    const password = "verysecurepassword";

    await page.goto("/register");
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard$/);

    // Fetch userId
    const [userRow] = await sql`SELECT id FROM users WHERE username=${username}`;
    const userId = userRow.id as string;

    // Fetch ghost track + public levels (idx 0..21)
    const [track] = await sql`SELECT id FROM tracks WHERE slug='ghost'`;
    const trackId = track.id as string;
    const publicLevels = await sql`
      SELECT id, idx, points_base
      FROM levels
      WHERE track_id=${trackId} AND coalesce(description, '') NOT LIKE '[HIDDEN]%'
      ORDER BY idx ASC
    `;
    expect(publicLevels.length).toBe(22);

    // Insert submissions for idx 0..21 directly (skip the level UI flows)
    for (const lvl of publicLevels) {
      await sql`
        INSERT INTO submissions (user_id, level_id, points_awarded)
        VALUES (${userId}, ${lvl.id}, ${lvl.points_base})
      `;
    }

    // Confirm hidden level now accessible
    const resp = await page.goto("/tracks/ghost/22");
    expect(resp?.status()).toBe(200);

    // Grab the level 22 flag from the seed plaintext file
    const flagsText = readFileSync(
      ".seed-flags.ghost.local.txt",
      "utf-8",
    );
    // The seed script appends to the plaintext file, so take the LAST
    // ghost_l22 line — that's the fresh one from this test's beforeAll seed.
    const matches = [...flagsText.matchAll(/^ghost_l22 = (FLAG\{[^}]+\})$/gm)];
    expect(matches.length).toBeGreaterThan(0);
    const flag22 = matches[matches.length - 1][1];

    // Submit level 22 flag via UI
    await page.goto("/submit");
    await page.fill('input[name="flag"]', flag22);
    await page.click('button[type="submit"]');
    await expect(page.getByText(/Captured ghost level 22/)).toBeVisible();

    // Verify ghost_graduate badge row exists
    const badgeRows = await sql`
      SELECT kind FROM badges
      WHERE user_id=${userId} AND kind='ghost_graduate'
    `;
    expect(badgeRows.length).toBe(1);

    // Visit public profile — Ghost Graduate pill visible + certificate link
    await page.goto(`/u/${username}`);
    await expect(
      page
        .locator('[data-testid="profile-page"]')
        .getByText("Ghost Graduate", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /View Operative Certificate/i }),
    ).toBeVisible();

    // Certificate page renders with serial + operative name
    await page.getByRole("link", { name: /View Operative Certificate/i }).click();
    await expect(
      page.locator('[data-testid="operative-certificate"]'),
    ).toBeVisible();
    await expect(page.getByText(`@${username}`).first()).toBeVisible();
    await expect(
      page.getByText(/GHST-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}/).first(),
    ).toBeVisible();
    await expect(page.getByText(/OPERATIVE CERTIFICATION/)).toBeVisible();
  });

  test("/u/:username/certificate returns 404 for non-graduate", async ({ page }) => {
    const username = `novice_${Date.now()}`;
    const email = `${username}@test.local`;
    const password = "verysecurepassword";

    await page.goto("/register");
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard$/);

    const resp = await page.goto(`/u/${username}/certificate`);
    expect(resp?.status()).toBe(404);
  });
});
