/**
 * PayMeGate Merchant API adapter.
 *
 * Source of truth: the official OpenAPI 3.1 document published at
 * https://www.paymegate.com/openapi.json (Merchant API 1.0.0), discovered from
 * https://paymegate.com/.well-known/api-catalog. Only documented operations,
 * headers and fields are used:
 *   - Server-side auth header X-API-Key (pmg_test_ keys = isolated sandbox).
 *   - POST /v1/orders (scope orders:create): ad-hoc amount/currency/paymentMethodsKeys.
 *     No idempotency key exists: every POST creates a new order.
 *   - GET /v1/orders/{orderUUID}, GET /v1/orders/by-external-id/{externalId}
 *     (externalId is not unique), GET /v1/payment-methods.
 *   - Webhook order.paid: X-Paymegate-Event / -Event-Id / -Timestamp / -Signature,
 *     unpadded base64url HMAC-SHA256 of `${timestamp}.${rawBody}`; return exactly 200.
 *   - POST /v1/orders/{id}/refunds only records an externally executed refund and
 *     moves no money; this integration never calls it.
 */
import { z } from "zod";
import type {
  PaymentEvent,
  PaymentOrder,
  VerifiedProviderAdapter,
} from "./payment-lifecycle";
import type { Env } from "./types";
import { currencyMinorDigits } from "../shared/pricing";

export const PAYMEGATE = "paymegate";
/** Owner-confirmed dashboard requirement; the OpenAPI text says "reject stale timestamps". */
export const WEBHOOK_TOLERANCE_SECONDS = 300;
const API_TIMEOUT_MS = 10000;
/** The API key is only ever sent to PayMeGate's documented host or its live custom alias. */
const TRUSTED_API_HOSTS = ["api.paymegate.com", "api.codesboxs.com"];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const orderId = /^[a-f0-9]{64}$/;
const methodKey = /^(?!(?:all|hosted)$)[a-z0-9][a-z0-9_-]{0,63}$/;
const decimal = /^[0-9]{1,18}(?:\.[0-9]{1,3})?$/;
const currencyCode = /^[A-Z]{3}$/;
const encoder = new TextEncoder();

export type PayMeGateMode = "sandbox" | "production";
export type PayMeGateConfig = {
  mode: PayMeGateMode;
  apiBaseUrl: string;
  checkoutOrigin: string;
  workspace: string;
  paymentMethods: string[];
  apiKey: string;
  /** Current secret first; optional previous secret accepted during rotation. */
  webhookSecrets: string[];
  /** Optional; when set, authenticated order responses must carry this merchantId. */
  merchantId: string;
  siteUrl: string;
};

/** Non-retryable, reviewable rejection. `code` is safe to log; never contains secrets. */
export class PaymentRejection extends Error {
  constructor(public code: string) {
    super(code);
    this.name = "PaymentRejection";
  }
}
/** The same verified transaction was already applied to this order. */
export class DuplicateTransaction extends Error {
  constructor() {
    super("duplicate_transaction");
    this.name = "DuplicateTransaction";
  }
}
export class ProviderError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(`paymegate_${status}_${code}`);
    this.name = "ProviderError";
  }
  /** Network failures and 5xx may have created an order; recover via externalId. */
  get ambiguous() {
    return this.status === 0 || this.status >= 500;
  }
}

/** Validates configuration and reports only variable NAMES that are missing or invalid. */
export function payMeGateConfig(env: Partial<Env>): {
  config: PayMeGateConfig | null;
  problems: string[];
} {
  const problems: string[] = [];
  // "live" (as configured in the Cloudflare dashboard) is the same environment as
  // "production"; it is normalized so stored order modes stay consistent.
  const mode =
    env.PAYMEGATE_MODE === "live" ? "production" : env.PAYMEGATE_MODE;
  if (mode !== "sandbox" && mode !== "production")
    problems.push("PAYMEGATE_MODE");
  let apiBaseUrl = "";
  try {
    const url = new URL(env.PAYMEGATE_API_BASE_URL || "");
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !TRUSTED_API_HOSTS.includes(url.hostname) ||
      url.pathname.replace(/\/$/, "") !== "/v1"
    )
      throw new Error();
    // Normalized exactly once: operation paths below never repeat /v1.
    apiBaseUrl = `${url.origin}/v1`;
  } catch {
    problems.push("PAYMEGATE_API_BASE_URL");
  }
  let checkoutOrigin = "";
  try {
    const url = new URL(env.PAYMEGATE_CHECKOUT_ORIGIN || "");
    if (
      url.protocol !== "https:" ||
      url.origin !== env.PAYMEGATE_CHECKOUT_ORIGIN
    )
      throw new Error();
    checkoutOrigin = url.origin;
  } catch {
    problems.push("PAYMEGATE_CHECKOUT_ORIGIN");
  }
  const workspace = env.PAYMEGATE_WORKSPACE || "";
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(workspace))
    problems.push("PAYMEGATE_WORKSPACE");
  const paymentMethods = (env.PAYMEGATE_PAYMENT_METHODS || "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
  if (
    !paymentMethods.length ||
    new Set(paymentMethods).size !== paymentMethods.length ||
    !(
      (paymentMethods.length === 1 && paymentMethods[0] === "*") ||
      paymentMethods.every((key) => methodKey.test(key))
    )
  )
    problems.push("PAYMEGATE_PAYMENT_METHODS");
  const apiKey = env.PAYMEGATE_API_KEY || "";
  // Documented: test keys use the pmg_test_ prefix and only create sandbox orders.
  if (
    apiKey.length < 16 ||
    /\s/.test(apiKey) ||
    (mode === "sandbox" && !apiKey.startsWith("pmg_test_")) ||
    (mode === "production" && apiKey.startsWith("pmg_test_"))
  )
    problems.push("PAYMEGATE_API_KEY");
  const current = env.PAYMEGATE_WEBHOOK_SECRET || "";
  const previous = env.PAYMEGATE_WEBHOOK_SECRET_PREVIOUS || "";
  if (current.length < 16) problems.push("PAYMEGATE_WEBHOOK_SECRET");
  if (previous && (previous.length < 16 || previous === current))
    problems.push("PAYMEGATE_WEBHOOK_SECRET_PREVIOUS");
  const merchantId = env.PAYMEGATE_MERCHANT_ID || "";
  if (merchantId && !/^[A-Za-z0-9._:-]{1,128}$/.test(merchantId))
    problems.push("PAYMEGATE_MERCHANT_ID");
  return {
    problems,
    config: problems.length
      ? null
      : {
          mode: mode as PayMeGateMode,
          apiBaseUrl,
          checkoutOrigin,
          workspace,
          paymentMethods,
          apiKey,
          webhookSecrets: previous ? [current, previous] : [current],
          merchantId,
          siteUrl: (env.PUBLIC_SITE_URL || "").replace(/\/$/, ""),
        },
  };
}

/** Minor integer → exact decimal string at the ISO 4217 scale (49900 USD → "499.00"). */
export function minorToDecimal(minor: number, currency: string) {
  if (!Number.isSafeInteger(minor) || minor <= 0)
    throw new PaymentRejection("invalid_amount");
  const digits = currencyMinorDigits(currency);
  if (!digits) return String(minor);
  const s = String(minor).padStart(digits + 1, "0");
  return `${s.slice(0, -digits)}.${s.slice(-digits)}`;
}
/** Exact decimal string → minor integer; no floating point. Rejects excess precision. */
export function decimalToMinor(value: unknown, currency: string) {
  const match =
    typeof value === "string"
      ? /^([0-9]{1,18})(?:\.([0-9]{1,3}))?$/.exec(value)
      : null;
  if (!match || !currencyCode.test(currency))
    throw new PaymentRejection("invalid_amount");
  const digits = currencyMinorDigits(currency);
  const fraction = match[2] || "";
  if (/[^0]/.test(fraction.slice(digits)))
    throw new PaymentRejection("invalid_amount_precision");
  const minor = BigInt(
    match[1] + fraction.slice(0, digits).padEnd(digits, "0"),
  );
  if (minor > BigInt(Number.MAX_SAFE_INTEGER))
    throw new PaymentRejection("invalid_amount");
  return Number(minor);
}

function base64UrlToBytes(value: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(value)) return null;
  try {
    const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/") + "=");
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}
/**
 * Constant-time HMAC-SHA256 verification via WebCrypto `verify` over the exact
 * raw body, using the official `${timestamp}.${rawBody}` construction. The secret
 * is used as its UTF-8 bytes. `separator` exists only for the sandbox diagnostic.
 */
export async function verifySignature(
  secret: string,
  timestamp: string,
  rawBody: string,
  signature: string,
  separator: "." | ":" = ".",
) {
  const bytes = base64UrlToBytes(signature);
  if (!bytes || bytes.length !== 32) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    bytes,
    encoder.encode(`${timestamp}${separator}${rawBody}`),
  );
}

const optionalDecimal = z.string().regex(decimal).optional();
/**
 * Settlement values can be crypto (e.g. 18 decimals, non-ISO codes such as USDT),
 * so they are validated as exact strings and never converted with ISO scales.
 */
const settledAmount = z
  .string()
  .regex(/^[0-9]{1,30}(?:\.[0-9]{1,18})?$/)
  .optional();
const settledCurrency = z
  .string()
  .regex(/^[A-Z0-9]{2,12}$/)
  .optional();
/** Exact decimal-string equality without floating point ("499.50" == "499.5"). */
export function sameDecimal(a: string, b: string) {
  const norm = (v: string) => {
    const [i, f = ""] = v.split(".");
    return `${i!.replace(/^0+(?=\d)/, "")}.${f.replace(/0+$/, "")}`;
  };
  return norm(a) === norm(b);
}
/** Official OrderPaidWebhookEvent fields plus the documented example's received* fields. */
const orderPaidSchema = z.object({
  id: z.string().regex(uuid),
  type: z.literal("order.paid"),
  createdAt: z.string().min(1).max(64),
  orderUUID: z.string().regex(uuid),
  transactionUUID: z.string().regex(uuid).optional(),
  transactionRef: z.string().max(256).nullable().optional(),
  status: z.literal("PAID"),
  amount: z.string().regex(decimal),
  currency: z.string().regex(currencyCode),
  receivedAmount: settledAmount,
  receivedCurrency: settledCurrency,
  customerEmail: z.string().max(254),
  externalId: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  paidAt: z.string().min(1).max(64),
  livemode: z.boolean().optional(),
});
export type OrderPaidEvent = z.infer<typeof orderPaidSchema>;

export type DeliveryResult =
  | {
      ok: true;
      ignored: false;
      eventId: string;
      signedAt: number;
      event: OrderPaidEvent;
    }
  | { ok: true; ignored: true; eventId: string; signedAt: number; type: string }
  | { ok: false; status: 400 | 401; code: string };

/**
 * Authenticates a webhook delivery before any JSON parsing: header shape, signature
 * over the raw body (any currently configured secret), then timestamp freshness.
 */
export async function authenticateDelivery(
  rawBody: string,
  headers: Headers,
  secrets: string | string[],
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<DeliveryResult> {
  const type = headers.get("X-Paymegate-Event") || "";
  const eventId = headers.get("X-Paymegate-Event-Id") || "";
  const timestamp = headers.get("X-Paymegate-Timestamp") || "";
  const signature = headers.get("X-Paymegate-Signature") || "";
  if (
    !/^[a-z0-9._-]{1,64}$/.test(type) ||
    !uuid.test(eventId) ||
    !/^[0-9]{1,12}$/.test(timestamp) ||
    !/^[A-Za-z0-9_-]{43}$/.test(signature)
  )
    return { ok: false, status: 400, code: "malformed_headers" };
  let valid = false;
  for (const secret of Array.isArray(secrets) ? secrets : [secrets])
    // Evaluate every configured secret; no early exit on a match.
    valid =
      (await verifySignature(secret, timestamp, rawBody, signature)) || valid;
  if (!valid) return { ok: false, status: 401, code: "invalid_signature" };
  const signedAt = Number(timestamp);
  if (Math.abs(nowSeconds - signedAt) > WEBHOOK_TOLERANCE_SECONDS)
    return { ok: false, status: 401, code: "stale_timestamp" };
  if (type !== "order.paid")
    return { ok: true, ignored: true, eventId, signedAt, type };
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return { ok: false, status: 400, code: "invalid_json" };
  }
  const parsed = orderPaidSchema.safeParse(body);
  if (!parsed.success || parsed.data.id !== eventId)
    return { ok: false, status: 400, code: "invalid_event" };
  return { ok: true, ignored: false, eventId, signedAt, event: parsed.data };
}

/**
 * Sandbox-only diagnostic for the documented "." vs dashboard ":" discrepancy.
 * Never accepts a request; reports which construction a rejected sandbox
 * delivery matches, so it can be resolved by controlled verification.
 */
export async function signatureDiagnostic(
  rawBody: string,
  headers: Headers,
  secrets: string[],
) {
  const timestamp = headers.get("X-Paymegate-Timestamp") || "";
  const signature = headers.get("X-Paymegate-Signature") || "";
  for (const secret of secrets)
    if (await verifySignature(secret, timestamp, rawBody, signature, ":"))
      return "colon_separator_matches";
  return "no_known_construction_matches";
}

const providerOrderSchema = z.object({
  merchantId: z.string().optional(),
  orderUUID: z.string().regex(uuid),
  externalId: z.string().nullable(),
  amount: z.string().regex(decimal),
  currency: z.string().regex(currencyCode),
  status: z.enum(["UNPAID", "PAID", "FAILED", "EXPIRED", "CANCELLED"]),
  checkoutUrl: z.string().optional(),
  paidTransactionUUID: z.string().optional(),
  transactionRef: z.string().nullable().optional(),
  receivedAmount: settledAmount,
  receivedCurrency: settledCurrency,
  forced: z.boolean().optional(),
  refundStatus: z.enum(["PARTIAL", "FULL"]).optional(),
  refundedAmount: optionalDecimal,
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type ProviderOrder = z.infer<typeof providerOrderSchema>;

async function call(
  config: PayMeGateConfig,
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${config.apiBaseUrl}${path}`, {
      method,
      headers: {
        "X-API-Key": config.apiKey,
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      // Never follow redirects with the API key attached.
      redirect: "manual",
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
  } catch {
    throw new ProviderError(0, "network");
  }
  type Envelope = {
    success?: unknown;
    data?: unknown;
    error?: { code?: unknown };
  };
  let json: Envelope | null = null;
  try {
    json = (await response.json()) as Envelope;
  } catch {
    /* handled below */
  }
  if (!response.ok || !json || json.success !== true) {
    const code =
      typeof json?.error?.code === "string" &&
      /^[a-z0-9_]{1,64}$/.test(json.error.code)
        ? json.error.code
        : "unexpected_response";
    throw new ProviderError(response.status, code);
  }
  return json.data;
}
/** Documented OrderEnvelope: the Order is `data` itself (data.orderUUID, data.checkoutUrl). */
function parseProviderOrder(data: unknown, config: PayMeGateConfig) {
  const parsed = providerOrderSchema.safeParse(data);
  if (!parsed.success) throw new ProviderError(200, "unexpected_order_shape");
  // An authenticated response is merchant-scoped; enforce the configured identity too.
  if (config.merchantId && parsed.data.merchantId !== config.merchantId)
    throw new PaymentRejection("merchant_mismatch");
  return parsed.data;
}

export type CreateOrderInput = {
  orderId: string;
  /** null for owner verification orders, which have no customer cart. */
  cartId: string | null;
  amountMinor: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  description: string;
};
/** POST /v1/orders — ad-hoc order; amount is authoritative server-side pricing. */
export async function createProviderOrder(
  config: PayMeGateConfig,
  input: CreateOrderInput,
) {
  const backUrl = config.siteUrl.startsWith("https://")
    ? `${config.siteUrl}/checkout/success`
    : undefined;
  return parseProviderOrder(
    await call(config, "POST", "/orders", {
      externalId: input.orderId,
      amount: minorToDecimal(input.amountMinor, input.currency),
      currency: input.currency,
      paymentMethodsKeys: config.paymentMethods,
      customer: { email: input.customerEmail, fullName: input.customerName },
      description: input.description.slice(0, 512),
      ...(backUrl ? { backUrl } : {}),
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      // Correlation only (round-trips unchanged); never treated as authentication.
      metadata: {
        orderId: input.orderId,
        cartId: input.cartId,
        workspaceId: config.workspace,
        mode: config.mode,
      },
    }),
    config,
  );
}
export async function getProviderOrder(
  config: PayMeGateConfig,
  uuidValue: string,
) {
  if (!uuid.test(uuidValue))
    throw new PaymentRejection("invalid_provider_order");
  return parseProviderOrder(
    await call(config, "GET", `/orders/${encodeURIComponent(uuidValue)}`),
    config,
  );
}
/** GET /v1/orders/by-external-id — externalId is not unique; callers must inspect all. */
export async function findProviderOrders(
  config: PayMeGateConfig,
  externalId: string,
) {
  if (!orderId.test(externalId))
    throw new PaymentRejection("invalid_external_id");
  const data = (await call(
    config,
    "GET",
    `/orders/by-external-id/${externalId}`,
  )) as { items?: unknown[] } | null;
  if (!Array.isArray(data?.items))
    throw new ProviderError(200, "unexpected_page_shape");
  return data.items.map((item) => parseProviderOrder(item, config));
}

let methodsCache: {
  key: string;
  at: number;
  methods: { key: string; minimumAmount: string; minimumCurrency: string }[];
} | null = null;
/** Test hook: clears the in-memory payment-methods cache. */
export function resetPaymentMethodsCache() {
  methodsCache = null;
}
const methodSchema = z.object({
  key: z.string().regex(/^[a-z0-9][a-z0-9_-]*$/),
  minimumAmount: z.string().regex(decimal),
  minimumCurrency: z.string().regex(currencyCode),
  status: z.literal("AVAILABLE"),
});
/**
 * Read-only admin diagnostics: proves X-API-Key authentication through the documented
 * GET /v1/payment-methods without creating any order. Returns names/codes only.
 */
export async function payMeGateDiagnostics(env: Partial<Env>) {
  const { problems } = payMeGateConfig(env);
  // Authentication can be checked before payment methods are chosen.
  const probe = payMeGateConfig({
    ...env,
    PAYMEGATE_PAYMENT_METHODS: env.PAYMEGATE_PAYMENT_METHODS || "*",
  }).config;
  const result = {
    mode: probe?.mode ?? null,
    problems,
    webhookSecretsConfigured: probe?.webhookSecrets.length ?? 0,
    merchantIdEnforced: !!probe?.merchantId,
    api: null as
      | null
      | {
          authenticated: true;
          methods: {
            key: string;
            minimumAmount: string;
            minimumCurrency: string;
          }[];
        }
      | { authenticated: false; code: string },
    webhook: null as
      | null
      | {
          configured: boolean;
          url: string | null;
          urlMatches: boolean;
          events: string[];
          status: string | null;
        }
      | { code: string },
  };
  if (!probe) return result;
  try {
    const data = (await call(probe, "GET", "/payment-methods")) as {
      paymentMethods?: unknown[];
    } | null;
    result.api = {
      authenticated: true,
      methods: (Array.isArray(data?.paymentMethods)
        ? data.paymentMethods
        : []
      ).flatMap((m) => {
        const parsed = methodSchema.safeParse(m);
        return parsed.success
          ? [
              {
                key: parsed.data.key,
                minimumAmount: parsed.data.minimumAmount,
                minimumCurrency: parsed.data.minimumCurrency,
              },
            ]
          : [];
      }),
    };
  } catch (error) {
    result.api = {
      authenticated: false,
      code: error instanceof ProviderError ? error.message : "unexpected",
    };
  }
  // GET /v1/webhook (scope api:read): never returns the signing secret.
  try {
    const hook = (await call(probe, "GET", "/webhook")) as {
      configured?: unknown;
      url?: unknown;
      events?: unknown;
      status?: unknown;
    } | null;
    const url = typeof hook?.url === "string" ? hook.url : null;
    result.webhook = {
      configured: hook?.configured === true,
      url,
      urlMatches: url === `${probe.siteUrl}/webhooks/paymegate`,
      events: Array.isArray(hook?.events)
        ? hook.events.filter((e): e is string => typeof e === "string")
        : [],
      status: typeof hook?.status === "string" ? hook.status : null,
    };
  } catch (error) {
    result.webhook = {
      code: error instanceof ProviderError ? error.message : "unexpected",
    };
  }
  return result;
}
/**
 * GET /v1/payment-methods. Every explicitly configured key must be AVAILABLE, and
 * at least one offered method's minimum (same currency, exact minor units) must not
 * exceed the order amount. Minimums in another currency are not converted.
 */
export async function verifyPaymentMethods(
  config: PayMeGateConfig,
  amountMinor: number,
  currency: string,
) {
  const cacheKey = `${config.apiBaseUrl}|${config.mode}`;
  if (
    !methodsCache ||
    methodsCache.key !== cacheKey ||
    Date.now() - methodsCache.at > 10 * 60 * 1000
  ) {
    const data = (await call(config, "GET", "/payment-methods")) as {
      paymentMethods?: unknown[];
    } | null;
    if (!Array.isArray(data?.paymentMethods))
      throw new ProviderError(200, "unexpected_methods_shape");
    methodsCache = {
      key: cacheKey,
      at: Date.now(),
      methods: data.paymentMethods.flatMap((m) => {
        const parsed = methodSchema.safeParse(m);
        return parsed.success ? [parsed.data] : [];
      }),
    };
  }
  const all = config.paymentMethods[0] === "*";
  const offered = methodsCache.methods.filter(
    (m) => all || config.paymentMethods.includes(m.key),
  );
  if (
    !all &&
    !config.paymentMethods.every((key) => offered.some((m) => m.key === key))
  )
    throw new PaymentRejection("payment_method_unavailable");
  if (
    !offered.some(
      (m) =>
        m.minimumCurrency === currency &&
        decimalToMinor(m.minimumAmount, currency) <= amountMinor,
    )
  )
    throw new PaymentRejection("payment_method_minimum_not_met");
}

/**
 * Accepts only the documented customer checkout path /pay/{orderUUID} on the exact
 * configured branded origin. The merchant console (/login) can never be returned.
 */
export function trustedCheckoutUrl(
  config: Pick<PayMeGateConfig, "checkoutOrigin">,
  orderUUID: string,
  value: unknown,
) {
  if (typeof value !== "string" || !uuid.test(orderUUID)) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (
    url.protocol !== "https:" ||
    url.origin !== config.checkoutOrigin ||
    url.username ||
    url.password ||
    url.hash ||
    url.search ||
    url.pathname !== `/pay/${orderUUID}`
  )
    return null;
  return url.toString();
}

/** livemode: sandbox events must not be live; live environments reject sandbox events. */
function assertMode(mode: PayMeGateMode, livemode: boolean | undefined) {
  if (
    (mode === "sandbox" && livemode === true) ||
    (mode === "production" && livemode === false)
  )
    throw new PaymentRejection("mode_mismatch");
}

type StoredOrder = {
  id: string;
  cart_id: string | null;
  mode: string | null;
  amount_minor: number;
  currency: string;
  provider_checkout_id: string | null;
  attempt_mode: string;
};
/**
 * externalId is the internal order reference. The provider order UUID must equal both
 * the stored attempt reference and orders.provider_checkout_id. Metadata is only
 * checked for consistency with what we stored; it proves nothing on its own.
 */
async function storedOrderFor(
  db: D1Database,
  config: { mode: PayMeGateMode; workspace: string },
  provider: {
    orderUUID: string;
    externalId: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  if (!provider.externalId || !orderId.test(provider.externalId))
    throw new PaymentRejection("unknown_external_id");
  const stored = await db
    .prepare(
      "SELECT o.id,o.cart_id,o.mode,o.amount_minor,o.currency,o.provider_checkout_id,a.mode AS attempt_mode FROM orders o JOIN payment_attempts a ON a.order_id=o.id AND a.provider=? AND a.provider_reference=? WHERE o.id=?",
    )
    .bind(PAYMEGATE, provider.orderUUID, provider.externalId)
    .first<StoredOrder>();
  if (!stored || stored.provider_checkout_id !== provider.orderUUID)
    throw new PaymentRejection("unknown_provider_order");
  if (stored.mode !== config.mode || stored.attempt_mode !== config.mode)
    throw new PaymentRejection("mode_mismatch");
  const m = provider.metadata || {};
  if (
    m.orderId !== stored.id ||
    m.cartId !== stored.cart_id ||
    m.workspaceId !== config.workspace ||
    m.mode !== config.mode
  )
    throw new PaymentRejection("correlation_mismatch");
  return stored;
}

/** Exact settlement details; never compared to `amount` as if equivalent. */
function settlement(source: {
  receivedAmount?: string;
  receivedCurrency?: string;
  transactionRef?: string | null;
}) {
  if (
    (source.receivedAmount === undefined) !==
    (source.receivedCurrency === undefined)
  )
    throw new PaymentRejection("invalid_settlement");
  return {
    receivedAmount: source.receivedAmount ?? null,
    receivedCurrency: source.receivedCurrency ?? null,
    transactionRef: source.transactionRef ?? null,
  };
}

/** Rejects a transaction already recorded for another order; flags a repeat on this one. */
async function checkTransaction(
  db: D1Database,
  order: string,
  transaction: string,
) {
  const rows = (
    await db
      .prepare(
        "SELECT order_id AS id FROM payment_records WHERE provider_payment_id=? UNION SELECT id FROM payment_ledger_orders WHERE payment_id=?",
      )
      .bind(transaction, transaction)
      .all<{ id: string }>()
  ).results;
  if (rows.some((r) => r.id !== order))
    throw new PaymentRejection("transaction_already_recorded");
  if (rows.length) throw new DuplicateTransaction();
}

/**
 * Converts an authenticated order.paid event into a ledger event only after the
 * authenticated GET /v1/orders/{orderUUID} response confirms verified provider
 * settlement (PAID, not forced, matching transaction, amount, currency, merchant).
 */
export async function verifiedPaidEvent(
  db: D1Database,
  config: PayMeGateConfig,
  event: OrderPaidEvent,
): Promise<PaymentEvent> {
  assertMode(config.mode, event.livemode);
  const stored = await storedOrderFor(db, config, event);
  if (!event.transactionUUID || !event.transactionRef)
    throw new PaymentRejection("unverified_settlement_requires_review");
  const amountMinor = decimalToMinor(event.amount, event.currency);
  if (event.currency !== stored.currency || amountMinor !== stored.amount_minor)
    throw new PaymentRejection("amount_or_currency_mismatch");
  const confirmed = await getProviderOrder(config, event.orderUUID);
  if (
    confirmed.orderUUID !== event.orderUUID ||
    confirmed.externalId !== stored.id ||
    confirmed.status !== "PAID" ||
    confirmed.forced === true ||
    confirmed.paidTransactionUUID !== event.transactionUUID ||
    confirmed.currency !== event.currency ||
    decimalToMinor(confirmed.amount, confirmed.currency) !== amountMinor
  )
    throw new PaymentRejection("provider_confirmation_mismatch");
  await checkTransaction(db, stored.id, event.transactionUUID);
  return {
    id: event.id,
    orderId: stored.id,
    paymentId: event.transactionUUID,
    amountMinor,
    currency: event.currency,
    state: "paid",
    refundedMinor: 0,
    settlement: settlement(event),
  };
}

/** Converts GET /v1/orders/{uuid} into a ledger event, or null when nothing changed. */
export async function reconciliationEvent(
  db: D1Database,
  config: PayMeGateConfig,
  order: ProviderOrder,
  ledger: PaymentOrder,
): Promise<PaymentEvent | null> {
  const stored = await storedOrderFor(db, config, order);
  if (stored.id !== ledger.id)
    throw new PaymentRejection("correlation_mismatch");
  const base = {
    orderId: stored.id,
    amountMinor: decimalToMinor(order.amount, order.currency),
    currency: order.currency,
  };
  let event: PaymentEvent | null = null;
  if (order.status === "PAID") {
    // Forced (manual) payments and missing settlement identifiers are never auto-fulfilled.
    if (order.forced === true || !order.paidTransactionUUID)
      throw new PaymentRejection("unverified_settlement_requires_review");
    if (ledger.paymentId && ledger.paymentId !== order.paidTransactionUUID)
      throw new PaymentRejection("transaction_mismatch");
    if (!ledger.paymentId)
      await checkTransaction(db, stored.id, order.paidTransactionUUID).catch(
        (error) => {
          if (!(error instanceof DuplicateTransaction)) throw error;
        },
      );
    const refundedMinor = order.refundedAmount
      ? decimalToMinor(order.refundedAmount, order.currency)
      : 0;
    const state =
      order.refundStatus === "FULL"
        ? "refunded"
        : order.refundStatus === "PARTIAL"
          ? "partially_refunded"
          : "paid";
    event = {
      ...base,
      id: `reconcile:${order.orderUUID}:${state}:${refundedMinor}`,
      paymentId: order.paidTransactionUUID,
      state,
      refundedMinor: state === "paid" ? 0 : refundedMinor,
      settlement: settlement(order),
    };
  } else if (order.status !== "UNPAID") {
    event = {
      ...base,
      id: `reconcile:${order.orderUUID}:${order.status.toLowerCase()}`,
      paymentId: `order:${order.orderUUID}`,
      state: "failed",
      refundedMinor: 0,
      ...(order.status === "FAILED"
        ? {}
        : { outcome: order.status === "EXPIRED" ? "expired" : "cancelled" }),
    } as PaymentEvent;
  }
  if (
    !event ||
    (event.state === ledger.state &&
      event.refundedMinor === ledger.refundedMinor)
  )
    return null;
  return event;
}

/** VerifiedProviderAdapter for the existing processVerifiedWebhook() contract. */
export class PayMeGateAdapter implements VerifiedProviderAdapter {
  readonly name = PAYMEGATE;
  constructor(
    private db: D1Database,
    private config: PayMeGateConfig,
    private now = () => Math.floor(Date.now() / 1000),
  ) {}
  async verifyWebhook(raw: string, headers: Headers) {
    const result = await authenticateDelivery(
      raw,
      headers,
      this.config.webhookSecrets,
      this.now(),
    );
    if (!result.ok || result.ignored)
      throw new PaymentRejection(result.ok ? "ignored_event" : result.code);
    return verifiedPaidEvent(this.db, this.config, result.event);
  }
  /** For PayMeGate the reconciliation key is the provider order UUID. */
  async reconcile(providerOrderUUID: string): Promise<PaymentEvent> {
    const ledger = await this.db
      .prepare(
        "SELECT l.id,l.amount_minor AS amountMinor,l.currency,l.state,l.refunded_minor AS refundedMinor,l.payment_id AS paymentId,l.version FROM payment_ledger_orders l JOIN payment_attempts a ON a.order_id=l.id WHERE a.provider=? AND a.provider_reference=?",
      )
      .bind(PAYMEGATE, providerOrderUUID)
      .first<PaymentOrder>();
    if (!ledger) throw new PaymentRejection("unknown_provider_order");
    const event = await reconciliationEvent(
      this.db,
      this.config,
      await getProviderOrder(this.config, providerOrderUUID),
      ledger,
    );
    if (!event) throw new PaymentRejection("no_change");
    return event;
  }
}
