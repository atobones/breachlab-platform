import { test, expect } from "@playwright/test";
import postgres from "postgres";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const DB_URL =
  process.env.DATABASE_URL ??
  "postgres://breachlab:breachlab@127.0.0.1:5432/breachlab";

const sql = postgres(DB_URL);

test.describe("phantom graduation", () => {
  test.beforeAll(async () => {
    await sql`TRUNCATE users, sessions, email_verifications, password_resets, submissions, flags, levels, tracks, speedrun_runs, badges, discord_oauth_states, donations CASCADE`;
    execSync("npm run seed:phantom", {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: DB_URL },
      stdio: "ignore",
    });
  });

  test.afterAll(async () => {
    await sql`TRUNCATE users, sessions, email_verifications, password_resets, submissions, flags, levels, tracks, speedrun_runs, badges, discord_oauth_states, donations CASCADE`;
    await sql.end();
  });

  test("user who solves all 20 public levels unlocks level 20 and gets phantom_master badge + certificate", async ({
    page,
  }) => {
    const username = `phantomop_${Date.now()}`;
    const email = `${username}@test.local`;
    const password = "verysecurepassword";

    await page.goto("/register");
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard$/);

    const [userRow] = await sql`SELECT id FROM users WHERE username=${username}`;
    const userId = userRow.id as string;

    const [track] = await sql`SELECT id FROM tracks WHERE slug='phantom'`;
    const trackId = track.id as string;

    const publicLevels = await sql`
      SELECT id, idx, points_base
      FROM levels
      WHERE track_id=${trackId} AND coalesce(description, '') NOT LIKE '[HIDDEN]%'
      ORDER BY idx ASC
    `;
    expect(publicLevels.length).toBe(20);

    for (const lvl of publicLevels) {
      await sql`
        INSERT INTO submissions (user_id, level_id, points_awarded)
        VALUES (${userId}, ${lvl.id}, ${lvl.points_base})
      `;
    }

    // Hidden level 20 should now be accessible
    const resp = await page.goto("/tracks/phantom/20");
    expect(resp?.status()).toBe(200);

    // Grab the latest phantom_l20 flag from the append-only seed file
    const flagsText = readFileSync(
      ".seed-flags.phantom.local.txt",
      "utf-8",
    );
    const matches = [...flagsText.matchAll(/^phantom_l20 = (FLAG\{[^}]+\})$/gm)];
    expect(matches.length).toBeGreaterThan(0);
    const flag20 = matches[matches.length - 1][1];

    // Submit the graduation flag
    await page.goto("/submit");
    await page.fill('input[name="flag"]', flag20);
    await page.click('button[type="submit"]');
    await expect(page.getByText(/Captured phantom level 20/)).toBeVisible();

    // Verify phantom_master badge row exists
    const badgeRows = await sql`
      SELECT kind FROM badges
      WHERE user_id=${userId} AND kind='phantom_master'
    `;
    expect(badgeRows.length).toBe(1);

    // Profile shows Phantom Operative pill + cert button
    await page.goto(`/u/${username}`);
    await expect(
      page
        .locator('[data-testid="profile-page"]')
        .getByText("Phantom Operative", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Phantom Operative Certificate/i }),
    ).toBeVisible();

    // Certificate page renders with crimson variant + PHNM serial
    await page.goto(`/u/${username}/certificate/phantom`);
    await expect(
      page.locator('[data-testid="phantom-certificate"]'),
    ).toBeVisible();
    await expect(
      page.getByText(/PHNM-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}/).first(),
    ).toBeVisible();
    await expect(page.getByText(/POST-EXPLOITATION CERTIFICATION/)).toBeVisible();

    // Honor roll shows the graduate
    await page.goto("/tracks/phantom/graduates");
    await expect(
      page.getByRole("table").getByRole("link", { name: `@${username}` }),
    ).toBeVisible();
  });

  test("/tracks/phantom/20 returns 404 for non-graduate", async ({ page }) => {
    const username = `phantomnovice_${Date.now()}`;
    const email = `${username}@test.local`;
    const password = "verysecurepassword";

    await page.goto("/register");
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard$/);

    const resp = await page.goto("/tracks/phantom/20");
    expect(resp?.status()).toBe(404);
  });

  test("/tracks/phantom page renders with tier table + SSH info", async ({
    page,
  }) => {
    await page.goto("/tracks/phantom");
    await expect(page.getByText(/Phantom — Post-Exploitation/)).toBeVisible();
    await expect(page.getByText(/ssh phantom0@phantom.breachlab/)).toBeVisible();
    await expect(page.getByText("RECRUIT", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("OPERATOR", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("PHANTOM", { exact: true }).first()).toBeVisible();
  });
});
