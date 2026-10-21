import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";

test("reference-led homepage at all requested widths", async ({ page }) => {
  await mkdir("artifacts/premium", { recursive: true });
  for (const width of [320, 375, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page.locator(".premium-service")).toHaveCount(10);
    await expect(page.locator(".premium-price")).toHaveCount(3);
    await expect(page.locator(".premium-light").first()).toHaveCSS(
      "background-color",
      "rgb(248, 247, 244)",
    );
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      `overflow at ${width}`,
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/premium/home-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
  }
});
test("homepage accessibility and mobile navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("dialog", { name: "Navigation" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Navigation" })).toHaveCount(0);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
test("all homepage internal destinations respond and checkout fails closed", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const hrefs = await page
    .locator('a[href^="/"]')
    .evaluateAll((nodes) =>
      Array.from(new Set(nodes.map((n) => n.getAttribute("href")!))),
    );
  for (const href of hrefs)
    expect((await request.get(href)).status(), href).toBe(200);
  const response = await request.post("/api/checkout", {
    headers: { Origin: "http://localhost:8787" },
    data: {},
  });
  expect(response.status()).toBe(503);
  expect(await response.json()).toHaveProperty("error");
});
