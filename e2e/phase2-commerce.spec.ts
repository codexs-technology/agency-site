import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { services } from "../src/shared/content";

test("all eighteen service scopes expose honest pricing and responsive quote actions", async ({
  page,
}) => {
  for (const service of services) {
    const response = await page.goto(`/services/${service.slug}`);
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: "Scope, pricing and delivery" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add to quote cart" }),
    ).toBeVisible();
    await expect(page.getByText(/Delivery estimate:/)).toBeVisible();
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
  const scan = await new AxeBuilder({ page }).include("#main").analyze();
  expect(scan.violations).toEqual([]);
});

test("selected currency survives service, cart and checkout navigation without false payment", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("combobox", { name: "Display currency", exact: true })
    .first()
    .selectOption("AED");
  await page.goto("/services/seo");
  await expect(
    page
      .getByRole("combobox", { name: "Display currency", exact: true })
      .first(),
  ).toHaveValue("AED");
  await page.getByRole("button", { name: "Add to quote cart" }).click();
  await expect(
    page
      .getByRole("combobox", { name: "Display currency", exact: true })
      .first(),
  ).toHaveValue("AED");
  await page.getByRole("link", { name: "Continue as guest" }).click();
  await expect(
    page
      .getByRole("combobox", { name: "Display currency", exact: true })
      .first(),
  ).toHaveValue("AED");
  await expect(page.getByText(/settlement currency/).first()).toBeVisible();
});
