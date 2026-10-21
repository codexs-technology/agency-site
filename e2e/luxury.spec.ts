import { test, expect } from "@playwright/test";

test("premium reference composition and self-hosted fonts", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("Engineering");
  await expect(page.locator("h1")).toContainText("Intelligent Digital");
  await expect(page.locator(".premium-hero")).toHaveCount(1);
  await expect(page.locator(".premium-light")).toHaveCount(2);
  await expect(page.locator(".premium-service")).toHaveCount(10);
  await expect(page.locator(".premium-price")).toHaveCount(3);
  expect(
    await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
  ).toBe("rgb(9, 12, 16)");
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() => document.fonts.check('16px "Space Grotesk"')),
  ).toBe(true);
  for (const width of [320, 375, 768, 1440, 2560]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
