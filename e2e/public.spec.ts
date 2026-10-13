import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { pages, services } from "../src/shared/content";

test("public pages render real HTML and no broken images", async ({ page }) => {
  for (const path of [
    ...Object.keys(pages).filter((p) => p !== "/404"),
    ...services.map((s) => `/services/${s.slug}`),
  ]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
    await page.locator("img").evaluateAll(async (images) => {
      await Promise.all(
        images.map(async (image) => {
          const img = image as HTMLImageElement;
          img.loading = "eager";
          try {
            await img.decode();
          } catch {
            /* Failed decoding is asserted below. */
          }
        }),
      );
    });
    const broken = await page
      .locator("img")
      .evaluateAll((images) =>
        images
          .filter(
            (image) =>
              !(image as HTMLImageElement).complete ||
              (image as HTMLImageElement).naturalWidth === 0,
          )
          .map((image) => image.getAttribute("src")),
      );
    expect(broken, path).toEqual([]);
  }
});
test("home accessibility and mobile navigation", async ({ page }) => {
  await page.goto("/");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  for (const width of [320, 375, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    if (width < 950) {
      await page.getByRole("button", { name: "Open navigation" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
  }
});
test("unknown route returns 404 and APIs do not serve HTML", async ({
  request,
}) => {
  expect((await request.get("/does-not-exist")).status()).toBe(404);
  const response = await request.get("/api/does-not-exist");
  expect(response.status()).toBe(404);
  expect(response.headers()["content-type"]).toContain("application/json");
});
test("contact errors do not produce false success", async ({ page }) => {
  await page.goto("/contact");
  await page.getByRole("button", { name: "Send Project Inquiry" }).click();
  await expect(page.getByText("Choose a service.")).toBeVisible();
  await expect(page.getByText("Inquiry saved.")).toHaveCount(0);
});
test("portfolio filters and blog details work", async ({ page }) => {
  await page.goto("/portfolio");
  await page.getByRole("button", { name: "Mobile", exact: true }).click();
  await expect(page.locator(".project-card")).toHaveCount(1);
  await page.goto("/blog");
  await page.locator(".project-card").first().click();
  await expect(page.locator("article")).toBeVisible();
});
