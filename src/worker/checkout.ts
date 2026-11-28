import type { Context } from "hono";
import { z } from "zod";
import type { AppEnv, Env } from "./types";
import { resolve } from "./guest-commerce";
import type { Selection } from "../shared/guest-commerce";
import {
  authoritativeTotal,
  nextPaymentState,
  processVerifiedWebhook,
} from "./payment-lifecycle";
import { D1PaymentStore } from "./payment-store";
import { paymentReadiness } from "./payments";
import {
  DuplicateTransaction,
  PAYMEGATE,
  PaymentRejection,
  ProviderError,
  authenticateDelivery,
  createProviderOrder,
  decimalToMinor,
  findProviderOrders,
  getProviderOrder,
  minorToDecimal,
  payMeGateConfig,
  reconciliationEvent,
  sameDecimal,
  signatureDiagnostic,
  trustedCheckoutUrl,
  verifiedPaidEvent,
  verifyPaymentMethods,
  type PayMeGateConfig,
  type ProviderOrder,
} from "./paymegate";
import type { PaymentEvent } from "./payment-lifecycle";
import { digest, randomToken, rateLimit, verifyTurnstile } from "./security";

export const checkoutSchema = z
  .object({
    cartId: z.string().regex(/^[a-f0-9]{64}$/),
    cartKey: z.string().regex(/^[a-f0-9]{64}$/),
    name: z.string().trim().min(2).max(100),
    email: z
      .email()
      .max(254)
      .transform((s) => s.toLowerCase()),
    consent: z.literal(true),
    turnstileToken: z.string().max(2048),
    website: z.string().max(200).default(""),
  })
  .strict();

type OrderRow = {
  id: string;
  status: string;
  access_hash: string | null;
  amount_minor: number;
  currency: string;
  mode: string | null;
  customer_email: string;
  customer_name: string;
  items_json: string | null;
};
type AttemptRow = {
  id: string;
  status: string;
  provider_reference: string | null;
  checkout_url: string | null;
};
const log = (event: string, detail: Record<string, unknown>) =>
  console.warn(JSON.stringify({ event, ...detail }));
const store = (env: Env) =>
  new D1PaymentStore(env.DB, { notificationEmail: env.NOTIFICATION_EMAIL });

async function latestAttempt(db: D1Database, order: string) {
  return db
    .prepare(
      "SELECT id,status,provider_reference,checkout_url FROM payment_attempts WHERE order_id=? AND provider=? ORDER BY created_at DESC,rowid DESC LIMIT 1",
    )
    .bind(order, PAYMEGATE)
    .first<AttemptRow>();
}
async function markCreated(
  db: D1Database,
  attempt: string,
  order: string,
  providerOrder: string,
  url: string,
) {
  await db.batch([
    db
      .prepare(
        "UPDATE payment_attempts SET status='created',provider_reference=?,checkout_url=?,claimed_at=NULL WHERE id=? AND status='pending'",
      )
      .bind(providerOrder, url, attempt),
    db
      .prepare(
        "UPDATE orders SET status='checkout_created',provider_checkout_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status IN ('pending','checkout_created')",
      )
      .bind(providerOrder, order),
  ]);
}

/**
 * POST /api/checkout. Feature-flagged. Server-validated cart → pending order,
 * ledger row and payment attempt → documented POST /v1/orders → trusted hosted URL.
 */
export async function createCheckout(c: Context<AppEnv>) {
  const readiness = paymentReadiness(c.env);
  if (!readiness.enabled) return c.json({ error: readiness.reason }, 503);
  const config = payMeGateConfig(c.env).config as PayMeGateConfig;
  if (!(await rateLimit(c, "paymegate-checkout", 10, 3600)))
    return c.json({ error: "Please try later" }, 429);
  const parsed = checkoutSchema.safeParse(await c.req.json());
  if (!parsed.success)
    return c.json(
      { error: "Check the required name, email and consent fields" },
      400,
    );
  const d = parsed.data;
  if (!(await verifyTurnstile(c, d.turnstileToken, d.website)))
    return c.json(
      {
        error:
          "Security verification unavailable or failed. Contact support by email.",
      },
      422,
    );
  const db = c.env.DB;
  const cart = await db
    .prepare(
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
    db,
    JSON.parse(cart.items_json) as Selection,
  ).catch(() => null);
  if (!current || (await digest(JSON.stringify(current))) !== cart.fingerprint)
    return c.json(
      { error: "Pricing changed. Review your cart before paying." },
      409,
    );
  let total: { amountMinor: number; currency: string };
  try {
    // Only approved, published, one-time packages; quote services use the request flow.
    total = authoritativeTotal(
      current.map((item) => ({
        amountMinor: item.amountMinor,
        quantity: item.quantity,
        currency: item.currency,
        approved: !!item.packageId && item.amountMinor !== null,
        billing: item.billing,
      })),
    );
  } catch {
    return c.json(
      {
        error:
          "This selection includes quote-only or non one-time items. Submit a quote or invoice request instead.",
      },
      409,
    );
  }
  const accessKey = await digest("paymegate-order:" + d.cartKey);
  const accessHash = await digest(accessKey);
  const findOrder = () =>
    db
      .prepare(
        "SELECT id,status,access_hash,amount_minor,currency,mode,customer_email,customer_name,items_json FROM orders WHERE cart_id=?",
      )
      .bind(d.cartId)
      .first<OrderRow>();
  let order = await findOrder();
  if (!order) {
    const id = randomToken();
    const packages = [
      ...new Set(current.map((i) => i.packageId).filter(Boolean)),
    ];
    try {
      await db.batch([
        db
          .prepare(
            "INSERT INTO orders(id,package_id,customer_email,amount_minor,currency,status,idempotency_key,provider,access_hash,cart_id,mode,customer_name,items_json) VALUES(?,?,?,?,?,'pending',?,?,?,?,?,?,?)",
          )
          .bind(
            id,
            packages.length === 1 ? packages[0]! : null,
            d.email,
            total.amountMinor,
            total.currency,
            `${PAYMEGATE}:cart:${d.cartId}`,
            PAYMEGATE,
            accessHash,
            d.cartId,
            config.mode,
            d.name,
            JSON.stringify(current),
          ),
        db
          .prepare(
            "INSERT INTO payment_ledger_orders(id,amount_minor,currency,state) VALUES(?,?,?,'pending')",
          )
          .bind(id, total.amountMinor, total.currency),
        db
          .prepare(
            "INSERT INTO audit_logs(id,action,entity,entity_id) VALUES(?,?,?,?)",
          )
          .bind(randomToken(), "online_order_created", "orders", id),
      ]);
    } catch {
      /* Concurrent request for the same cart won the unique cart_id; reuse it. */
    }
    order = await findOrder();
    if (!order)
      return c.json({ error: "Order could not be created. Try again." }, 409);
  }
  if (
    order.access_hash !== accessHash ||
    order.mode !== config.mode ||
    order.amount_minor !== total.amountMinor ||
    order.currency !== total.currency
  )
    return c.json({ error: "Cart already used for a different checkout" }, 409);
  if (["paid", "partially_refunded", "refunded"].includes(order.status))
    return c.json({ orderId: order.id, accessKey, paid: true });
  if (["failed", "cancelled"].includes(order.status))
    return c.json(
      {
        error:
          "This checkout has closed. Review your selection again to start a new one.",
      },
      409,
    );
  return providerCheckout(
    c,
    config,
    order,
    accessKey,
    d.cartId,
    current.map((i) => `${i.title} × ${i.quantity}`).join("; "),
  );
}

/** Hard cap for owner verification orders: US$5.00. Not configurable at runtime. */
export const VERIFICATION_MAX_MINOR = 500;
const verificationSchema = z
  .object({
    amount: z.string().regex(/^[0-9]{1,3}(?:\.[0-9]{1,2})?$/),
    email: z.email().max(254).optional(),
  })
  .strict();

/**
 * POST /api/admin/payments/verification — administrator session + CSRF only.
 * Creates one capped, private USD order through the same verified pipeline as
 * customer checkout, without enabling public checkout (PAYMENTS_ENABLED stays false).
 * Verification orders are never onboarded and send no customer emails.
 */
export async function createVerificationCheckout(c: Context<AppEnv>) {
  if (c.env.PAYMEGATE_VERIFICATION_ENABLED !== "true")
    return c.json({ error: "Payment verification is disabled." }, 503);
  const config = payMeGateConfig(c.env).config;
  if (!config)
    return c.json({ error: "PayMeGate configuration is incomplete." }, 503);
  const parsed = verificationSchema.safeParse(await c.req.json());
  if (!parsed.success)
    return c.json({ error: "Provide an amount such as 1.00" }, 400);
  let amountMinor: number;
  try {
    amountMinor = decimalToMinor(parsed.data.amount, "USD");
  } catch {
    return c.json({ error: "Invalid amount" }, 400);
  }
  if (amountMinor <= 0 || amountMinor > VERIFICATION_MAX_MINOR)
    return c.json(
      {
        error: `Verification amount must be between 0.01 and ${minorToDecimal(VERIFICATION_MAX_MINOR, "USD")} USD`,
      },
      400,
    );
  const db = c.env.DB;
  const session = c.get("session");
  const open = () =>
    db
      .prepare(
        "SELECT id,amount_minor,currency,customer_email,customer_name FROM orders WHERE purpose='verification' AND mode=? AND status IN ('pending','checkout_created') ORDER BY created_at DESC LIMIT 1",
      )
      .bind(config.mode)
      .first<CheckoutOrder>();
  let order = await open();
  let accessKey = "";
  if (order) {
    // Duplicate prevention: reuse the single open verification order.
    if (order.amount_minor !== amountMinor)
      return c.json(
        {
          error:
            "An unpaid verification order already exists for a different amount. Pay it or wait for it to expire.",
          orderId: order.id,
        },
        409,
      );
  } else {
    const id = randomToken();
    accessKey = randomToken();
    try {
      await db.batch([
        db
          .prepare(
            "INSERT INTO orders(id,customer_email,amount_minor,currency,status,idempotency_key,provider,access_hash,mode,customer_name,items_json,purpose) VALUES(?,?,?,?,'pending',?,?,?,?,?,?,'verification')",
          )
          .bind(
            id,
            parsed.data.email || session.email,
            amountMinor,
            "USD",
            `${PAYMEGATE}:verification:${id}`,
            PAYMEGATE,
            await digest(accessKey),
            config.mode,
            "CodesBoxs payment verification",
            JSON.stringify([{ verification: true }]),
          ),
        db
          .prepare(
            "INSERT INTO payment_ledger_orders(id,amount_minor,currency,state) VALUES(?,?,?,'pending')",
          )
          .bind(id, amountMinor, "USD"),
        db
          .prepare(
            "INSERT INTO audit_logs(id,admin_id,action,entity,entity_id) VALUES(?,?,?,?,?)",
          )
          .bind(
            randomToken(),
            session.admin_id,
            "verification_order_created",
            "orders",
            id,
          ),
      ]);
    } catch {
      /* A concurrent request created the single open verification order. */
      accessKey = "";
    }
    order = await open();
    if (!order)
      return c.json({ error: "Verification order could not be created." }, 409);
  }
  return providerCheckout(
    c,
    config,
    order,
    accessKey,
    null,
    "CodesBoxs payment verification (owner test order)",
  );
}

type CheckoutOrder = {
  id: string;
  amount_minor: number;
  currency: string;
  customer_email: string;
  customer_name: string;
};
/**
 * Shared hosted-checkout creation for an existing pending order: open-attempt
 * reuse, single-flight claim, externalId recovery (never blind re-creation),
 * payment-method verification, POST /orders and trusted-URL validation.
 */
async function providerCheckout(
  c: Context<AppEnv>,
  config: PayMeGateConfig,
  order: CheckoutOrder,
  accessKey: string,
  cartId: string | null,
  description: string,
) {
  const db = c.env.DB;
  const ready = (url: string) =>
    c.json(
      { orderId: order!.id, accessKey, checkoutUrl: url, paid: false },
      201,
    );
  let attempt = await latestAttempt(db, order.id);
  if (attempt?.status === "created" && attempt.provider_reference) {
    const url = trustedCheckoutUrl(
      config,
      attempt.provider_reference,
      attempt.checkout_url,
    );
    if (url) return ready(url);
  }
  if (!attempt || !["pending", "created"].includes(attempt.status)) {
    try {
      await db
        .prepare(
          "INSERT INTO payment_attempts(id,order_id,provider,mode,idempotency_key,status) VALUES(?,?,?,?,?,'pending')",
        )
        .bind(randomToken(), order.id, PAYMEGATE, config.mode, randomToken())
        .run();
    } catch {
      /* Another open attempt exists (unique open-attempt index). */
    }
    attempt = await latestAttempt(db, order.id);
  }
  if (!attempt || attempt.status !== "pending")
    return c.json(
      { error: "Checkout is being prepared. Try again in a moment." },
      409,
    );
  // Single-flight claim: only one request may talk to PayMeGate for this attempt.
  const now = Math.floor(Date.now() / 1000);
  const claimed = await db
    .prepare(
      "UPDATE payment_attempts SET claimed_at=? WHERE id=? AND status='pending' AND (claimed_at IS NULL OR claimed_at<?) RETURNING id",
    )
    .bind(now, attempt.id, now - 30)
    .first();
  if (!claimed)
    return c.json(
      { error: "Checkout is being prepared. Try again in a moment." },
      409,
    );
  const accept = (providerOrder: ProviderOrder) => {
    try {
      return providerOrder.status === "UNPAID" &&
        providerOrder.externalId === order!.id &&
        providerOrder.metadata?.orderId === order!.id &&
        providerOrder.metadata?.cartId === cartId &&
        providerOrder.metadata?.workspaceId === config.workspace &&
        providerOrder.metadata?.mode === config.mode &&
        providerOrder.currency === order!.currency &&
        decimalToMinor(providerOrder.amount, providerOrder.currency) ===
          order!.amount_minor
        ? trustedCheckoutUrl(
            config,
            providerOrder.orderUUID,
            providerOrder.checkoutUrl,
          )
        : null;
    } catch {
      return null;
    }
  };
  try {
    // Documented POST /v1/orders has no idempotency key and every POST creates a
    // new order: recover by externalId first and never create blindly.
    const existingOrders = await findProviderOrders(config, order.id);
    for (const existing of existingOrders) {
      const url = accept(existing);
      if (url) {
        await markCreated(db, attempt.id, order.id, existing.orderUUID, url);
        return ready(url);
      }
    }
    if (existingOrders.length) {
      // Provider already holds an order for this reference that we cannot safely
      // reuse (paid, expired or mismatched). Fail closed for manual review.
      await db
        .prepare(
          "UPDATE payment_attempts SET status='failed',provider_reference=?,claimed_at=NULL WHERE id=?",
        )
        .bind(existingOrders[0]!.orderUUID, attempt.id)
        .run();
      log("paymegate_recovery_conflict", {
        order: order.id,
        count: existingOrders.length,
      });
      return c.json(
        {
          error:
            "This checkout needs review before payment. Please contact support.",
        },
        409,
      );
    }
    await verifyPaymentMethods(config, order.amount_minor, order.currency);
    const created = await createProviderOrder(config, {
      orderId: order.id,
      cartId,
      amountMinor: order.amount_minor,
      currency: order.currency,
      customerEmail: order.customer_email,
      customerName: order.customer_name,
      description,
    });
    const url = accept(created);
    if (!url) {
      // Keep the reference so reconciliation can observe it, but never redirect.
      await db
        .prepare(
          "UPDATE payment_attempts SET status='failed',provider_reference=?,claimed_at=NULL WHERE id=?",
        )
        .bind(created.orderUUID, attempt.id)
        .run();
      log("paymegate_untrusted_checkout", { order: order.id });
      return c.json(
        { error: "Secure checkout is unavailable. Please contact support." },
        502,
      );
    }
    await markCreated(db, attempt.id, order.id, created.orderUUID, url);
    return ready(url);
  } catch (error) {
    const code =
      error instanceof ProviderError || error instanceof PaymentRejection
        ? error.message
        : "unexpected";
    // Ambiguous failures keep the attempt pending for externalId recovery.
    if (!(error instanceof ProviderError && error.ambiguous))
      await db
        .prepare(
          "UPDATE payment_attempts SET status='failed',claimed_at=NULL WHERE id=?",
        )
        .bind(attempt.id)
        .run();
    log("paymegate_checkout_failed", { order: order.id, code });
    if (
      error instanceof PaymentRejection &&
      error.code.startsWith("payment_method_")
    )
      return c.json(
        {
          error:
            "Online payment is not available for this selection. Submit a quote or invoice request instead.",
        },
        409,
      );
    return c.json(
      {
        error:
          "Secure checkout is unavailable. Please try again or contact support.",
      },
      502,
    );
  }
}

const reviewable = [
  "Payment identity, total or refund mismatch",
  "Invalid payment lifecycle transition",
  "Unknown order",
  "Event ID reused with different payload",
];
const settlementDiffers = (event: PaymentEvent) => {
  const s = event.settlement;
  if (!s?.receivedAmount || !s.receivedCurrency) return false;
  // Exact string arithmetic only; settlement is informational, never authoritative.
  return (
    s.receivedCurrency !== event.currency ||
    !sameDecimal(
      s.receivedAmount,
      minorToDecimal(event.amountMinor, event.currency),
    )
  );
};

/**
 * Public endpoint https://codesboxs.com/webhooks/paymegate (and the internal alias
 * /api/payments/paymegate/webhook). Mounted outside the same-site/JSON middleware.
 * Raw body → signature (current or previous secret) → timestamp → inbox once per
 * event ID → authenticated GET /v1/orders/{orderUUID} settlement confirmation →
 * existing processVerifiedWebhook(). Returns exactly 200 once durably handled.
 */
export async function payMeGateWebhook(c: Context<AppEnv>) {
  c.header("Cache-Control", "no-store");
  const config = payMeGateConfig(c.env).config;
  if (!config || !c.env.DB)
    return c.json(
      { error: "PayMeGate webhook processing is not configured." },
      503,
    );
  const raw = await c.req.text();
  const headers = c.req.raw.headers;
  const delivery = await authenticateDelivery(
    raw,
    headers,
    config.webhookSecrets,
  );
  if (!delivery.ok) {
    log("paymegate_webhook_rejected", {
      code: delivery.code,
      // Controlled verification of the "." vs ":" discrepancy. Logs which construction
      // matched (no secret, no payload); the request is still rejected in every mode.
      ...(delivery.code === "invalid_signature"
        ? {
            diagnostic: await signatureDiagnostic(
              raw,
              headers,
              config.webhookSecrets,
            ),
          }
        : {}),
    });
    return c.json({ error: "Webhook rejected" }, delivery.status);
  }
  const db = c.env.DB;
  const hash = await digest(raw);
  const type = delivery.ignored ? delivery.type : "order.paid";
  let payload = raw;
  try {
    JSON.parse(raw);
  } catch {
    payload = "{}"; // Only reachable for authenticated, unsupported event types.
  }
  await db
    .prepare(
      "INSERT OR IGNORE INTO payment_webhook_inbox(provider,event_id,event_type,signed_at,received_at,payload_hash,payload,status,detail) VALUES(?,?,?,?,?,?,?,?,?)",
    )
    .bind(
      PAYMEGATE,
      delivery.eventId,
      type,
      delivery.signedAt,
      Math.floor(Date.now() / 1000),
      hash,
      payload,
      // Other subscribable events (payment.created, …) are recorded, never applied.
      delivery.ignored ? "ignored" : "received",
      delivery.ignored ? "unsupported_event_type" : "",
    )
    .run();
  const stored = await db
    .prepare(
      "SELECT payload_hash,status FROM payment_webhook_inbox WHERE provider=? AND event_id=?",
    )
    .bind(PAYMEGATE, delivery.eventId)
    .first<{ payload_hash: string; status: string }>();
  if (!stored) return c.json({ error: "Webhook storage unavailable" }, 500);
  if (stored.payload_hash !== hash) {
    log("paymegate_webhook_conflict", { event: delivery.eventId });
    return c.json({ error: "Event ID reused with different payload" }, 409);
  }
  if (stored.status !== "received" || delivery.ignored)
    return c.body(null, 200);
  const finish = (status: string, detail = "") =>
    db
      .prepare(
        "UPDATE payment_webhook_inbox SET status=?,detail=?,processed_at=? WHERE provider=? AND event_id=? AND status='received'",
      )
      .bind(
        status,
        detail,
        Math.floor(Date.now() / 1000),
        PAYMEGATE,
        delivery.eventId,
      )
      .run();
  try {
    // Verified settlement (authenticated order lookup) before any state change.
    const event = await verifiedPaidEvent(db, config, delivery.event);
    const result = await processVerifiedWebhook(
      {
        name: PAYMEGATE,
        verifyWebhook: async () => event,
        reconcile: async () => {
          throw new PaymentRejection("not_supported");
        },
      },
      store(c.env),
      raw,
      headers,
    );
    await finish(result, settlementDiffers(event) ? "settlement_differs" : "");
    return c.body(null, 200);
  } catch (error) {
    if (error instanceof DuplicateTransaction) {
      // Same verified transaction under a new event ID: no second fulfillment.
      await finish("duplicate", "duplicate_transaction");
      return c.body(null, 200);
    }
    const message = error instanceof Error ? error.message : "";
    const reviewCode =
      error instanceof PaymentRejection
        ? error.code
        : error instanceof ProviderError && error.status === 404
          ? "provider_order_not_found"
          : reviewable.includes(message)
            ? message
            : null;
    if (reviewCode) {
      // Authenticated but not safely applicable: quarantined, never fulfilled.
      await finish("review", reviewCode);
      log("paymegate_webhook_review", {
        event: delivery.eventId,
        code: reviewCode,
      });
      return c.body(null, 200);
    }
    // Transient (D1, network, provider 5xx/auth): stays "received"; non-200 lets PayMeGate retry.
    log("paymegate_webhook_error", {
      event: delivery.eventId,
      code: error instanceof ProviderError ? error.message : "transient",
    });
    return c.json({ error: "Temporary processing failure" }, 500);
  }
}

/**
 * Scheduled reconciliation (Worker cron only; Pages never runs scheduled handlers).
 * Uses documented GET /v1/orders/{orderUUID} to apply missed payments, failures,
 * expiry/cancellation and recorded refunds through the same verified ledger.
 */
export async function reconcilePayMeGate(env: Env, limit = 10) {
  // Gated on complete configuration, not PAYMENTS_ENABLED: orders that already exist
  // (including after a rollback to disabled, or owner verification orders) must
  // still reconcile. It never creates provider orders.
  const config = payMeGateConfig(env).config;
  if (!env.DB || !config) return { checked: 0, applied: 0 };
  const now = Math.floor(Date.now() / 1000);
  const rows = await env.DB.prepare(
    `SELECT a.id,a.order_id,a.provider_reference FROM payment_attempts a
     JOIN payment_ledger_orders l ON l.id=a.order_id
     WHERE a.provider=? AND a.mode=? AND a.provider_reference IS NOT NULL
       AND ((a.status IN ('pending','created') AND (a.last_checked_at IS NULL OR a.last_checked_at<?))
         OR (a.status='verified' AND l.state IN ('paid','partially_refunded') AND (a.last_checked_at IS NULL OR a.last_checked_at<?)))
     ORDER BY a.last_checked_at IS NOT NULL, a.last_checked_at LIMIT ?`,
  )
    .bind(PAYMEGATE, config.mode, now - 540, now - 21600, limit)
    .all<{ id: string; order_id: string; provider_reference: string }>();
  const paymentStore = store(env);
  let applied = 0;
  for (const row of rows.results) {
    await env.DB.prepare(
      "UPDATE payment_attempts SET last_checked_at=? WHERE id=?",
    )
      .bind(now, row.id)
      .run();
    try {
      const ledger = await paymentStore.load(row.order_id);
      if (!ledger) continue;
      const event = await reconciliationEvent(
        env.DB,
        config,
        await getProviderOrder(config, row.provider_reference),
        ledger,
      );
      if (!event) continue;
      if (
        (await paymentStore.commit(
          PAYMEGATE,
          event,
          ledger,
          nextPaymentState(ledger, event),
        )) === "applied"
      )
        applied++;
    } catch (error) {
      log("paymegate_reconcile_failed", {
        attempt: row.id,
        code:
          error instanceof Error ? error.message.slice(0, 80) : "unexpected",
      });
    }
  }
  return { checked: rows.results.length, applied };
}
