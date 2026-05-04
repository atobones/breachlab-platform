import { test, expect } from "@playwright/test";

test.describe("donate landing page", () => {
  test("renders crypto and liberapay payment method cards", async ({ page }) => {
    await page.goto("/donate");
    await expect(page.locator('[data-testid="donate-page"]')).toBeVisible();
    await expect(page.getByText(/Support BreachLab/)).toBeVisible();
    await expect(
      page.locator('[data-testid="donate-card-crypto"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="donate-card-liberapay"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="donate-card-github"]'),
    ).toHaveCount(0);
  });

  test("crypto card links to /donate/crypto", async ({ page }) => {
    await page.goto("/donate");
    await page.locator('[data-testid="donate-card-crypto"]').click();
    await expect(page).toHaveURL(/\/donate\/crypto$/);
    await expect(
      page.locator('[data-testid="donate-crypto-page"]'),
    ).toBeVisible();
  });
});

test.describe("donate crypto sub-page", () => {
  test("renders form and not-configured notice", async ({ page }) => {
    await page.goto("/donate/crypto");
    await expect(
      page.locator('[data-testid="donate-crypto-page"]'),
    ).toBeVisible();
    await expect(page.getByText(/Pay with crypto/)).toBeVisible();
    // BTCPay is not configured in the test env
    await expect(page.getByText(/Donations are not active yet/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Donations not available/ }),
    ).toBeVisible();
  });

  test("preset buttons populate amount input", async ({ page }) => {
    await page.goto("/donate/crypto");
    await page.click('[data-testid="preset-25"]');
    await expect(page.locator('input[name="amount"]')).toHaveValue("25");
    await page.click('[data-testid="preset-100"]');
    await expect(page.locator('input[name="amount"]')).toHaveValue("100");
  });

  test("thanks flash renders after ?thanks=1", async ({ page }) => {
    await page.goto("/donate/crypto?thanks=1");
    await expect(page.locator('[data-testid="donate-flash"]')).toContainText(
      /Thank you/,
    );
  });
});

test.describe("donate github sponsors sub-page", () => {
  test("renders four monthly tier cards", async ({ page }) => {
    await page.goto("/donate/github-sponsors");
    await expect(
      page.locator('[data-testid="donate-github-sponsors-page"]'),
    ).toBeVisible();
    for (const code of ["recruit", "operator", "phantom", "architect"]) {
      await expect(
        page.locator(`[data-testid="tier-card-${code}"]`),
      ).toBeVisible();
    }
  });
});

test.describe("donate liberapay sub-page", () => {
  test("renders CTA linking to Liberapay", async ({ page }) => {
    await page.goto("/donate/liberapay");
    await expect(
      page.locator('[data-testid="donate-liberapay-page"]'),
    ).toBeVisible();
    const cta = page.locator('[data-testid="donate-liberapay-cta"]');
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute(
      "href",
      "https://liberapay.com/breachlab/donate",
    );
  });
});
