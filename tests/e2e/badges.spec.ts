import { test, expect } from "@playwright/test";
import postgres from "postgres";
import { createHash } from "node:crypto";

const DB_URL =
  process.env.DATABASE_URL ??
  "postgres://breachlab:breachlab@127.0.0.1:5432/breachlab";

const sql = postgres(DB_URL);

function sha256Hex(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

const FLAG_A = "FLAG{ghost_l0_badges_a}";
const FLAG_B = "FLAG{ghost_l1_badges_b}";

test.describe("badges", () => {
  test.beforeAll(async () => {
    await sql`TRUNCATE users, sessions, email_verifications, password_resets, submissions, badges, flags, levels, tracks CASCADE`;
    const [track] = await sql`
      INSERT INTO tracks (slug, name, description, status, order_idx)
      VALUES ('ghost', 'Ghost', 'e2e', 'live', 0)
      RETURNING id
    `;
    const [lvl0] = await sql`
      INSERT INTO levels (track_id, idx, title, points_base, points_first_blood_bonus)
      VALUES (${track.id}, 0, 'First Contact', 100, 50)
      RETURNING id
    `;
    const [lvl1] = await sql`
      INSERT INTO levels (track_id, idx, title, points_base, points_first_blood_bonus)
      VALUES (${track.id}, 1, 'Name Game', 120, 50)
      RETURNING id
    `;
    await sql`INSERT INTO flags (level_id, flag_hash) VALUES (${lvl0.id}, ${sha256Hex(FLAG_A)})`;
    await sql`INSERT INTO flags (level_id, flag_hash) VALUES (${lvl1.id}, ${sha256Hex(FLAG_B)})`;
  });

  test.afterAll(async () => {
    await sql`TRUNCATE users, sessions, email_verifications, password_resets, submissions, badges, flags, levels, tracks CASCADE`;
    await sql.end();
  });

  test("first blood writes badge and appears on first bloods page", async ({
    page,
  }) => {
    const username = `fb_op_${Date.now()}`;
    const email = `${username}@test.local`;
    const password = "verysecurepassword";

    await page.goto("/register");
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard$/);

    await page.goto("/submit");
    await page.fill('input[name="flag"]', FLAG_A);
    await page.click('button[type="submit"]');
    await expect(page.getByText(/Captured ghost level 0/)).toBeVisible();

    const [row] = await sql<{ kind: string }[]>`
      SELECT kind FROM badges b
      JOIN users u ON u.id = b.user_id
      WHERE u.username = ${username} AND b.kind = 'first_blood'
    `;
    expect(row?.kind).toBe("first_blood");

    await page.goto("/leaderboard/first-bloods");
    await expect(page.getByText(`@${username}`).first()).toBeVisible();
  });

  test("track complete awards track_complete when all levels solved", async ({
    page,
  }) => {
    const username = `tc_op_${Date.now()}`;
    const email = `${username}@test.local`;
    const password = "verysecurepassword";

    await page.goto("/register");
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard$/);

    await page.goto("/submit");
    await page.fill('input[name="flag"]', FLAG_A);
    await page.click('button[type="submit"]');
    await expect(page.getByText(/Captured/)).toBeVisible();

    await page.goto("/submit");
    await page.fill('input[name="flag"]', FLAG_B);
    await page.click('button[type="submit"]');
    await expect(page.getByText(/Captured/)).toBeVisible();

    const [row] = await sql<{ kind: string }[]>`
      SELECT kind FROM badges b
      JOIN users u ON u.id = b.user_id
      WHERE u.username = ${username} AND b.kind = 'track_complete'
    `;
    expect(row?.kind).toBe("track_complete");

    await page.goto("/dashboard");
    await expect(page.getByText("Track Complete")).toBeVisible();
  });
});
