import { test, expect } from "@playwright/test";
import postgres from "postgres";

const DB_URL =
  process.env.DATABASE_URL ??
  "postgres://breachlab:breachlab@127.0.0.1:5432/breachlab";

const sql = postgres(DB_URL);

test.describe("auth", () => {
  test.afterAll(async () => {
    await sql`TRUNCATE users, sessions, email_verifications, password_resets CASCADE`;
    await sql.end();
  });

  test("register creates account and lands on dashboard", async ({ page }) => {
    const username = `op_${Date.now()}`;
    const email = `${username}@test.local`;
    const password = "verysecurepassword";

    await page.goto("/register");
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard$/);
    await expect(page.getByText(username).first()).toBeVisible();

    // Verify the email_verifications row was created
    const [row] = await sql`
      SELECT ev.id FROM email_verifications ev
      JOIN users u ON u.id = ev.user_id
      WHERE u.email = ${email}
    `;
    expect(row).toBeTruthy();
  });

  test("logout then login again (email pre-verified)", async ({ page }) => {
    const username = `op2_${Date.now()}`;
    const email = `${username}@test.local`;
    const password = "verysecurepassword";

    await page.goto("/register");
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard$/);

    // Mark as verified directly (email verification link is in console transport
    // — not recoverable here since token hash only)
    await sql`UPDATE users SET email_verified = true WHERE username = ${username}`;

    await page.goto("/dashboard/account");
    await page.click('button:has-text("Logout")');
    await page.waitForURL(/\/login$/);

    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard$/);
    await expect(page.getByText(username).first()).toBeVisible();
  });

  test("invalid credentials are rejected", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="username"]', "nobody_ever");
    await page.fill('input[name="password"]', "doesnotmatteratall");
    await page.click('button[type="submit"]');
    await expect(page.getByText(/Invalid credentials/)).toBeVisible();
  });
});
