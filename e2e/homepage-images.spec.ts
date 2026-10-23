import { expect, test } from "@playwright/test";

test("homepage photography: responsive sections, assets, links and detail consistency", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const stage = process.env.IMAGE_REVIEW_BEFORE === "true" ? "before" : "after";
  for (const [name, width] of [
    ["desktop", 1440],
    ["tablet", 768],
    ["mobile", 390],
  ] as const) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await page.locator(".header, .skip-link").evaluateAll((nodes) => {
      nodes.forEach((node) =>
        (node as HTMLElement).style.setProperty(
          "visibility",
          "hidden",
          "important",
        ),
      );
    });
    for (const [sectionName, selector] of [
      ["projects", ".premium-projects"],
      ["services", ".premium-services"],
    ]) {
      const section = page.locator(selector);
      await section.scrollIntoViewIfNeeded();
      await section.evaluate((node) => {
        (node as HTMLElement).style.contentVisibility = "visible";
      });
      await section.locator("img").evaluateAll(async (images) => {
        await Promise.all(
          images.map(async (node) => {
            const image = node as HTMLImageElement;
            image.loading = "eager";
            await image.decode();
          }),
        );
      });
      await section.screenshot({
        path: `artifacts/homepage-images/${stage}-${sectionName}-${name}.png`,
        animations: "disabled",
        style: ".header, .skip-link { visibility: hidden !important; }",
      });
      if (stage === "after") {
        const images = section.locator("img");
        await expect(images).toHaveCount(sectionName === "projects" ? 6 : 10);
        for (const image of await images.all()) {
          expect(
            await image.evaluate(
              (node) => (node as HTMLImageElement).naturalWidth,
            ),
          ).toBeGreaterThan(0);
          expect(await image.getAttribute("alt")).toBeTruthy();
          expect(await image.getAttribute("srcset")).toContain("640w");
        }
      }
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  if (stage === "after") {
    const projectLinks = await page
      .locator(".premium-project-grid > a")
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          href: node.getAttribute("href")!,
          src: node.querySelector("img")!.getAttribute("src")!,
        })),
      );
    for (const link of projectLinks) {
      const response = await request.get(link.href);
      expect(response.status()).toBe(200);
      expect(await response.text()).toContain(link.src);
    }
    for (const href of await page
      .locator(".premium-service-grid > a")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")!)))
      expect((await request.get(href)).status()).toBe(200);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator(".premium-service").first().hover();
    await page.waitForTimeout(350);
    expect(
      await page
        .locator(".premium-service")
        .first()
        .evaluate((node) => getComputedStyle(node).transform),
    ).not.toBe("none");
  }
  expect(errors).toEqual([]);
});
