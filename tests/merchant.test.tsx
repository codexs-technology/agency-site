import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import type { Context } from "hono";
import { business, type SiteData } from "../src/shared/content";
import { PremiumFooter } from "../src/web/PremiumHome";
import { BusinessDetails } from "../src/web/BusinessDetails";
import { policySections } from "../src/shared/policies";
import { PolicyPage } from "../src/web/PolicyPage";
import { verifyTurnstile } from "../src/worker/security";
import type { AppEnv } from "../src/worker/types";

afterEach(() => vi.unstubAllGlobals());
describe("merchant content and security boundaries", () => {
  it("renders supplied contacts and all six secure social links without publishing an unverified street address", () => {
    const html = renderToString(
      <PremiumFooter
        data={
          {
            posts: [],
            projects: [],
            jobs: [],
            settings: {},
            turnstileSiteKey: "",
            localTestMode: false,
          } as unknown as SiteData
        }
      />,
    );
    expect(html).toContain(business.name);
    expect(html).toContain(`href="tel:${business.phone}"`);
    expect(html).toContain(`href="mailto:${business.supportEmail}"`);
    for (const social of business.socials)
      expect(html).toContain(
        `href="${social.url}" target="_blank" rel="noopener noreferrer"`,
      );
    const details = renderToString(<BusinessDetails />);
    expect(details).not.toContain(business.address);
    expect(details).not.toContain("google.com/maps");
    expect(details).toContain("address-proof verification");
  });
  it("provides complete, explicitly unapproved policy sections", () => {
    expect(Object.keys(policySections)).toHaveLength(5);
    for (const path of Object.keys(policySections)) {
      const html = renderToString(<PolicyPage path={path} />);
      expect(policySections[path].length).toBeGreaterThanOrEqual(5);
      expect(html).toContain("OWNER / LEGAL REVIEW REQUIRED");
      expect(html).toContain(business.supportEmail);
      expect(html).not.toContain('href="#"');
    }
  });
  const context = {
    env: {
      ENVIRONMENT: "production",
      TURNSTILE_SECRET_KEY: "private-test-value",
    },
    req: { url: "https://codesboxs.com/api/contact", header: () => undefined },
  } as unknown as Context<AppEnv>;
  it("fails closed for empty tokens, honeypots and provider failure", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetcher);
    expect(await verifyTurnstile(context, "", "")).toBe(false);
    expect(await verifyTurnstile(context, "token", "spam")).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
    expect(await verifyTurnstile(context, "token", "")).toBe(false);
  });
  it("only accepts a successful provider verification for the exact request hostname", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    for (const [success, hostname, expected] of [
      [true, "codesboxs.com", true],
      [true, "attacker.test", false],
      [false, "codesboxs.com", false],
    ] as const) {
      fetcher.mockResolvedValueOnce(Response.json({ success, hostname }));
      expect(await verifyTurnstile(context, "token", "")).toBe(expected);
    }
    fetcher.mockResolvedValueOnce(new Response("not-json"));
    expect(await verifyTurnstile(context, "token", "")).toBe(false);
  });
});
