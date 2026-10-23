import { describe, expect, it } from "vitest";
import { convertMinor, validateRates } from "../src/shared/currency";
import {
  selectionSchema,
  guestRequestSchema,
  transitionPayment,
} from "../src/shared/guest-commerce";
import { pricingSchema } from "../src/worker/commerce";

const rates = {
  USD: "1",
  PKR: "278.25",
  EUR: "0.92",
  GBP: "0.77",
  AED: "3.6725",
};
describe("guest commerce boundaries", () => {
  it("converts supported currencies with integer final rounding", () => {
    expect(convertMinor(10000, "USD", "PKR", rates)).toBe(2782500);
    expect(convertMinor(1, "USD", "AED", rates)).toBe(4);
    expect(convertMinor(9200, "EUR", "USD", rates)).toBe(10000);
    expect(convertMinor(100, "USD", "USD", rates)).toBe(100);
  });
  it("rejects invalid amounts and rates", () => {
    expect(() => convertMinor(1.5, "USD", "EUR", rates)).toThrow();
    expect(() => convertMinor(-1, "USD", "EUR", rates)).toThrow();
    expect(() =>
      convertMinor(1, "USD", "EUR", { ...rates, EUR: "0" }),
    ).toThrow();
  });
  it("validates provider identity, timestamps and required currencies", () => {
    const now = Date.now(),
      seconds = Math.floor(now / 1000);
    const payload = {
      result: "success",
      base_code: "USD",
      rates,
      time_last_update_unix: seconds - 60,
      time_next_update_unix: seconds + 86400 - 60,
    };
    expect(validateRates(payload, now).stale).toBe(false);
    expect(() =>
      validateRates({ ...payload, base_code: "EUR" }, now),
    ).toThrow();
    expect(() =>
      validateRates(
        { ...payload, time_last_update_unix: seconds - 8 * 86400 },
        now,
      ),
    ).toThrow();
    expect(() =>
      validateRates({ ...payload, rates: { USD: 1 } }, now),
    ).toThrow();
  });
  it("rejects client price injection, arbitrary services and quantities outside bounds", () => {
    expect(
      selectionSchema.safeParse([
        { service: "web-development", quantity: 1, amountMinor: 1 },
      ]).success,
    ).toBe(false);
    expect(
      selectionSchema.safeParse([{ service: "../admin", quantity: 1 }]).success,
    ).toBe(false);
    expect(
      selectionSchema.safeParse([{ service: "web-development", quantity: 11 }])
        .success,
    ).toBe(false);
    expect(selectionSchema.safeParse([]).success).toBe(false);
  });
  it("requires billing identity, private cart key and consent without account registration", () => {
    const data = {
      cartId: "a".repeat(64),
      cartKey: "b".repeat(64),
      name: "Test Customer",
      email: "test@example.com",
      country: "PK",
      requestType: "quote",
      currency: "USD",
      consent: true,
      turnstileToken: "",
    };
    expect(guestRequestSchema.safeParse(data).success).toBe(true);
    expect(
      guestRequestSchema.safeParse({ ...data, consent: false }).success,
    ).toBe(false);
    expect(guestRequestSchema.safeParse({ ...data, cartKey: "" }).success).toBe(
      false,
    );
  });
  it("handles duplicate and terminal payment states without fake success", () => {
    const amount = { amountMinor: 1000, currency: "USD" };
    expect(transitionPayment("pending", "paid", amount, amount)).toBe("paid");
    expect(transitionPayment("paid", "paid", amount, amount)).toBe("paid");
    expect(transitionPayment("pending", "failed", amount, amount)).toBe(
      "failed",
    );
    expect(transitionPayment("pending", "cancelled", amount, amount)).toBe(
      "cancelled",
    );
    expect(transitionPayment("paid", "refunded", amount, amount)).toBe(
      "refunded",
    );
    expect(() =>
      transitionPayment("cancelled", "paid", amount, amount),
    ).toThrow();
    expect(() =>
      transitionPayment("pending", "paid", amount, {
        ...amount,
        amountMinor: 1,
      }),
    ).toThrow();
  });
  it("does not publish priced packages without service binding and recurring interval", () => {
    const p = {
      slug: "test-package",
      title: "Test package",
      description: "A synthetic test package",
      features_json: '["Test feature"]',
      amount_minor: 100,
      currency: "USD",
      billing: "recurring",
      delivery: "Agreed",
      revisions: "Agreed",
      exclusions: "Agreed",
      disclosures: "Agreed",
      approved: 1,
      status: "published",
    };
    expect(pricingSchema.safeParse(p).success).toBe(false);
    expect(
      pricingSchema.safeParse({
        ...p,
        service_slug: "web-development",
        billing_interval: "monthly",
      }).success,
    ).toBe(true);
  });
});
