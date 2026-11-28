import { Hono } from "hono";
import { services } from "../shared/content";
import {
  convertMinor,
  displayCurrencies,
  validateRates,
  type DisplayCurrency,
  type RateSnapshot,
} from "../shared/currency";
import {
  guestRequestSchema,
  selectionSchema,
  type CartItem,
  type Selection,
} from "../shared/guest-commerce";
import { currencySnapshot } from "./currency";
import { displayItems } from "../shared/commerce-display";
import { servicePricing } from "../shared/service-pricing";
import { digest, randomToken, rateLimit, verifyTurnstile } from "./security";
import type { AppEnv } from "./types";
import { onlineOrderStatus } from "./order-status";

export const guestCommerce = new Hono<AppEnv>();
type Package = {
  id: string;
  title: string;
  service_slug: string;
  billing_interval: string;
  amount_minor: number | null;
  currency: string;
  billing: string;
  delivery: string;
  exclusions: string;
  description: string;
  features_json: string;
};
async function packages(db: D1Database) {
  return (
    await db
      .prepare(
        "SELECT id,title,service_slug,billing_interval,amount_minor,currency,billing,delivery,exclusions,description,features_json FROM pricing_packages WHERE approved=1 AND status='published' ORDER BY id",
      )
      .all<Package>()
  ).results;
}
/** Authoritative server-side pricing for a selection; reused by online checkout. */
export async function resolve(
  db: D1Database,
  input: Selection,
): Promise<CartItem[]> {
  const approved = await packages(db);
  return input.map((item) => {
    const service = services.find((s) => s.slug === item.service);
    if (!service) throw new Error("Unknown service");
    const p = item.packageId
      ? approved.find(
          (p) => p.id === item.packageId && p.service_slug === item.service,
        )
      : undefined;
    if (item.packageId && !p)
      throw new Error("Package is not approved or available");
    return {
      ...item,
      title: p ? `${service.title} — ${p.title}` : service.title,
      amountMinor: p && p.billing !== "quote" ? p.amount_minor : null,
      currency: p?.currency || "USD",
      billing: p?.billing || "quote",
      delivery: p?.delivery || servicePricing[item.service].delivery,
      exclusions: p?.exclusions || servicePricing[item.service].exclusions,
    };
  });
}
/** Public display rates; works even before commerce tables exist in D1. */
guestCommerce.get("/rates", async (c) => {
  let fx: RateSnapshot | null = null;
  try {
    if (c.env.DB) fx = await currencySnapshot(c.env.DB);
  } catch {
    /* D1 rate cache unavailable; fall back to the edge-cached provider. */
  }
  if (!fx) {
    try {
      const response = await fetch("https://open.er-api.com/v6/latest/USD", {
        signal: AbortSignal.timeout(6000),
        cf: { cacheTtl: 3600, cacheEverything: true },
      } as RequestInit);
      if (response.ok) fx = validateRates(await response.json());
    } catch {
      /* Never invent rates. */
    }
  }
  if (!fx) return c.json({ error: "Rates unavailable" }, 503);
  return c.json({ ...fx, attribution: "Rates By ExchangeRate-API" });
});
guestCommerce.get("/catalog", async (c) => {
  const approved = await packages(c.env.DB);
  const selected = c.req.query("currency") || "USD";
  if (!displayCurrencies.includes(selected as DisplayCurrency))
    return c.json({ error: "Unsupported display currency" }, 400);
  const fx = await currencySnapshot(c.env.DB);
  return c.json({
    services: services.map((s) => ({
      slug: s.slug,
      title: s.title,
      summary: s.summary,
      deliverables: s.deliverables,
    })),
    packages: approved.map((p) => ({
      ...p,
      displayCurrency: selected,
      displayMinor:
        p.amount_minor === null
          ? null
          : p.currency === selected
            ? p.amount_minor
            : fx && displayCurrencies.includes(p.currency as DisplayCurrency)
              ? convertMinor(
                  p.amount_minor,
                  p.currency as DisplayCurrency,
                  selected as DisplayCurrency,
                  fx.rates,
                )
              : null,
    })),
    currencies: displayCurrencies,
    rateUpdatedAt: fx?.updatedAt || null,
    rateStale: fx?.stale || false,
    conversionAvailable: !!fx,
    settlementCurrencies: [],
    paymentEnabled: false,
    attribution: "Rates By ExchangeRate-API",
    attributionUrl: "https://www.exchangerate-api.com",
    notice:
      "Display conversions are estimates only. No online payment provider is active. Final currency, taxes and fees require a written agreement.",
  });
});
guestCommerce.post("/carts", async (c) => {
  if (!(await rateLimit(c, "guest-cart", 20, 3600)))
    return c.json({ error: "Please try later" }, 429);
  const parsed = selectionSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: "Invalid cart selection" }, 400);
  let items: CartItem[];
  try {
    items = await resolve(c.env.DB, parsed.data);
  } catch {
    return c.json({ error: "Unknown service or unavailable package" }, 400);
  }
  const id = randomToken(),
    key = randomToken(),
    fingerprint = await digest(JSON.stringify(items));
  await c.env.DB.prepare(
    "INSERT INTO guest_carts(id,access_hash,items_json,fingerprint,expires_at) VALUES(?,?,?,?,?)",
  )
    .bind(
      id,
      await digest(key),
      JSON.stringify(items),
      fingerprint,
      Math.floor(Date.now() / 1000) + 86400,
    )
    .run();
  return c.json(
    { id, key, items, expiresIn: 86400, paymentEnabled: false },
    201,
  );
});
// Read-only authoritative estimate; never accepts client prices or creates an order.
guestCommerce.post("/estimate", async (c) => {
  if (!(await rateLimit(c, "guest-estimate", 120, 3600)))
    return c.json({ error: "Please try later" }, 429);
  const currency = c.req.query("currency") || "USD";
  if (!displayCurrencies.includes(currency as DisplayCurrency))
    return c.json({ error: "Unsupported display currency" }, 400);
  const parsed = selectionSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: "Invalid selection" }, 400);
  try {
    const items = await resolve(c.env.DB, parsed.data);
    const fx = await currencySnapshot(c.env.DB);
    return c.json({
      items: displayItems(items, currency as DisplayCurrency, fx),
      rateUpdatedAt: fx?.updatedAt || null,
      rateStale: fx?.stale || false,
      conversionAvailable: !!fx,
      paymentEnabled: false,
    });
  } catch {
    return c.json(
      { error: "Package unavailable; refresh your selection" },
      409,
    );
  }
});
guestCommerce.post("/requests", async (c) => {
  if (!(await rateLimit(c, "guest-request", 5, 3600)))
    return c.json({ error: "Please try later" }, 429);
  const parsed = guestRequestSchema.safeParse(await c.req.json());
  if (!parsed.success)
    return c.json(
      { error: "Check the required billing and consent fields" },
      400,
    );
  const d = parsed.data;
  const cart = await c.env.DB.prepare(
    "SELECT items_json,fingerprint,expires_at FROM guest_carts WHERE id=? AND access_hash=?",
  )
    .bind(d.cartId, await digest(d.cartKey))
    .first<{ items_json: string; fingerprint: string; expires_at: number }>();
  if (!cart || cart.expires_at <= Date.now() / 1000)
    return c.json(
      { error: "Cart expired or inaccessible; review your selection again" },
      404,
    );
  const current = await resolve(
    c.env.DB,
    JSON.parse(cart.items_json) as Selection,
  ).catch(() => null);
  if (!current || (await digest(JSON.stringify(current))) !== cart.fingerprint)
    return c.json(
      { error: "Pricing changed. Review your cart before resubmitting." },
      409,
    );
  const idem = await digest(
    JSON.stringify({ ...d, turnstileToken: undefined, website: undefined }),
  );
  const existing = await c.env.DB.prepare(
    "SELECT id,idempotency_hash FROM guest_requests WHERE cart_id=?",
  )
    .bind(d.cartId)
    .first<{ id: string; idempotency_hash: string }>();
  if (existing && existing.idempotency_hash !== idem)
    return c.json(
      { error: "Cart already submitted with different details" },
      409,
    );
  if (!(await verifyTurnstile(c, d.turnstileToken, d.website)))
    return c.json(
      {
        error:
          "Security verification unavailable or failed. Contact support by email.",
      },
      422,
    );
  // Access key is derived from a private cart key and never placed in URLs or logs.
  const accessKey = await digest("guest-request:" + d.cartKey);
  if (existing)
    return c.json({
      id: existing.id,
      accessKey,
      stored: true,
      paid: false,
      replayed: true,
      message: "Request already saved. No duplicate or payment created.",
    });
  const id = randomToken(),
    customer = randomToken();
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO guest_customers(id,name,email,country,company) VALUES(?,?,?,?,?)",
      ).bind(customer, d.name, d.email, d.country, d.company),
      c.env.DB.prepare(
        "INSERT INTO guest_requests(id,customer_id,cart_id,access_hash,request_type,display_currency,policies_version,notes,idempotency_hash) VALUES(?,?,?,?,?,?,?,?,?)",
      ).bind(
        id,
        customer,
        d.cartId,
        await digest(accessKey),
        d.requestType,
        d.currency,
        "owner-review-2026-10-23",
        d.notes,
        idem,
      ),
      c.env.DB.prepare(
        "INSERT INTO audit_logs(id,action,entity,entity_id) VALUES(?,?,?,?)",
      ).bind(randomToken(), "guest_request_received", "guest_requests", id),
      ...current.map((item) =>
        c.env.DB.prepare(
          "INSERT INTO guest_request_items(id,request_id,package_id,service_slug,title,quantity,amount_minor,currency,billing,snapshot_json) VALUES(?,?,?,?,?,?,?,?,?,?)",
        ).bind(
          randomToken(),
          id,
          item.packageId || null,
          item.service,
          item.title,
          item.quantity,
          item.amountMinor,
          item.currency,
          item.billing,
          JSON.stringify(item),
        ),
      ),
    ]);
  } catch {
    const replay = await c.env.DB.prepare(
      "SELECT id,idempotency_hash FROM guest_requests WHERE cart_id=?",
    )
      .bind(d.cartId)
      .first<{ id: string; idempotency_hash: string }>();
    if (replay?.idempotency_hash === idem)
      return c.json({
        id: replay.id,
        accessKey,
        stored: true,
        paid: false,
        replayed: true,
        message: "Request saved once. No payment created.",
      });
    return c.json(
      { error: "Request could not be saved. Contact support before retrying." },
      409,
    );
  }
  return c.json(
    {
      id,
      accessKey,
      stored: true,
      paid: false,
      message:
        "Request saved for review. No order has been charged and no email delivery is claimed.",
    },
    201,
  );
});
guestCommerce.post("/status", async (c) => {
  if (!(await rateLimit(c, "guest-status", 20, 3600)))
    return c.json({ error: "Please try later" }, 429);
  const body = (await c.req.json()) as { id?: string; accessKey?: string };
  if (
    !/^[a-f0-9]{64}$/.test(body.id || "") ||
    !/^[a-f0-9]{64}$/.test(body.accessKey || "")
  )
    return c.json({ error: "Invalid reference or access key" }, 400);
  const row = await c.env.DB.prepare(
    "SELECT id,status,request_type,created_at FROM guest_requests WHERE id=? AND access_hash=?",
  )
    .bind(body.id!, await digest(body.accessKey!))
    .first();
  if (!row) {
    // Online orders use the same private reference + access-key lookup.
    const order = await onlineOrderStatus(c.env.DB, body.id!, body.accessKey!);
    if (order) return c.json(order);
    return c.json({ error: "Request not found or access denied" }, 404);
  }
  return c.json({
    ...row,
    paid: false,
    message: "This is a service inquiry, not verified payment confirmation.",
  });
});
