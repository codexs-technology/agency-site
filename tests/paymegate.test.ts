import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { createHmac, randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { api } from "../src/worker/api";
import pagesWorker from "../src/worker/pages";
import { Hono } from "hono";
import {
  createVerificationCheckout,
  reconcilePayMeGate,
} from "../src/worker/checkout";
import type { AppEnv } from "../src/worker/types";
import { processOutbox } from "../src/worker/email";
import { paymentReadiness } from "../src/worker/payments";
import {
  authenticateDelivery,
  decimalToMinor,
  minorToDecimal,
  payMeGateConfig,
  resetPaymentMethodsCache,
  sameDecimal,
  trustedCheckoutUrl,
  verifySignature,
} from "../src/worker/paymegate";
import type { Env } from "../src/worker/types";

const SECRET = "whsec_sandbox_test_secret_value_0001";
const OLD_SECRET = "whsec_sandbox_previous_secret_00001";
const settings = {
  PAYMENTS_ENABLED: "true",
  PAYMEGATE_MODE: "sandbox",
  PAYMEGATE_API_BASE_URL: "https://api.codesboxs.com/v1",
  PAYMEGATE_CHECKOUT_ORIGIN: "https://pay.codesboxs.com",
  PAYMEGATE_WORKSPACE: "codesboxs-llc",
  PAYMEGATE_PAYMENT_METHODS: "*",
  PAYMEGATE_API_KEY: "pmg_test_unit_only_key_0001",
  PAYMEGATE_WEBHOOK_SECRET: SECRET,
};
const context = {
  waitUntil() {},
  passThroughOnException() {},
} as unknown as ExecutionContext;

/** Real SQLite (all migrations, constraints, triggers) behind the D1 interface. */
function database() {
  const sql = new DatabaseSync(":memory:");
  sql.exec("PRAGMA foreign_keys=ON");
  for (const file of readdirSync("migrations")
    .filter((n) => n.endsWith(".sql"))
    .sort())
    sql.exec(readFileSync(`migrations/${file}`, "utf8"));
  // Mirror the verified production catalog state (approved, published, one-time).
  sql.exec(`UPDATE pricing_packages SET approved=1,status='published',
    service_slug=CASE id WHEN 'starter' THEN 'web-development' WHEN 'business' THEN 'custom-software' ELSE 'ai-agents-automation' END`);
  type Value = string | number | null;
  const prepare = (query: string) => {
    let values: Value[] = [];
    const statement = {
      bind(...input: Value[]) {
        values = input;
        return statement;
      },
      async first() {
        return sql.prepare(query).get(...values) ?? null;
      },
      async all() {
        return { results: sql.prepare(query).all(...values) };
      },
      async run() {
        const r = sql.prepare(query).run(...values);
        return { meta: { changes: Number(r.changes) } };
      },
      execute() {
        return sql.prepare(query).run(...values);
      },
    };
    return statement;
  };
  const db = {
    prepare,
    async batch(statements: ReturnType<typeof prepare>[]) {
      sql.exec("BEGIN");
      try {
        const results = statements.map((s) => s.execute());
        sql.exec("COMMIT");
        return results;
      } catch (error) {
        sql.exec("ROLLBACK");
        throw error;
      }
    },
  } as unknown as D1Database;
  const count = (q: string) =>
    Number((sql.prepare(q).get() as { n: number }).n);
  const row = (q: string, ...v: Value[]) =>
    sql.prepare(q).get(...v) as Record<string, unknown> | undefined;
  return { sql, db, count, row };
}

type ProviderOrder = Record<string, unknown> & { orderUUID: string };
/** Mock of only the documented PayMeGate endpoints used by the adapter. */
function provider() {
  const orders = new Map<string, ProviderOrder>();
  const calls: {
    method: string;
    path: string;
    body?: unknown;
    key?: string;
  }[] = [];
  const state = {
    failNextCreate: null as null | "network" | "login" | "wrapped",
    methods: [
      {
        key: "stripe",
        displayName: "Stripe",
        minimumAmount: "1.00",
        minimumCurrency: "USD",
        status: "AVAILABLE",
      },
      {
        key: "crypto",
        displayName: "Crypto",
        minimumAmount: "5.00",
        minimumCurrency: "USD",
        status: "AVAILABLE",
      },
    ] as Record<string, string>[],
    merchantId: "merchant_codesboxs",
  };
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method || "GET";
      const headers = new Headers(init?.headers);
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({
        method,
        path: url.pathname,
        body,
        key: headers.get("X-API-Key") || "",
      });
      // Exact documented base: https://api.codesboxs.com + /v1/<operation>, never /v1/v1.
      expect(url.origin).toBe("https://api.codesboxs.com");
      expect(url.pathname.startsWith("/v1/v1")).toBe(false);
      expect(init?.redirect).toBe("manual");
      const json = (status: number, payload: unknown) =>
        new Response(JSON.stringify(payload), {
          status,
          headers: { "Content-Type": "application/json" },
        });
      if (method === "GET" && url.pathname === "/v1/webhook")
        return json(200, {
          success: true,
          data: {
            configured: true,
            endpointId: randomUUID(),
            url: "https://codesboxs.com/webhooks/paymegate",
            events: ["order.paid"],
            status: "active",
            createdAt: null,
            updatedAt: null,
          },
        });
      if (method === "GET" && url.pathname === "/v1/payment-methods")
        return json(200, {
          success: true,
          data: {
            paymentMethods: state.methods,
            paymentMethodsKeys: state.methods.map((m) => m.key),
          },
        });
      const external = url.pathname.match(
        /^\/v1\/orders\/by-external-id\/(.+)$/,
      );
      if (method === "GET" && external)
        return json(200, {
          success: true,
          data: {
            items: [...orders.values()].filter(
              (o) => o.externalId === external[1],
            ),
          },
        });
      if (method === "POST" && url.pathname === "/v1/orders") {
        const orderUUID = randomUUID();
        const order: ProviderOrder = {
          merchantId: state.merchantId,
          orderUUID,
          externalId: body.externalId,
          amount: body.amount,
          currency: body.currency,
          status: "UNPAID",
          checkoutUrl: `https://pay.codesboxs.com/pay/${orderUUID}`,
          metadata: body.metadata,
        };
        orders.set(orderUUID, order);
        const mode = state.failNextCreate;
        state.failNextCreate = null;
        if (mode === "network")
          throw new TypeError("network down after provider accepted the order");
        if (mode === "login")
          return json(201, {
            success: true,
            data: { ...order, checkoutUrl: "https://pay.codesboxs.com/login" },
          });
        if (mode === "wrapped")
          return json(201, { success: true, data: { order } });
        return json(201, { success: true, data: order });
      }
      const one = url.pathname.match(/^\/v1\/orders\/([0-9a-f-]{36})$/);
      if (method === "GET" && one && orders.has(one[1]))
        return json(200, { success: true, data: orders.get(one[1]) });
      return json(404, {
        success: false,
        error: {
          code: "not_found",
          message: "Route not found",
          requestId: "x",
        },
      });
    },
  );
  return { orders, calls, fetchMock, state };
}

function sign(body: string, ts: number, secret = SECRET, separator = ".") {
  return createHmac("sha256", secret)
    .update(`${ts}${separator}${body}`)
    .digest("base64url");
}

let ctx: ReturnType<typeof database>;
let pmg: ReturnType<typeof provider>;
let env: Env;
let warn: { mock: { calls: unknown[][] } };
beforeEach(() => {
  ctx = database();
  pmg = provider();
  resetPaymentMethodsCache();
  vi.stubGlobal("fetch", pmg.fetchMock);
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  env = {
    DB: ctx.db,
    ASSETS: {} as Fetcher,
    ENVIRONMENT: "development",
    LOCAL_TEST_MODE: "true",
    PUBLIC_SITE_URL: "https://codesboxs.com",
    ...settings,
  } as Env;
});
afterEach(() => {
  ctx.sql.close();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const post = (path: string, body: unknown, e: Env = env) =>
  api.request(
    `http://localhost${path}`,
    {
      method: "POST",
      headers: {
        Origin: "http://localhost",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
    e,
  );
async function cart(
  selection: unknown = [
    { service: "web-development", packageId: "starter", quantity: 1 },
  ],
) {
  const res = await post("/guest/carts", selection);
  expect(res.status).toBe(201);
  return (await res.json()) as { id: string; key: string };
}
const buyer = {
  name: "Sandbox Buyer",
  email: "Buyer@Example.com",
  consent: true,
  turnstileToken: "",
  website: "",
};
async function checkout(c?: { id: string; key: string }) {
  const k = c || (await cart());
  const res = await post("/checkout", {
    cartId: k.id,
    cartKey: k.key,
    ...buyer,
  });
  return {
    res,
    json: (await res.json()) as Record<string, string | boolean>,
    cart: k,
  };
}
const providerOrderFor = (orderId: string) =>
  [...pmg.orders.values()].find((o) => o.externalId === orderId)!;

/**
 * Dashboard sample shape: id, type, createdAt, orderUUID, transactionUUID,
 * transactionRef, status, amount, currency, receivedAmount, receivedCurrency,
 * customerEmail, externalId, metadata, paidAt. Also settles the provider order
 * so the authenticated GET /v1/orders/{orderUUID} confirmation agrees.
 */
function settle(orderUUID: string, overrides: Record<string, unknown> = {}) {
  const order = pmg.orders.get(orderUUID)!;
  const transactionUUID = randomUUID();
  Object.assign(order, {
    status: "PAID",
    paidTransactionUUID: transactionUUID,
    transactionRef: "provider_ref",
  });
  return {
    id: randomUUID(),
    type: "order.paid",
    createdAt: new Date().toISOString(),
    orderUUID,
    transactionUUID,
    transactionRef: "provider_ref",
    status: "PAID",
    amount: order.amount,
    currency: order.currency,
    receivedAmount: order.amount,
    receivedCurrency: order.currency,
    customerEmail: "buyer@example.com",
    externalId: order.externalId,
    metadata: order.metadata,
    paidAt: new Date().toISOString(),
    ...overrides,
  } as Record<string, unknown>;
}
type DeliverOpts = {
  ts?: number;
  secret?: string;
  separator?: string;
  raw?: string;
  path?: string;
  e?: Env;
};
/** Delivers through the real Pages entry (codesboxs.com) at the retained public URL. */
async function deliver(event: Record<string, unknown>, opts: DeliverOpts = {}) {
  const raw = opts.raw ?? JSON.stringify(event);
  const ts = opts.ts ?? Math.floor(Date.now() / 1000);
  const request = new Request(
    `https://codesboxs.com${opts.path ?? "/webhooks/paymegate"}`,
    {
      method: "POST",
      // No Origin header: proves the route sits outside the same-site middleware.
      headers: {
        "Content-Type": "application/json",
        "X-Paymegate-Event": "order.paid",
        "X-Paymegate-Event-Id": String(event.id),
        "X-Paymegate-Timestamp": String(ts),
        "X-Paymegate-Signature": sign(raw, ts, opts.secret, opts.separator),
      },
      body: raw,
    },
  );
  return pagesWorker.fetch(request, opts.e ?? env, context);
}
async function createdOrder() {
  const { json } = await checkout();
  const orderId = String(json.orderId);
  return {
    orderId,
    accessKey: String(json.accessKey),
    uuid: providerOrderFor(orderId).orderUUID,
  };
}
const inbox = () =>
  ctx.sql
    .prepare(
      "SELECT status,detail FROM payment_webhook_inbox ORDER BY received_at,rowid",
    )
    .all();

describe("OpenAPI contract: configuration, amounts and URLs", () => {
  it("converts minor units exactly at the ISO 4217 scale", () => {
    expect(minorToDecimal(49900, "USD")).toBe("499.00");
    expect(minorToDecimal(5, "USD")).toBe("0.05");
    expect(minorToDecimal(500, "JPY")).toBe("500");
    expect(minorToDecimal(1500, "KWD")).toBe("1.500");
    expect(decimalToMinor("499.00", "USD")).toBe(49900);
    expect(decimalToMinor("499", "USD")).toBe(49900);
    expect(decimalToMinor("499.5", "USD")).toBe(49950);
    expect(decimalToMinor("499.000", "USD")).toBe(49900);
    expect(() => decimalToMinor("499.001", "USD")).toThrow();
    expect(() => decimalToMinor("-1", "USD")).toThrow();
    expect(() => decimalToMinor(499, "USD")).toThrow();
    expect(() => minorToDecimal(0, "USD")).toThrow();
    expect(sameDecimal("499.50", "499.5")).toBe(true);
    expect(sameDecimal("0499.5000", "499.5")).toBe(true);
    expect(sameDecimal("499.51", "499.5")).toBe(false);
    expect(sameDecimal("0.000000000000000001", "0")).toBe(false);
  });
  it("normalizes the base URL once and never duplicates /v1", () => {
    for (const base of [
      "https://api.codesboxs.com/v1",
      "https://api.codesboxs.com/v1/",
    ])
      expect(
        payMeGateConfig({ ...settings, PAYMEGATE_API_BASE_URL: base }).config
          ?.apiBaseUrl,
      ).toBe("https://api.codesboxs.com/v1");
    for (const bad of [
      "https://api.codesboxs.com",
      "https://api.codesboxs.com/v1/v1",
      "https://api.codesboxs.com/v1?x=1",
      "http://api.codesboxs.com/v1",
      "https://evil.example/v1",
    ])
      expect(
        payMeGateConfig({ ...settings, PAYMEGATE_API_BASE_URL: bad }).problems,
      ).toContain("PAYMEGATE_API_BASE_URL");
  });
  it("validates configuration and strict sandbox/live key isolation without revealing values", () => {
    expect(payMeGateConfig(settings).problems).toEqual([]);
    expect(
      payMeGateConfig({
        ...settings,
        PAYMEGATE_CHECKOUT_ORIGIN: "http://pay.codesboxs.com",
        PAYMEGATE_API_KEY: "pmg_live_wrong_mode_for_sandbox",
      }).problems,
    ).toEqual(["PAYMEGATE_CHECKOUT_ORIGIN", "PAYMEGATE_API_KEY"]);
    expect(
      payMeGateConfig({ ...settings, PAYMEGATE_MODE: "production" }).problems,
    ).toEqual(["PAYMEGATE_API_KEY"]);
    expect(
      payMeGateConfig({ ...settings, PAYMEGATE_PAYMENT_METHODS: "*,crypto" })
        .problems,
    ).toEqual(["PAYMEGATE_PAYMENT_METHODS"]);
    expect(
      payMeGateConfig({
        ...settings,
        PAYMEGATE_WEBHOOK_SECRET_PREVIOUS: SECRET,
      }).problems,
    ).toEqual(["PAYMEGATE_WEBHOOK_SECRET_PREVIOUS"]);
  });
  it("matches the Cloudflare production dashboard configuration (mode=live)", () => {
    // Exactly the variables configured on Pages and the Worker on 2026-11-28.
    const dashboard = {
      PAYMENTS_ENABLED: "false",
      PAYMEGATE_MODE: "live",
      PAYMEGATE_API_BASE_URL: "https://api.codesboxs.com/v1",
      PAYMEGATE_CHECKOUT_ORIGIN: "https://pay.codesboxs.com",
      PAYMEGATE_WORKSPACE: "codesboxs-llc",
      PAYMEGATE_API_KEY: "pmg_live_unit_only_key_0001",
      PAYMEGATE_WEBHOOK_SECRET: SECRET,
    };
    // Still blocked until the owner chooses payment methods; nothing else is missing.
    expect(payMeGateConfig(dashboard).problems).toEqual([
      "PAYMEGATE_PAYMENT_METHODS",
    ]);
    const complete = payMeGateConfig({
      ...dashboard,
      PAYMEGATE_PAYMENT_METHODS: "stripe",
    });
    expect(complete.problems).toEqual([]);
    expect(complete.config?.mode).toBe("production");
    // "live" never accepts a sandbox key, and the flag keeps checkout off.
    expect(
      payMeGateConfig({
        ...dashboard,
        PAYMEGATE_PAYMENT_METHODS: "stripe",
        PAYMEGATE_API_KEY: "pmg_test_unit_only_key_0001",
      }).problems,
    ).toEqual(["PAYMEGATE_API_KEY"]);
    expect(
      paymentReadiness({ ...dashboard, PAYMEGATE_PAYMENT_METHODS: "stripe" })
        .enabled,
    ).toBe(false);
  });
  it("keeps readiness disabled unless flag and full configuration are present", () => {
    expect(paymentReadiness()).toMatchObject({
      enabled: false,
      provider: null,
    });
    expect(
      paymentReadiness({ ...settings, PAYMENTS_ENABLED: "false" }).enabled,
    ).toBe(false);
    const partial = paymentReadiness({ ...settings, PAYMEGATE_API_KEY: "" });
    expect(partial.enabled).toBe(false);
    expect(partial.reason).not.toMatch(/PAYMEGATE|KEY|SECRET/);
    expect(paymentReadiness(settings)).toMatchObject({
      enabled: true,
      provider: "paymegate",
      mode: "sandbox",
    });
  });
  it("accepts only the documented hosted checkout path on the branded origin", () => {
    const id = randomUUID();
    const cfg = { checkoutOrigin: "https://pay.codesboxs.com" };
    expect(
      trustedCheckoutUrl(cfg, id, `https://pay.codesboxs.com/pay/${id}`),
    ).toBe(`https://pay.codesboxs.com/pay/${id}`);
    for (const bad of [
      "https://pay.codesboxs.com/login",
      `https://pay.codesboxs.com/pay/${randomUUID()}`,
      `https://www.paymegate.com/pay/${id}`,
      `http://pay.codesboxs.com/pay/${id}`,
      `https://pay.codesboxs.com/pay/${id}?next=https://evil.example`,
      `https://user:pass@pay.codesboxs.com/pay/${id}`,
      `https://pay.codesboxs.com.evil.example/pay/${id}`,
      42,
    ])
      expect(trustedCheckoutUrl(cfg, id, bad)).toBeNull();
  });
});

describe("OpenAPI contract: webhook signature (base64url HMAC-SHA256 of ts.rawBody)", () => {
  const body = JSON.stringify({ id: randomUUID(), type: "order.paid" });
  const now = 1_790_000_000;
  const headers = (sig: string, ts = now, type = "order.paid") =>
    new Headers({
      "X-Paymegate-Event": type,
      "X-Paymegate-Event-Id": randomUUID(),
      "X-Paymegate-Timestamp": String(ts),
      "X-Paymegate-Signature": sig,
    });
  it("verifies an independently computed signature and rejects tampering", async () => {
    expect(
      await verifySignature(SECRET, String(now), body, sign(body, now)),
    ).toBe(true);
    expect(
      await verifySignature(SECRET, String(now), body + " ", sign(body, now)),
    ).toBe(false);
    expect(
      await verifySignature(
        "wrong_secret_value_000000",
        String(now),
        body,
        sign(body, now),
      ),
    ).toBe(false);
    expect(
      await verifySignature(SECRET, String(now + 1), body, sign(body, now)),
    ).toBe(false);
    // The ":" construction reported by the dashboard is NOT accepted (no weakening).
    expect(
      await verifySignature(
        SECRET,
        String(now),
        body,
        sign(body, now, SECRET, ":"),
      ),
    ).toBe(false);
    expect(await verifySignature(SECRET, String(now), body, "short")).toBe(
      false,
    );
  });
  it("enforces the five-minute window in both directions", async () => {
    // At exactly +300s the timestamp passes; the stub body then fails schema validation.
    expect(
      await authenticateDelivery(
        body,
        headers(sign(body, now)),
        SECRET,
        now + 300,
      ),
    ).toMatchObject({
      ok: false,
      status: 400,
      code: "invalid_event",
    });
    for (const at of [now + 301, now - 301])
      expect(
        await authenticateDelivery(body, headers(sign(body, now)), SECRET, at),
      ).toMatchObject({
        ok: false,
        status: 401,
        code: "stale_timestamp",
      });
  });
  it("rejects malformed headers and ignores other authenticated event types", async () => {
    expect(
      await authenticateDelivery(body, new Headers(), SECRET, now),
    ).toMatchObject({ ok: false, status: 400 });
    expect(
      await authenticateDelivery(
        body,
        headers(sign(body, now), now, "order.updated"),
        SECRET,
        now,
      ),
    ).toMatchObject({ ok: true, ignored: true });
  });
  it("accepts the previous secret only while it is configured (rotation)", async () => {
    const sig = sign(body, now, OLD_SECRET);
    expect(
      (
        await authenticateDelivery(
          body,
          headers(sig),
          [SECRET, OLD_SECRET],
          now + 400,
        )
      ).ok,
    ).toBe(false);
    const during = await authenticateDelivery(
      body,
      headers(sig),
      [SECRET, OLD_SECRET],
      now,
    );
    expect(during).toMatchObject({ ok: false, code: "invalid_event" }); // signature accepted
    expect(
      await authenticateDelivery(body, headers(sig), [SECRET], now),
    ).toMatchObject({
      ok: false,
      status: 401,
      code: "invalid_signature",
    });
  });
});

describe("Checkout: POST /orders with server-side pricing", () => {
  it("returns the existing 503 when payments are disabled", async () => {
    env.PAYMENTS_ENABLED = "false";
    const { res } = await checkout();
    expect(res.status).toBe(503);
    expect(pmg.calls).toHaveLength(0);
  });
  it("creates one order from authoritative pricing and parses data.orderUUID / data.checkoutUrl", async () => {
    const k = await cart();
    const { res, json } = await checkout(k);
    expect(res.status).toBe(201);
    expect(
      pmg.calls.map(
        (c) => `${c.method} ${c.path.replace(/[0-9a-f]{64}/, ":id")}`,
      ),
    ).toEqual([
      "GET /v1/orders/by-external-id/:id",
      "GET /v1/payment-methods",
      "POST /v1/orders",
    ]);
    const create = pmg.calls.find((c) => c.method === "POST")!;
    expect(pmg.calls.every((c) => c.key === settings.PAYMEGATE_API_KEY)).toBe(
      true,
    );
    expect(create.body).toEqual({
      externalId: json.orderId,
      amount: "499.00",
      currency: "USD",
      paymentMethodsKeys: ["*"],
      customer: { email: "buyer@example.com", fullName: "Sandbox Buyer" },
      description: expect.stringMatching(/ — .+ × 1$/),
      backUrl: "https://codesboxs.com/checkout/success",
      expiresAt: expect.any(String),
      metadata: {
        orderId: json.orderId,
        cartId: k.id,
        workspaceId: "codesboxs-llc",
        mode: "sandbox",
      },
    });
    const providerOrder = providerOrderFor(String(json.orderId));
    expect(json.checkoutUrl).toBe(
      `https://pay.codesboxs.com/pay/${providerOrder.orderUUID}`,
    );
    expect(
      ctx.row(
        "SELECT status,amount_minor,mode,provider_checkout_id FROM orders",
      ),
    ).toEqual({
      status: "checkout_created",
      amount_minor: 49900,
      mode: "sandbox",
      provider_checkout_id: providerOrder.orderUUID,
    });
    expect(ctx.row("SELECT state FROM payment_ledger_orders")).toEqual({
      state: "pending",
    });
    expect(
      ctx.row("SELECT status,provider_reference FROM payment_attempts"),
    ).toEqual({
      status: "created",
      provider_reference: providerOrder.orderUUID,
    });
  });
  it("rejects an undocumented response envelope (data.order) and never redirects", async () => {
    pmg.state.failNextCreate = "wrapped";
    const { res, json } = await checkout();
    expect(res.status).toBe(502);
    expect(json).not.toHaveProperty("checkoutUrl");
  });
  it("prevents duplicate orders and provider sessions for the same cart", async () => {
    const first = await checkout();
    const again = await checkout(first.cart);
    expect(again.res.status).toBe(201);
    expect(again.json.checkoutUrl).toBe(first.json.checkoutUrl);
    expect(again.json.accessKey).toBe(first.json.accessKey);
    expect(pmg.calls.filter((c) => c.method === "POST")).toHaveLength(1);
    expect(ctx.count("SELECT count(*) AS n FROM orders")).toBe(1);
    expect(ctx.count("SELECT count(*) AS n FROM payment_attempts")).toBe(1);
  });
  it("keeps quote-only services on the existing request flow", async () => {
    const { res } = await checkout(
      await cart([{ service: "web-development", quantity: 1 }]),
    );
    expect(res.status).toBe(409);
    expect(ctx.count("SELECT count(*) AS n FROM orders")).toBe(0);
  });
  it("recovers an order created before a network failure instead of creating another", async () => {
    pmg.state.failNextCreate = "network";
    const first = await checkout();
    expect(first.res.status).toBe(502);
    expect(ctx.row("SELECT status FROM payment_attempts")).toEqual({
      status: "pending",
    });
    ctx.sql.exec("UPDATE payment_attempts SET claimed_at=0");
    const retry = await checkout(first.cart);
    expect(retry.res.status).toBe(201);
    expect(pmg.calls.filter((c) => c.method === "POST")).toHaveLength(1);
    expect(pmg.orders.size).toBe(1);
  });
  it("never blindly recreates when a non-reusable provider order shares the externalId", async () => {
    pmg.state.failNextCreate = "network";
    const first = await checkout();
    // The provider order exists but can no longer be reused (e.g. expired).
    providerOrderFor(String(ctx.row("SELECT id FROM orders")!.id)).status =
      "EXPIRED";
    ctx.sql.exec("UPDATE payment_attempts SET claimed_at=0");
    const retry = await checkout(first.cart);
    expect(retry.res.status).toBe(409);
    expect(pmg.calls.filter((c) => c.method === "POST")).toHaveLength(1);
    expect(ctx.row("SELECT status FROM payment_attempts")).toEqual({
      status: "failed",
    });
  });
  it("never redirects to an untrusted URL such as the merchant login", async () => {
    pmg.state.failNextCreate = "login";
    const { res, json } = await checkout();
    expect(res.status).toBe(502);
    expect(json).not.toHaveProperty("checkoutUrl");
    expect(ctx.row("SELECT status FROM payment_attempts")).toEqual({
      status: "failed",
    });
  });
  it("verifies GET /payment-methods availability and same-currency minimums before creating", async () => {
    env.PAYMEGATE_PAYMENT_METHODS = "stripe,bank_transfer";
    expect((await checkout()).res.status).toBe(409); // configured key not AVAILABLE
    resetPaymentMethodsCache();
    env.PAYMEGATE_PAYMENT_METHODS = "stripe";
    pmg.state.methods = [
      {
        key: "stripe",
        minimumAmount: "500.00",
        minimumCurrency: "USD",
        status: "AVAILABLE",
      },
    ];
    expect((await checkout()).res.status).toBe(409); // $499 below the $500 minimum
    resetPaymentMethodsCache();
    pmg.state.methods = [
      {
        key: "stripe",
        minimumAmount: "1.00",
        minimumCurrency: "EUR",
        status: "AVAILABLE",
      },
    ];
    expect((await checkout()).res.status).toBe(409); // minimum in another currency is not converted
    expect(pmg.calls.filter((c) => c.method === "POST")).toHaveLength(0);
    resetPaymentMethodsCache();
    pmg.state.methods = [
      {
        key: "stripe",
        minimumAmount: "499.00",
        minimumCurrency: "USD",
        status: "AVAILABLE",
      },
    ];
    expect((await checkout()).res.status).toBe(201);
  });
  it("enforces the configured merchant identity on authenticated responses", async () => {
    env.PAYMEGATE_MERCHANT_ID = "merchant_someone_else";
    const { res } = await checkout();
    expect(res.status).toBe(502);
  });
});

describe("Webhook: https://codesboxs.com/webhooks/paymegate", () => {
  it("applies a verified, provider-confirmed payment atomically and starts onboarding once", async () => {
    const { orderId, accessKey, uuid } = await createdOrder();
    const event = settle(uuid);
    expect((await deliver(event)).status).toBe(200);
    expect(ctx.row("SELECT status FROM orders")).toEqual({ status: "paid" });
    expect(
      ctx.row("SELECT state,payment_id FROM payment_ledger_orders"),
    ).toEqual({
      state: "paid",
      payment_id: event.transactionUUID,
    });
    expect(
      ctx.row(
        "SELECT status,refund_status,amount_minor,transaction_ref,received_amount,received_currency FROM payment_records",
      ),
    ).toEqual({
      status: "paid",
      refund_status: "none",
      amount_minor: 49900,
      transaction_ref: "provider_ref",
      received_amount: "499.00",
      received_currency: "USD",
    });
    expect(ctx.row("SELECT status FROM payment_attempts")).toEqual({
      status: "verified",
    });
    expect(ctx.row("SELECT state FROM service_fulfillments")).toEqual({
      state: "onboarding",
    });
    expect(inbox()).toEqual([{ status: "applied", detail: "" }]);
    // Authenticated confirmation call was made for this order.
    expect(
      pmg.calls.some(
        (c) => c.method === "GET" && c.path === `/v1/orders/${uuid}`,
      ),
    ).toBe(true);
    expect(
      ctx.sql
        .prepare("SELECT kind,recipient,status FROM email_outbox ORDER BY kind")
        .all(),
    ).toEqual([
      {
        kind: "admin-payment-verified",
        recipient: "codexstechnology@gmail.com",
        status: "pending",
      },
      {
        kind: "onboarding-instructions",
        recipient: "buyer@example.com",
        status: "pending",
      },
      {
        kind: "payment-confirmation",
        recipient: "buyer@example.com",
        status: "pending",
      },
    ]);
    expect(
      await (await post("/guest/status", { id: orderId, accessKey })).json(),
    ).toMatchObject({
      status: "paid",
      paid: true,
      fulfillment: "onboarding",
      message: "Paid — Onboarding",
    });
    expect(
      (await post("/guest/status", { id: orderId, accessKey: "0".repeat(64) }))
        .status,
    ).toBe(404);
  });
  it("keeps the internal /api alias working with identical verification", async () => {
    const { uuid } = await createdOrder();
    expect(
      (await deliver(settle(uuid), { path: "/api/payments/paymegate/webhook" }))
        .status,
    ).toBe(200);
    expect(ctx.row("SELECT status FROM orders")).toEqual({ status: "paid" });
  });
  it("records differing settlement exactly (crypto, other currency) without blocking", async () => {
    const { uuid } = await createdOrder();
    const event = settle(uuid, {
      receivedAmount: "498.123456789012345678",
      receivedCurrency: "USDT",
    });
    expect((await deliver(event)).status).toBe(200);
    expect(inbox()).toEqual([
      { status: "applied", detail: "settlement_differs" },
    ]);
    expect(
      ctx.row(
        "SELECT amount_minor,received_amount,received_currency FROM payment_records",
      ),
    ).toEqual({
      amount_minor: 49900,
      received_amount: "498.123456789012345678",
      received_currency: "USDT",
    });
  });
  it("never repeats fulfillment for duplicate events or duplicate transactions", async () => {
    const { uuid } = await createdOrder();
    const event = settle(uuid);
    expect((await deliver(event)).status).toBe(200);
    expect((await deliver(event)).status).toBe(200); // same event ID
    expect((await deliver({ ...event, id: randomUUID() })).status).toBe(200); // same transaction, new ID
    expect(inbox()).toEqual([
      { status: "applied", detail: "" },
      { status: "duplicate", detail: "duplicate_transaction" },
    ]);
    expect(ctx.count("SELECT count(*) AS n FROM payment_ledger_events")).toBe(
      1,
    );
    expect(ctx.count("SELECT count(*) AS n FROM email_outbox")).toBe(3);
    expect(ctx.count("SELECT count(*) AS n FROM service_fulfillments")).toBe(1);
    expect(ctx.count("SELECT count(*) AS n FROM payment_records")).toBe(1);
  });
  it("quarantines a transaction already recorded for another order", async () => {
    const a = await createdOrder();
    const first = settle(a.uuid);
    await deliver(first);
    const b = await createdOrder();
    const reused = settle(b.uuid);
    pmg.orders.get(b.uuid)!.paidTransactionUUID = first.transactionUUID;
    expect(
      (await deliver({ ...reused, transactionUUID: first.transactionUUID }))
        .status,
    ).toBe(200);
    expect(inbox().at(-1)).toEqual({
      status: "review",
      detail: "transaction_already_recorded",
    });
    expect(ctx.row("SELECT status FROM orders WHERE id=?", b.orderId)).toEqual({
      status: "checkout_created",
    });
  });
  it("requires verified settlement: forced, unconfirmed or identifier-less payments are quarantined", async () => {
    const { uuid } = await createdOrder();
    const cases: [Record<string, unknown>, () => void, string][] = [
      [
        { transactionUUID: undefined },
        () => {},
        "unverified_settlement_requires_review",
      ],
      [
        { transactionRef: null },
        () => {},
        "unverified_settlement_requires_review",
      ],
      [
        {},
        () => (pmg.orders.get(uuid)!.forced = true),
        "provider_confirmation_mismatch",
      ],
      [
        {},
        () => (pmg.orders.get(uuid)!.status = "UNPAID"),
        "provider_confirmation_mismatch",
      ],
      [
        {},
        () => (pmg.orders.get(uuid)!.paidTransactionUUID = randomUUID()),
        "provider_confirmation_mismatch",
      ],
      [
        {},
        () => (pmg.orders.get(uuid)!.amount = "1.00"),
        "provider_confirmation_mismatch",
      ],
    ];
    for (const [overrides, mutate, code] of cases) {
      const event = settle(uuid, overrides);
      delete pmg.orders.get(uuid)!.forced;
      pmg.orders.get(uuid)!.amount = "499.00";
      mutate();
      expect((await deliver(event)).status).toBe(200);
      expect(inbox().at(-1)).toEqual({ status: "review", detail: code });
    }
    expect(ctx.row("SELECT status FROM orders")).toEqual({
      status: "checkout_created",
    });
    expect(ctx.count("SELECT count(*) AS n FROM service_fulfillments")).toBe(0);
    expect(ctx.count("SELECT count(*) AS n FROM email_outbox")).toBe(0);
  });
  it("treats metadata as correlation only and quarantines any inconsistency", async () => {
    const { uuid } = await createdOrder();
    const meta = () =>
      pmg.orders.get(uuid)!.metadata as Record<string, unknown>;
    const cases: [Record<string, unknown>, string][] = [
      [{ amount: "1.00" }, "amount_or_currency_mismatch"],
      [{ currency: "EUR" }, "amount_or_currency_mismatch"],
      [{ livemode: true }, "mode_mismatch"],
      [{ metadata: { ...meta(), mode: "production" } }, "correlation_mismatch"],
      [
        { metadata: { ...meta(), workspaceId: "other" } },
        "correlation_mismatch",
      ],
      [
        { metadata: { ...meta(), cartId: "f".repeat(64) } },
        "correlation_mismatch",
      ],
      [{ externalId: "e".repeat(64) }, "unknown_provider_order"],
      [{ orderUUID: randomUUID() }, "unknown_provider_order"],
    ];
    for (const [overrides, code] of cases) {
      expect((await deliver(settle(uuid, overrides))).status).toBe(200);
      expect(inbox().at(-1)).toEqual({ status: "review", detail: code });
    }
    expect(ctx.row("SELECT status FROM orders")).toEqual({
      status: "checkout_created",
    });
  });
  it("accepts sandbox events with livemode=false", async () => {
    const { uuid } = await createdOrder();
    expect((await deliver(settle(uuid, { livemode: false }))).status).toBe(200);
    expect(ctx.row("SELECT status FROM orders")).toEqual({ status: "paid" });
  });
  it("isolates production from sandbox events (livemode=false)", async () => {
    Object.assign(env, {
      PAYMEGATE_MODE: "production",
      PAYMEGATE_API_KEY: "pmg_live_unit_only_key_0001",
    });
    const { uuid } = await createdOrder();
    expect((await deliver(settle(uuid, { livemode: false }))).status).toBe(200);
    expect(inbox().at(-1)).toEqual({
      status: "review",
      detail: "mode_mismatch",
    });
    expect(ctx.row("SELECT status,mode FROM orders")).toEqual({
      status: "checkout_created",
      mode: "production",
    });
  });
  it("rejects bad signatures, the colon construction and stale timestamps without storing", async () => {
    const { uuid } = await createdOrder();
    const event = settle(uuid);
    expect(
      (await deliver(event, { secret: "attacker_secret_value_0000" })).status,
    ).toBe(401);
    expect(
      (await deliver(event, { ts: Math.floor(Date.now() / 1000) - 600 }))
        .status,
    ).toBe(401);
    expect((await deliver(event, { separator: ":" })).status).toBe(401);
    expect(ctx.count("SELECT count(*) AS n FROM payment_webhook_inbox")).toBe(
      0,
    );
    expect(ctx.row("SELECT status FROM orders")).toEqual({
      status: "checkout_created",
    });
    // Sandbox-only diagnostic identifies which construction a rejected delivery used.
    const logged = warn.mock.calls.map((c) => String(c[0])).join("\n");
    expect(logged).toContain('"diagnostic":"colon_separator_matches"');
    expect(logged).not.toContain(SECRET);
  });
  it("still rejects in live mode while logging only the separator diagnostic", async () => {
    Object.assign(env, {
      PAYMEGATE_MODE: "live",
      PAYMEGATE_API_KEY: "pmg_live_unit_only_key_0001",
    });
    const { uuid } = await createdOrder();
    const event = settle(uuid);
    expect((await deliver(event, { separator: ":" })).status).toBe(401);
    const logged = warn.mock.calls.map((c) => String(c[0])).join("\n");
    expect(logged).toContain('"diagnostic":"colon_separator_matches"');
    expect(logged).not.toContain(SECRET);
    expect(logged).not.toContain(String(event.customerEmail));
    expect(ctx.count("SELECT count(*) AS n FROM payment_webhook_inbox")).toBe(
      0,
    );
    expect(ctx.row("SELECT status FROM orders")).toEqual({
      status: "checkout_created",
    });
    // The official "." construction is applied normally in live mode.
    expect((await deliver(event)).status).toBe(200);
    expect(ctx.row("SELECT status,mode FROM orders")).toEqual({
      status: "paid",
      mode: "production",
    });
  });
  it("admin diagnostics prove API authentication without creating orders", async () => {
    const { payMeGateDiagnostics } = await import("../src/worker/paymegate");
    delete (env as Partial<Env>).PAYMEGATE_PAYMENT_METHODS;
    const report = await payMeGateDiagnostics(env);
    expect(report).toMatchObject({
      mode: "sandbox",
      problems: ["PAYMEGATE_PAYMENT_METHODS"],
      webhookSecretsConfigured: 1,
      api: {
        authenticated: true,
        methods: [
          { key: "stripe", minimumAmount: "1.00", minimumCurrency: "USD" },
          { key: "crypto", minimumAmount: "5.00", minimumCurrency: "USD" },
        ],
      },
    });
    expect(report.webhook).toEqual({
      configured: true,
      url: "https://codesboxs.com/webhooks/paymegate",
      urlMatches: true,
      events: ["order.paid"],
      status: "active",
    });
    expect(JSON.stringify(report)).not.toContain(settings.PAYMEGATE_API_KEY);
    // Read-only: no order creation, no webhook modification.
    expect(pmg.calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      "GET /v1/payment-methods",
      "GET /v1/webhook",
    ]);
    env.PAYMEGATE_API_KEY = "pmg_test_revoked_key_000001";
    pmg.fetchMock.mockImplementationOnce(
      async () =>
        new Response(
          JSON.stringify({
            success: false,
            error: { code: "invalid_api_key", message: "x", requestId: "r" },
          }),
          { status: 401 },
        ),
    );
    expect((await payMeGateDiagnostics(env)).api).toEqual({
      authenticated: false,
      code: "paymegate_401_invalid_api_key",
    });
  });
  it("admin diagnostics require an administrator session", async () => {
    const res = await api.request(
      "http://localhost/admin/payments/diagnostics",
      {},
      env,
    );
    expect(res.status).toBe(401);
    expect(pmg.calls).toHaveLength(0);
  });
  it("supports secret rotation through configuration only", async () => {
    const { uuid } = await createdOrder();
    Object.assign(env, {
      PAYMEGATE_WEBHOOK_SECRET: "whsec_rotated_new_secret_value_01",
      PAYMEGATE_WEBHOOK_SECRET_PREVIOUS: SECRET,
    });
    expect((await deliver(settle(uuid), { secret: SECRET })).status).toBe(200); // old secret, overlap window
    expect(ctx.row("SELECT status FROM orders")).toEqual({ status: "paid" });
    delete env.PAYMEGATE_WEBHOOK_SECRET_PREVIOUS;
    expect((await deliver(settle(uuid), { secret: SECRET })).status).toBe(401); // rotation complete
    expect(
      (
        await deliver(settle(uuid), {
          secret: "whsec_rotated_new_secret_value_01",
        })
      ).status,
    ).toBe(200);
  });
  it("rejects an event ID replayed with a different payload", async () => {
    const { uuid } = await createdOrder();
    const event = settle(uuid);
    await deliver(event);
    expect(
      (await deliver({ ...event, paidAt: "2030-01-01T00:00:00.000Z" })).status,
    ).toBe(409);
  });
  it("retries transient provider failures (non-200) instead of losing the event", async () => {
    const { uuid } = await createdOrder();
    const event = settle(uuid);
    pmg.fetchMock.mockImplementationOnce(async () => {
      throw new TypeError("provider unreachable");
    });
    expect((await deliver(event)).status).toBe(500);
    expect(inbox()).toEqual([{ status: "received", detail: "" }]);
    expect((await deliver(event)).status).toBe(200); // PayMeGate retry
    expect(ctx.row("SELECT status FROM orders")).toEqual({ status: "paid" });
  });
  it("limits body size and returns 503 when not configured", async () => {
    const { uuid } = await createdOrder();
    expect(
      (await deliver(settle(uuid), { raw: "x".repeat(70000) })).status,
    ).toBe(413);
    delete env.PAYMEGATE_WEBHOOK_SECRET;
    expect((await deliver(settle(uuid))).status).toBe(503);
  });
  it("keeps notifications queued when email delivery is not configured", async () => {
    const { uuid } = await createdOrder();
    await deliver(settle(uuid));
    await processOutbox(env); // RESEND_API_KEY missing
    expect(
      ctx.count(
        "SELECT count(*) AS n FROM email_outbox WHERE status='pending'",
      ),
    ).toBe(3);
    expect(ctx.row("SELECT status FROM orders")).toEqual({ status: "paid" });
  });
});

describe("Reconciliation: GET /orders/{orderUUID}", () => {
  async function created() {
    const { json } = await checkout();
    return providerOrderFor(String(json.orderId));
  }
  it("applies a missed verified payment", async () => {
    const order = await created();
    Object.assign(order, {
      status: "PAID",
      paidTransactionUUID: randomUUID(),
      transactionRef: "r",
    });
    expect(await reconcilePayMeGate(env)).toEqual({ checked: 1, applied: 1 });
    expect(ctx.row("SELECT status FROM orders")).toEqual({ status: "paid" });
    expect(ctx.row("SELECT state FROM service_fulfillments")).toEqual({
      state: "onboarding",
    });
    ctx.sql.exec("UPDATE payment_attempts SET last_checked_at=0");
    expect(await reconcilePayMeGate(env)).toEqual({ checked: 1, applied: 0 });
  });
  it("never fulfills a forced payment", async () => {
    const order = await created();
    Object.assign(order, {
      status: "PAID",
      forced: true,
      paidTransactionUUID: randomUUID(),
    });
    expect(await reconcilePayMeGate(env)).toEqual({ checked: 1, applied: 0 });
    expect(ctx.row("SELECT status FROM orders")).toEqual({
      status: "checkout_created",
    });
    expect(ctx.count("SELECT count(*) AS n FROM service_fulfillments")).toBe(0);
  });
  it("marks expired checkouts cancelled without fulfillment", async () => {
    const order = await created();
    order.status = "EXPIRED";
    await reconcilePayMeGate(env);
    expect(ctx.row("SELECT status FROM orders")).toEqual({
      status: "cancelled",
    });
    expect(ctx.row("SELECT status FROM payment_attempts")).toEqual({
      status: "cancelled",
    });
    expect(ctx.count("SELECT count(*) AS n FROM service_fulfillments")).toBe(0);
  });
  it("records failed payments", async () => {
    const order = await created();
    order.status = "FAILED";
    await reconcilePayMeGate(env);
    expect(ctx.row("SELECT status FROM orders")).toEqual({ status: "failed" });
  });
  it("tracks recorded partial then full refunds (accounting records only)", async () => {
    const order = await created();
    await deliver(settle(order.orderUUID));
    Object.assign(order, { refundStatus: "PARTIAL", refundedAmount: "100.00" });
    ctx.sql.exec("UPDATE payment_attempts SET last_checked_at=0");
    await reconcilePayMeGate(env);
    expect(ctx.row("SELECT status FROM orders")).toEqual({
      status: "partially_refunded",
    });
    expect(
      ctx.row("SELECT state,refunded_minor FROM payment_ledger_orders"),
    ).toEqual({
      state: "partially_refunded",
      refunded_minor: 10000,
    });
    expect(ctx.row("SELECT state FROM service_fulfillments")).toEqual({
      state: "review_required",
    });
    Object.assign(order, { refundStatus: "FULL", refundedAmount: "499.00" });
    ctx.sql.exec("UPDATE payment_attempts SET last_checked_at=0");
    await reconcilePayMeGate(env);
    expect(ctx.row("SELECT status FROM orders")).toEqual({
      status: "refunded",
    });
    expect(ctx.row("SELECT refund_status FROM payment_records")).toEqual({
      refund_status: "full",
    });
    expect(ctx.row("SELECT state FROM service_fulfillments")).toEqual({
      state: "cancelled",
    });
    // The refunds endpoint is never called: it records refunds but transfers no funds.
    expect(pmg.calls.some((c) => c.path.endsWith("/refunds"))).toBe(false);
  });
  it("still reconciles existing orders after checkout is disabled (rollback-safe)", async () => {
    const order = await created();
    env.PAYMENTS_ENABLED = "false";
    Object.assign(order, {
      status: "PAID",
      paidTransactionUUID: randomUUID(),
      transactionRef: "r",
    });
    expect(await reconcilePayMeGate(env)).toEqual({ checked: 1, applied: 1 });
    expect(ctx.row("SELECT status FROM orders")).toEqual({ status: "paid" });
    // It only reads provider state; it never creates provider orders.
    expect(pmg.calls.filter((c) => c.method === "POST")).toHaveLength(1);
  });
  it("does nothing when the PayMeGate configuration is incomplete", async () => {
    await created();
    delete env.PAYMEGATE_API_KEY;
    pmg.calls.length = 0;
    expect(await reconcilePayMeGate(env)).toEqual({ checked: 0, applied: 0 });
    expect(pmg.calls).toHaveLength(0);
  });
});

describe("Owner verification order (restricted, capped, private)", () => {
  /** Route under test with a real admin session object, as set by the session middleware. */
  function adminApp() {
    const app = new Hono<AppEnv>();
    app.use("*", async (c, next) => {
      c.set("session", {
        admin_id: "admin-1",
        email: "owner@example.com",
        csrf_token: "x",
        token_hash: "y",
      });
      await next();
    });
    app.post("/verify", createVerificationCheckout);
    return (body: unknown) =>
      app.request(
        "http://localhost/verify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        env,
      );
  }
  beforeEach(() => {
    env.PAYMENTS_ENABLED = "false"; // public checkout stays off throughout
    env.PAYMEGATE_VERIFICATION_ENABLED = "true";
    // Audit entries reference a real administrator (foreign key), as in production.
    ctx.sql.exec(
      "INSERT INTO admins(id,email,password_hash) VALUES('admin-1','owner@example.com','unused')",
    );
  });
  it("is disabled unless explicitly enabled", async () => {
    delete env.PAYMEGATE_VERIFICATION_ENABLED;
    expect((await adminApp()({ amount: "1.00" })).status).toBe(503);
    expect(pmg.calls).toHaveLength(0);
  });
  it("requires an administrator session on the real route", async () => {
    const res = await post("/admin/payments/verification", { amount: "1.00" });
    expect(res.status).toBe(401);
    expect(pmg.calls).toHaveLength(0);
  });
  it("enforces the US$5.00 hard cap", async () => {
    const verify = adminApp();
    for (const amount of ["5.01", "0", "0.00", "100", "1.001", "-1"])
      expect((await verify({ amount })).status, amount).toBe(400);
    expect(ctx.count("SELECT count(*) AS n FROM orders")).toBe(0);
  });
  it("creates one private order through the verified pipeline while public checkout stays off", async () => {
    const verify = adminApp();
    const res = await verify({ amount: "1.00" });
    expect(res.status).toBe(201);
    const json = (await res.json()) as Record<string, string>;
    const create = pmg.calls.find((c) => c.method === "POST")!;
    expect(create.body).toMatchObject({
      externalId: json.orderId,
      amount: "1.00",
      currency: "USD",
      paymentMethodsKeys: ["*"],
      customer: { email: "owner@example.com" },
      metadata: {
        orderId: json.orderId,
        cartId: null,
        workspaceId: "codesboxs-llc",
      },
    });
    expect(json.checkoutUrl).toMatch(/^https:\/\/pay\.codesboxs\.com\/pay\//);
    expect(ctx.row("SELECT purpose,amount_minor,status FROM orders")).toEqual({
      purpose: "verification",
      amount_minor: 100,
      status: "checkout_created",
    });
    // Duplicate prevention: same amount reuses the open order, different amount is refused.
    const again = await verify({ amount: "1.00" });
    expect(again.status).toBe(201);
    expect(((await again.json()) as Record<string, string>).checkoutUrl).toBe(
      json.checkoutUrl,
    );
    expect((await verify({ amount: "2.00" })).status).toBe(409);
    expect(pmg.calls.filter((c) => c.method === "POST")).toHaveLength(1);
    // Public checkout is still closed.
    expect((await checkout()).res.status).toBe(503);
    // Paid verification: settlement confirmed, no onboarding, no customer email.
    const providerOrder = providerOrderFor(json.orderId);
    expect((await deliver(settle(providerOrder.orderUUID))).status).toBe(200);
    expect(ctx.row("SELECT status FROM orders")).toEqual({ status: "paid" });
    expect(ctx.count("SELECT count(*) AS n FROM service_fulfillments")).toBe(0);
    expect(
      ctx.sql.prepare("SELECT kind,recipient FROM email_outbox").all(),
    ).toEqual([
      {
        kind: "admin-payment-verified",
        recipient: "codexstechnology@gmail.com",
      },
    ]);
    expect(
      await (
        await post("/guest/status", {
          id: json.orderId,
          accessKey: json.accessKey,
        })
      ).json(),
    ).toMatchObject({
      paid: true,
      request_type: "payment_verification",
      message: "Paid — verification order (no service delivery)",
    });
    // A new verification can start once the previous one is no longer open.
    expect((await verify({ amount: "1.00" })).status).toBe(201);
    expect(
      ctx.count(
        "SELECT count(*) AS n FROM orders WHERE purpose='verification'",
      ),
    ).toBe(2);
  });
  it("records other authenticated event types as ignored, never applied", async () => {
    const raw = JSON.stringify({ id: randomUUID(), type: "payment.created" });
    const ts = Math.floor(Date.now() / 1000);
    const res = await pagesWorker.fetch(
      new Request("https://codesboxs.com/webhooks/paymegate", {
        method: "POST",
        headers: {
          "X-Paymegate-Event": "payment.created",
          "X-Paymegate-Event-Id": randomUUID(),
          "X-Paymegate-Timestamp": String(ts),
          "X-Paymegate-Signature": sign(raw, ts),
        },
        body: raw,
      }),
      env,
      context,
    );
    expect(res.status).toBe(200);
    expect(inbox()).toEqual([
      { status: "ignored", detail: "unsupported_event_type" },
    ]);
  });
});
