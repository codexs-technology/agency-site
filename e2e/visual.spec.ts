import { test, expect } from "@playwright/test";
import { mkdir, copyFile } from "node:fs/promises";

test("capture desktop and mobile layouts without console errors", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  await mkdir("artifacts/luxury", { recursive: true });
  page.on("pageerror", (error) => errors.push(error.message));
  for (const [name, width, height] of [
    ["desktop", 1440, 1000],
    ["mobile", 375, 812],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await page.locator("h1").waitFor();
    for (const section of await page.locator("main > section").all()) {
      await section.scrollIntoViewIfNeeded();
      const heading = section.locator("h2").first();
      if (await heading.count()) await expect(heading).toBeVisible();
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    // Force full rendering for the screenshot only; production retains offscreen rendering optimization.
    await page.locator("main > section").evaluateAll((sections) =>
      sections.forEach((section) => {
        if (section instanceof HTMLElement)
          section.style.contentVisibility = "visible";
      }),
    );
    await page.locator("img").evaluateAll(async (images) => {
      await Promise.all(
        images.map(async (image) => {
          if (!(image instanceof HTMLImageElement)) return;
          image.loading = "eager";
          await image.decode();
        }),
      );
    });
    await page.screenshot({
      path: testInfo.outputPath(`home-${name}.png`),
      fullPage: true,
      animations: "disabled",
    });
    await copyFile(
      testInfo.outputPath(`home-${name}.png`),
      `artifacts/luxury/home-${name}.png`,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const path of ["services", "portfolio", "contact"]) {
    await page.goto(`/${path}`);
    await page.locator("h1").waitFor();
    await page.locator("img").evaluateAll(async (images) => {
      await Promise.all(
        images.map(async (image) => {
          const img = image as HTMLImageElement;
          img.loading = "eager";
          await img.decode();
        }),
      );
    });
    await page.screenshot({
      path: testInfo.outputPath(`${path}-desktop.png`),
      fullPage: true,
      animations: "disabled",
    });
    await copyFile(
      testInfo.outputPath(`${path}-desktop.png`),
      `artifacts/luxury/${path}-desktop.png`,
    );
  }
  expect(errors).toEqual([]);
});
