import { expect, test } from "@playwright/test";

const seconds = Math.floor(Date.now() / 1000);
const snapshot = {
  rates: { USD: "1", PKR: "278.25", EUR: "0.9", GBP: "0.8", AED: "3.6725" },
  updatedAt: seconds - 60,
  nextUpdate: seconds + 86000,
  stale: false,
};

test("starting prices follow the selected display currency", async ({
  page,
}) => {
  await page.route("**/api/guest/rates", (route) =>
    route.fulfill({ json: snapshot }),
  );
  await page.goto("/");
  const cards = page.locator(".premium-pricing .package-price");
  await expect(cards.first()).toContainText("$499.00");
  await page
    .locator(".premium-pricing")
    .getByRole("combobox", { name: "Display currency", exact: true })
    .selectOption("PKR");
  await expect(cards.first()).toContainText(/PKR\s138,847/);
  await expect(cards.first()).toContainText("$499.00 · estimate");
  await page.goto("/services/ai-chatbot-development");
  await expect(page.locator(".service-price")).toContainText(/PKR\s556,222/);
});
