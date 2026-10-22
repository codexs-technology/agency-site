import { test, expect } from "@playwright/test";
import { pages, services } from "../src/shared/content";

test("SSR routes, local images and all rendered internal links resolve", async ({
  request,
}) => {
  const routes = [
    ...Object.keys(pages).filter((p) => p !== "/404"),
    ...services.map((s) => `/services/${s.slug}`),
    "/admin",
  ];
  const checked = new Set<string>();
  for (const route of routes) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(200);
    const html = await response.text();
    expect(html, route).toContain("<h1");
    expect(html, route).toContain('<meta name="description"');
    for (const match of html.matchAll(/(?:href|src)="(\/[^"\s]*)"/g)) {
      const path = match[1].split("#")[0];
      if (checked.has(path)) continue;
      checked.add(path);
      const target = await request.get(path);
      expect(target.status(), `${route} -> ${path}`).toBe(200);
      if (path.startsWith("/images/"))
        expect(target.headers()["content-type"]).toContain(
          path.endsWith(".png")
            ? "image/png"
            : path.endsWith(".webp")
              ? "image/webp"
              : "image/svg+xml",
        );
    }
  }
  expect((await request.get("/sitemap.xml")).status()).toBe(200);
  expect((await request.get("/robots.txt")).status()).toBe(200);
});
