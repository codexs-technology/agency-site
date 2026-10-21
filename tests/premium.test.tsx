import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import {
  PremiumHome,
  premiumServiceSlugs,
  availableServiceSlugs,
} from "../src/web/PremiumHome";
import type { SiteData } from "../src/shared/content";
import pages from "../src/worker/pages";
import type { Env } from "../src/worker/types";

const data: SiteData = {
  path: "/",
  posts: [],
  projects: [],
  jobs: [],
  serviceContent: [],
  turnstileSiteKey: "",
  siteUrl: "https://example.test",
  localTestMode: false,
  settings: {},
};
describe("Reference-led production safeguards", () => {
  it("renders exactly ten linked service cards with existing detail content", () => {
    expect(premiumServiceSlugs).toHaveLength(10);
    expect(new Set(premiumServiceSlugs).size).toBe(10);
    for (const slug of premiumServiceSlugs)
      expect(availableServiceSlugs).toContain(slug);
    const html = renderToString(<PremiumHome data={data} />);
    expect(html.match(/class="premium-service service-art-/g)).toHaveLength(10);
    expect(html).not.toMatch(
      /100\+|24\/7|James R\.|Sarah L\.|\$299|\$699|\$1,299/,
    );
    expect(html).not.toContain('href="#"');
    expect(html.match(/class="package-price"/g)).toHaveLength(3);
  });
  it("serves all newly linked pricing, service, solution and policy routes", async () => {
    const bindings = {
      ASSETS: { fetch: async () => new Response("asset") },
    } as unknown as Partial<Env>;
    const context = {
      waitUntil() {},
      passThroughOnException() {},
    } as unknown as ExecutionContext;
    for (const path of [
      "/solutions",
      "/pricing",
      "/pricing/starter",
      "/pricing/business",
      "/pricing/enterprise",
      "/refund-policy",
      "/service-delivery-policy",
      ...premiumServiceSlugs.map((s) => `/services/${s}`),
    ]) {
      const response = await pages.fetch(
        new Request(`https://example.test${path}`),
        bindings,
        context,
      );
      expect(response.status, path).toBe(200);
    }
  });
});
