# PayMeGate Provider Adapter Mapping

## Existing `PaymentProvider` Interface (`src/worker/payments.ts`)

```typescript
export interface PaymentProvider {
  readonly name: string;
  createCheckout(
    order: CheckoutOrder,
    returnUrl: string,
  ): Promise<{ checkoutId: string; hostedUrl: string }>;
  verifyWebhook(
    rawBody: string,
    headers: Headers,
  ): Promise<VerifiedPaymentEvent>;
  reconcile(paymentId: string): Promise<VerifiedPaymentEvent>;
  refund(
    paymentId: string,
    amountMinor: number,
    idempotencyKey: string,
  ): Promise<{ refundId: string; status: "pending" | "succeeded" | "failed" }>;
}
```

## PayMeGate Integration Mapping

### 1. `createCheckout(order: CheckoutOrder, returnUrl)`

**Maps to:** PayMeGate payment creation endpoint

| Field | Source | PayMeGate Equivalent |
|-------|--------|---------------------|
| `order.id` | `CheckoutOrder.id` | Customer/order identifier |
| `order.customerEmail` | `CheckoutOrder.customerEmail` | Payer email |
| `order.amountMinor` | `CheckoutOrder.amountMinor` | Amount in minor units (cents) |
| `order.currency` | `CheckoutOrder.currency` | Currency code (USD, EUR, etc.) |
| `order.idempotencyKey` | `CheckoutOrder.idempotencyKey` | PayMeGate idempotency key |
| `returnUrl` | Parameter | Success redirect URL after payment |

**Expected PayMeGate response:** `{ checkoutId: string; hostedUrl: string }`

### 2. `verifyWebhook(rawBody: string, headers: Headers)`

**Maps to:** PayMeGate webhook signature verification

| Field | Source | PayMeGate Equivalent |
|-------|--------|---------------------|
| `rawBody` | Raw HTTP body | Unmodified request body |
| `headers` | All incoming headers | Includes signature and timestamp |
| **Signature header** | `x-paymegate-signature` or `Signature` | HMAC-SHA256 of rawBody |
| **Timestamp header** | `x-paymegate-timestamp` | For replay protection (reject if >5min old) |
| **Verified event** | `VerifiedPaymentEvent` | `{ eventId, orderId, paymentId, amountMinor, currency, status }` |

**Critical:** Must verify signature against rawBody **before** parsing any event data.

### 3. `reconcile(paymentId: string)`

**Maps to:** PayMeGate API status check by payment identifier

| Field | Source | PayMeGate Equivalent |
|-------|--------|---------------------|
| `paymentId` | Internal DB `provider_payment_id` | PayMeGate payment reference |
| **Returns** | `VerifiedPaymentEvent` | Current payment status from API |

### 3. `refund(paymentId: string, amountMinor: number, idempotencyKey: string)`

**Maps to:** PayMeGate refund request

| Field | Source | PayMeGate Equivalent |
|-------|--------|---------------------|
| `paymentId` | Existing payment's `provider_payment_id` | PayMeGate payment to refund |
| `amountMinor` | Refund amount in minor units | Refund amount |
| `idempotencyKey` | Unique request identifier | Prevents duplicate refunds |
| **Returns** | `{ refundId: string; status: "pending" \| "succeeded" \| "failed" }` |

---

## Required Cloudflare Secrets (NOT YET CONFIGURED)

Once PayMeGate documentation is provided, these secrets must be added:

```toml
# wrangler.jsonc production env
[env.production.vars]
PAYMEGATE_API_KEY = "pmg_live_..."  # Live API key from PayMeGate
PAYMEGATE_WEBHOOK_SECRET = "..."     # Webhook signature secret from PayMeGate
```

**Never hardcode:** These must come from Cloudflare Dashboard or `wrangler secret` command.

---

## Database Schema Changes (`0011_payments_idempotency.sql`)

Created additive migrations that **never modify existing data**:

1. **`payments` table** — Tracks provider payment events
2. **`paymegate_webhook_events` table** — Idempotency/ replay protection

Both tables use `ON DELETE CASCADE` where appropriate and follow existing D1 conventions.

---

## Provider Adapter Skeleton (`to be created`)

**Not yet implemented** — awaiting official PayMeGate API documentation. When documentation is provided, the adapter will:

1. Implement `PaymentProvider` interface
2. Use `fetch()` for API calls (no new dependencies)
3. Use `Intl.NumberFormat` for currency formatting (already used in project)
4. Store verified events in D1 `payments` table
5. Validate webhook signatures using documented algorithm
6. Enforce idempotency via `paymegate_webhook_events` table
7. Return exact HTTP responses expected by PayMeGate

**Current status:** Skeleton ready, implementation awaits documentation.