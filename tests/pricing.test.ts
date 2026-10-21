import { describe, expect, it } from "vitest";
import { formatMinorAmount } from "../src/shared/pricing";
import { pricingSchema } from "../src/worker/commerce";

describe("commercial pricing safety", () => {
  it("formats zero, two and three decimal currencies in their actual minor units", () => {
    expect(formatMinorAmount(29900, "USD")).toBe("$299.00");
    expect(formatMinorAmount(299, "JPY")).toBe("¥299");
    expect(formatMinorAmount(1234, "KWD")).toContain("1.234");
    expect(() => formatMinorAmount(-1, "USD")).toThrow();
    expect(() => formatMinorAmount(1.5, "USD")).toThrow();
  });
  it("rejects unknown currencies and whitespace-only approved delivery terms", () => {
    const record = {
      slug: "starter",
      title: "Starter",
      description: "A clearly scoped starter engagement.",
      features_json: '["Responsive website"]',
      amount_minor: 29900,
      currency: "USD",
      billing: "one_time",
      delivery: "Agreed milestones",
      revisions: "Two rounds",
      exclusions: "Hosting excluded",
      disclosures: "Taxes specified in quote",
      approved: 1,
      status: "published",
    };
    expect(pricingSchema.safeParse(record).success).toBe(true);
    expect(
      pricingSchema.safeParse({ ...record, currency: "ZZZ" }).success,
    ).toBe(false);
    expect(
      pricingSchema.safeParse({ ...record, delivery: "   " }).success,
    ).toBe(false);
  });
});
