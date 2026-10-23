import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { blogPhotography, projectPhotography } from "../src/web/Photography";

test("complete photography release: all content, responsive layouts and successful asset requests", async ({
  page,
  request,
}) => {
  test.setTimeout(360000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const failures: string[] = [];
  page.on("response", (response) => {
    if (
      response.request().resourceType() === "image" &&
      !response.ok() &&
      response.status() !== 304
    )
      failures.push(`${response.status()} ${response.url()}`);
  });
  await page.goto("/portfolio");
  const inventory = await page.locator("#site-data").textContent();
  const data = JSON.parse(inventory!);
  const paths = [
    "/",
    "/portfolio",
    "/blog",
    ...data.projects
      .filter((p: { slug: string }) => projectPhotography[p.slug])
      .map((p: { slug: string }) => `/portfolio/${p.slug}`),
    ...data.posts
      .filter((p: { slug: string }) => blogPhotography[p.slug])
      .map((p: { slug: string }) => `/blog/${p.slug}`),
  ];
  for (const [label, width] of [
    ["desktop", 1440],
    ["tablet", 768],
    ["mobile", 390],
  ] as const) {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of paths) {
      expect((await page.goto(path))?.status()).toBe(200);
      await page.evaluate(() => document.fonts.ready);
      await page.locator("img").evaluateAll(async (nodes) => {
        for (const node of nodes) {
          const img = node as HTMLImageElement;
          img.loading = "eager";
          await img.decode();
        }
      });
      for (const img of await page
        .locator(".project-card img, .detail-image, .two-grid .editorial-photo")
        .all()) {
        const href = await img.evaluate(
          (node) => node.closest("a")?.getAttribute("href") || "",
        );
        if (href.startsWith("/blog/") && !blogPhotography[href.slice(6)])
          continue;
        if (
          href.startsWith("/portfolio/") &&
          !projectPhotography[href.slice(11)]
        )
          continue;
        expect(await img.getAttribute("src")).toContain("/images/photography/");
        expect(await img.getAttribute("alt")).toBeTruthy();
        expect(await img.getAttribute("srcset")).toContain("640w");
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (
        (path === "/" ||
          path === "/portfolio" ||
          path === "/blog" ||
          path === paths[3] ||
          path === `/blog/${data.posts[0].slug}`) &&
        label !== "tablet"
      ) {
        await page.screenshot({
          path: `artifacts/photography-release/${path === "/" ? "homepage" : path.slice(1).replaceAll("/", "-")}-${label}.png`,
          fullPage: true,
          animations: "disabled",
        });
      }
      if (path.startsWith("/blog/"))
        expect(
          await page
            .locator('meta[property="og:image"]')
            .getAttribute("content"),
        ).toContain("/images/photography/");
    }
    for (const type of ["portfolio", "blog"]) {
      await page.goto(`/${type}`);
      const links = new Set<string>();
      for (let pageNumber = 0; pageNumber < 10; pageNumber++) {
        for (const href of await page
          .locator(".project-card")
          .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")!)))
          links.add(href);
        const next = page.getByRole("button", { name: "Next", exact: false });
        if ((await next.count()) === 0 || (await next.isDisabled())) break;
        await next.click();
      }
      expect(links.size).toBe(
        type === "portfolio" ? data.projects.length : data.posts.length,
      );
      for (const href of links)
        expect((await request.get(href)).status()).toBe(200);
    }
  }
  const manifest = JSON.parse(
    readFileSync("public/images/photography/manifest.json", "utf8"),
  ) as { filename: string }[];
  for (const item of manifest)
    expect(
      (await request.get(`/images/photography/${item.filename}`)).status(),
    ).toBe(200);
  expect(failures).toEqual([]);
  expect(errors).toEqual([]);
});
