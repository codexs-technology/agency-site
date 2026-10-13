import { test, expect } from "@playwright/test";

test("capture desktop and mobile layouts without console errors", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
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
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});
