import { describe, expect, it } from "vitest";
import pages from "../src/worker/pages";
import type { Env } from "../src/worker/types";

const context = {
  waitUntil() {},
  passThroughOnException() {},
} as unknown as ExecutionContext;
const bindings = {
  ASSETS: { fetch: async () => new Response("asset") },
} as unknown as Partial<Env>;

describe("Pages deployment without production database", () => {
  it("renders the homepage with the deployment origin and hydration data", async () => {
    const response = await pages.fetch(
      new Request("https://example.pages.dev/"),
      bindings,
      context,
    );
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('id="root"');
    expect(html).toContain('id="site-data"');
    expect(html).toContain("https://example.pages.dev");
    expect(html).toContain('"localTestMode":false');
    expect(html).not.toContain("http://localhost:8787");
  });

  it("serves deep links and preserves real 404 responses", async () => {
    expect(
      (
        await pages.fetch(
          new Request("https://example.pages.dev/contact"),
          bindings,
          context,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await pages.fetch(
          new Request("https://example.pages.dev/not-a-page"),
          bindings,
          context,
        )
      ).status,
    ).toBe(404);
  });

  it("fails closed for APIs and administrator access", async () => {
    const response = await pages.fetch(
      new Request("https://example.pages.dev/api/contact", { method: "POST" }),
      bindings,
      context,
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toHaveProperty("error");
    expect(
      (
        await pages.fetch(
          new Request("https://example.pages.dev/admin"),
          bindings,
          context,
        )
      ).status,
    ).toBe(503);
  });

  it("passes assets through and serves the sitemap", async () => {
    expect(
      await (
        await pages.fetch(
          new Request("https://example.pages.dev/images/hero.svg"),
          bindings,
          context,
        )
      ).text(),
    ).toBe("asset");
    const response = await pages.fetch(
      new Request("https://example.pages.dev/sitemap.xml"),
      bindings,
      context,
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("https://example.pages.dev");
  });
});
