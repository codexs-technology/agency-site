import { describe, expect, it } from "vitest";
import { services, business } from "../src/shared/content";
import { displayItems } from "../src/shared/commerce-display";
import { validateRates, type RateSnapshot } from "../src/shared/currency";
import {
  authoritativeTotal,
  nextPaymentState,
  processVerifiedWebhook,
  type PaymentOrder,
  type PaymentEvent,
  type PaymentStore,
} from "../src/worker/payment-lifecycle";

const order: PaymentOrder = {
  id: "test",
  amountMinor: 1000,
  currency: "USD",
  state: "pending",
  refundedMinor: 0,
  paymentId: null,
  version: 0,
};
const event: PaymentEvent = {
  id: "evt1",
  orderId: "test",
  paymentId: "p1",
  amountMinor: 1000,
  currency: "USD",
  state: "paid",
  refundedMinor: 0,
};
describe("phase two approval and calculation boundaries", () => {
  it("keeps eighteen scopes and distinguishes address publication from verification", () => {
    expect(services).toHaveLength(18);
    for (const service of services)
      expect(service.deliverables.length).toBeGreaterThan(0);
    expect(business.addressVerified).toBe(false);
    expect(business.addressPublicationApproved).toBe(true);
    expect(business.address).toBe(
      "Plot No. 1/1, Near Ghazi Overseas Employment Pakistan, Nursery, PECHS Block 6, Shahrah-e-Faisal, Karachi, Pakistan.",
    );
  });
  it("rounds the same approved unit on every surface before multiplying", () => {
    const fx: RateSnapshot = {
      rates: {
        USD: "1",
        PKR: "278.25",
        EUR: "0.92",
        GBP: "0.77",
        AED: "3.6725",
      },
      updatedAt: 1,
      nextUpdate: 2,
      stale: true,
    };
    const [item] = displayItems(
      [
        {
          service: "web-development",
          quantity: 3,
          title: "Synthetic",
          amountMinor: 1,
          currency: "USD",
          billing: "one_time",
          delivery: "Test",
          exclusions: "Test",
        },
      ],
      "AED",
      fx,
    );
    expect(item.displayMinor).toBe(4);
    expect(item.displayLineMinor).toBe(12);
    expect(
      displayItems([{ ...item, amountMinor: null }], "EUR", null)[0]
        .displayMinor,
    ).toBeNull();
    expect(displayItems([item], "EUR", null)[0].displayMinor).toBeNull();
  });
  it("marks stale rates and rejects rates older than seven days", () => {
    const seconds = 1792770000;
    const payload = {
      result: "success",
      base_code: "USD",
      rates: { USD: 1, PKR: 278, EUR: 0.9, GBP: 0.8, AED: 3.67 },
      time_last_update_unix: seconds - 86401,
      time_next_update_unix: seconds - 1,
    };
    expect(validateRates(payload, seconds * 1000).stale).toBe(true);
    expect(() =>
      validateRates(
        { ...payload, time_last_update_unix: seconds - 8 * 86400 },
        seconds * 1000,
      ),
    ).toThrow();
  });
  it("rejects quote, mixed-currency, unapproved and recurring payable totals", () => {
    const line = {
      approved: true,
      amountMinor: 500,
      currency: "USD",
      quantity: 2,
      billing: "one_time",
    };
    expect(authoritativeTotal([line])).toEqual({
      amountMinor: 1000,
      currency: "USD",
    });
    for (const bad of [
      { ...line, approved: false },
      { ...line, amountMinor: null },
      { ...line, billing: "recurring" },
      { ...line, quantity: 1.5 },
    ])
      expect(() => authoritativeTotal([bad])).toThrow();
    expect(() =>
      authoritativeTotal([line, { ...line, currency: "EUR" }]),
    ).toThrow();
  });
  it("supports failure, cumulative partial refunds and terminal full refund", () => {
    expect(nextPaymentState(order, { ...event, state: "failed" }).state).toBe(
      "failed",
    );
    const paid = nextPaymentState(order, event);
    const partial = nextPaymentState(paid, {
      ...event,
      state: "partially_refunded",
      refundedMinor: 250,
    });
    expect(partial.refundedMinor).toBe(250);
    expect(
      nextPaymentState(partial, {
        ...event,
        state: "refunded",
        refundedMinor: 1000,
      }).state,
    ).toBe("refunded");
    expect(() =>
      nextPaymentState(partial, {
        ...event,
        state: "partially_refunded",
        refundedMinor: 200,
      }),
    ).toThrow();
    expect(() =>
      nextPaymentState(paid, { ...event, paymentId: "duplicate-charge" }),
    ).toThrow();
    expect(() =>
      nextPaymentState(order, { ...event, amountMinor: 1 }),
    ).toThrow();
  });
  it("mock sandbox verifies before mutation and persists duplicate events once", async () => {
    let current = order;
    const events = new Set<string>();
    let audits = 0;
    const store: PaymentStore = {
      load: async () => current,
      eventPayload: async (_provider, id) =>
        events.has(id) ? JSON.stringify(event) : null,
      commit: async (_provider, input, previous, next) => {
        if (events.has(input.id)) return "duplicate";
        if (current.version !== previous.version) throw new Error("Conflict");
        events.add(input.id);
        current = next;
        audits++;
        return "applied";
      },
    };
    const adapter = {
      name: "mock-only",
      verifyWebhook: async (_raw: string, headers: Headers) => {
        if (headers.get("x-mock-signature") !== "verified-test-only")
          throw new Error("Invalid signature");
        return event;
      },
      reconcile: async () => event,
    };
    await expect(
      processVerifiedWebhook(adapter, store, "{}", new Headers()),
    ).rejects.toThrow("Invalid signature");
    expect(audits).toBe(0);
    const headers = new Headers({ "x-mock-signature": "verified-test-only" });
    expect(await processVerifiedWebhook(adapter, store, "{}", headers)).toBe(
      "applied",
    );
    expect(await processVerifiedWebhook(adapter, store, "{}", headers)).toBe(
      "duplicate",
    );
    expect(audits).toBe(1);
  });
});
