import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { pages } from "../src/shared/content";

test("signature sample architecture and development timeline are interactive", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "03 Evaluate" }).click();
  await expect(page.locator(".workflow-reading")).toContainText(
    "must not invent",
  );
  const timeline = page.locator(".signature-process");
  await timeline.getByRole("tab").last().click();
  await expect(timeline.locator(".timeline-detail .eyebrow")).toContainText(
    "07",
  );
  await expect(page.locator(".signature-engagements a")).not.toHaveCount(0);
  await page.getByRole("link", { name: "Back to top" }).click();
  await expect(page.locator("h1")).toBeInViewport();
});

test("signature rendered review at all requested widths and public page families", async ({
  page,
}) => {
  test.setTimeout(240000);
  const pass = process.env.SIGNATURE_REVIEW_PASS || "pass-1";
  const directory = `artifacts/signature-v3/${pass}`;
  await mkdir(directory, { recursive: true });
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await page.locator("main > section").evaluateAll((nodes) =>
      nodes.forEach((node) => {
        if (node instanceof HTMLElement)
          node.style.contentVisibility = "visible";
      }),
    );
    await page.locator("img").evaluateAll(async (images) => {
      await Promise.all(
        images.map(async (img) => {
          if (!(img instanceof HTMLImageElement)) return;
          img.loading = "eager";
          await img.decode();
        }),
      );
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `home width ${width}`,
    ).toBe(true);
    await page.screenshot({
      path: `${directory}/home-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page.screenshot({
      path: `${directory}/hero-${width}.png`,
      animations: "disabled",
    });
  }
  for (const path of Object.keys(pages).filter((path) => path !== "/")) {
    for (const width of [1440, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
      await page.locator("main > section").evaluateAll((sections) =>
        sections.forEach((section) => {
          if (section instanceof HTMLElement)
            section.style.contentVisibility = "visible";
        }),
      );
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${path} width ${width}`,
      ).toBe(true);
      await page.screenshot({
        path: `${directory}/${path.replaceAll("/", "_")}-${width}.png`,
        fullPage: true,
        animations: "disabled",
      });
    }
  }
});
