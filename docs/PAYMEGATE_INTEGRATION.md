# PayMeGate integration (CodesBoxs LLC)

Status: implemented on branch `feature/paymegate-integration`, **disabled by
default** (`PAYMENTS_ENABLED` is not `true` anywhere). Not deployed.

## Source of truth

Official Merchant API OpenAPI 3.1 document `https://www.paymegate.com/openapi.json`
(Merchant API 1.0.0), discovered via `https://paymegate.com/.well-known/api-catalog`,
plus `https://www.paymegate.com/developers/api`. `https://api.codesboxs.com/v1/health`
returns the same service identity as `https://api.paymegate.com/v1/health`.

| Contract point | Implementation |
|---|---|
| Auth | Server-side `X-API-Key` only; redirects never followed with the key |
| Base URL | `PAYMEGATE_API_BASE_URL` normalized once to `https://api.codesboxs.com/v1`; paths are `/orders`, never `/v1/v1` |
| Create | `POST /orders`, ad-hoc: server `amount` (exact decimal), `currency`, `paymentMethodsKeys`, `customer`, `externalId` (= internal order ID), `metadata` `{orderId, cartId, workspaceId, mode}` |
| Response | Strict `OrderEnvelope`: `data.orderUUID`, `data.checkoutUrl`; other shapes rejected |
| Checkout URL | Only `{PAYMEGATE_CHECKOUT_ORIGIN}/pay/{orderUUID}`; `/login` and anything else fail closed |
| Reconcile | `GET /orders/{orderUUID}` (Worker cron) |
| Recovery | `GET /orders/by-external-id/{externalId}` before any create. Non-unique IDs: every result is inspected. A non-reusable match blocks creation for manual review; ambiguous failures are never retried blindly |
| Methods | `GET /payment-methods`: configured keys must be `AVAILABLE`; a same-currency minimum must not exceed the amount (no FX conversion) |
| Webhook | `order.paid`, base64url HMAC-SHA256 of `timestamp + "." + rawBody`, ±300 s, dedupe by event ID, exactly 200 |
| Settlement | Fulfillment only after authenticated `GET /orders/{orderUUID}` confirms `PAID`, not `forced`, matching `paidTransactionUUID`, amount, currency, `externalId` (and `merchantId` if configured). Events without `transactionUUID`/`transactionRef` are quarantined |
| Isolation | `pmg_test_` keys only in sandbox; live keys only in production; `livemode=true` rejected in sandbox, `livemode=false` rejected in production; stored order/attempt mode must match |
| Refunds | `POST /orders/{id}/refunds` records an externally executed refund and moves no money. Never called. Refund state is read through reconciliation |

### Signature separator discrepancy (unresolved, fails closed)

The OpenAPI document specifies `timestamp + "." + rawBody`. The merchant dashboard
reportedly showed `":"`. Only `"."` is accepted. Validation is not weakened. In
**sandbox mode only**, a rejected delivery logs
`{"event":"paymegate_webhook_rejected","code":"invalid_signature","diagnostic":"colon_separator_matches"}`
when the colon construction would have matched. The request is still rejected and
no secret is logged. Send one sandbox test event and read the Worker logs:
- No rejection: `"."` is confirmed.
- `colon_separator_matches`: ask PayMeGate to confirm which is authoritative
  before any code change.

## Flow

1. `POST /api/checkout` (flag-gated; 503 otherwise) re-prices the existing server
   cart. Only `approved=1`, `status='published'`, `billing='one_time'` packages
   qualify (`authoritativeTotal()`). Quote services keep the existing request flow.
2. One `orders` row per cart (unique `cart_id`), `payment_ledger_orders` (pending),
   one open `payment_attempts` row (unique open-attempt index) and a 30 s
   single-flight claim.
3. Recovery lookup → payment-methods check → `POST /orders` → trusted URL → redirect.
4. Webhook public URL **`https://codesboxs.com/webhooks/paymegate`** (internal alias
   `/api/payments/paymegate/webhook`): 64 KB limit, header shape, constant-time
   WebCrypto verify against the current and optional previous secret, timestamp,
   JSON parse, inbox insert once per event ID.
5. `externalId` maps to the internal order. The provider `orderUUID` must equal the
   stored attempt reference and `orders.provider_checkout_id`. Metadata is checked
   for consistency only; authenticity comes from the HMAC plus the authenticated
   order lookup.
6. Transaction checks: a `transactionUUID` already recorded for another order is
   quarantined (`transaction_already_recorded`). The same transaction under a new
   event ID is a `duplicate` (no ledger revision, onboarding or email).
7. `processVerifiedWebhook()` → `D1PaymentStore.commit` atomically writes ledger,
   `orders.status`, `payment_records` (including exact `received_amount`,
   `received_currency`, `transaction_ref`), attempts, `service_fulfillments`, three
   queued emails (deterministic IDs) and the audit entry.
8. `receivedAmount`/`receivedCurrency` may differ (fees, crypto such as USDT with 18
   decimals). They are stored as exact strings, flagged `settlement_differs` in the
   inbox, and never used as the order amount.
9. Inbox `review` = authenticated but not applied (never fulfilled). A 500 means a
   transient failure, so PayMeGate retries.

## Variables

| Name | Kind | Value |
|---|---|---|
| `PAYMENTS_ENABLED` | plain | `false` until go-live |
| `PAYMEGATE_MODE` | plain | `sandbox`, or `live` / `production` (same environment; dashboard uses `live`) |
| `PAYMEGATE_API_BASE_URL` | plain | `https://api.codesboxs.com/v1` |
| `PAYMEGATE_CHECKOUT_ORIGIN` | plain | `https://pay.codesboxs.com` |
| `PAYMEGATE_WORKSPACE` | plain | `codesboxs-llc` |
| `PAYMEGATE_PAYMENT_METHODS` | plain | owner decision, keys from `GET /v1/payment-methods`, or `*` |
| `PAYMEGATE_MERCHANT_ID` | plain, optional | `merchantId` from an authenticated order response |
| `PAYMEGATE_API_KEY` | **secret** | `pmg_test_…` in sandbox only; separate live key |
| `PAYMEGATE_WEBHOOK_SECRET` | **secret** | signing secret of the matching endpoint |
| `PAYMEGATE_WEBHOOK_SECRET_PREVIOUS` | **secret**, optional | old secret during rotation only |
| `RESEND_API_KEY` | **secret**, optional | emails stay queued without it |

The webhook is processed whenever the full PayMeGate configuration is present, even
with `PAYMENTS_ENABLED=false`, because it needs the API key for the authenticated
confirmation. Secrets go only into Cloudflare secrets. Never put them in
`wrangler.jsonc`, frontend code, Git, logs or `.env.example` values.

### Setting secrets (values are typed at the prompt, never echoed)

```sh
# Production Pages (codesboxs.com: checkout + webhook). Always targets Pages production.
npx wrangler pages secret put PAYMEGATE_API_KEY --project-name agency-site
npx wrangler pages secret put PAYMEGATE_WEBHOOK_SECRET --project-name agency-site
# Sandbox Worker (after recreating the preview environment)
npx wrangler secret put PAYMEGATE_API_KEY --config wrangler.preview.json
npx wrangler secret put PAYMEGATE_WEBHOOK_SECRET --config wrangler.preview.json
```

Plain variables for Pages: Dashboard → Workers & Pages → agency-site (Pages) →
Settings → Variables and Secrets → Production. Changes apply to the next deployment.
Production Worker (`admin.codesboxs.com`, cron):
`npx wrangler secret put <NAME> --env production` **creates a new Worker version
immediately**. Do this only during the approved Worker deployment.

### Webhook secret rotation (no code change)

1. `wrangler pages secret put PAYMEGATE_WEBHOOK_SECRET_PREVIOUS` ← current (old) value.
2. Rotate the secret in the PayMeGate dashboard.
   `wrangler pages secret put PAYMEGATE_WEBHOOK_SECRET` ← new value.
3. Redeploy Pages. Both secrets verify during the overlap.
4. After PayMeGate's retry window: `wrangler pages secret delete PAYMEGATE_WEBHOOK_SECRET_PREVIOUS`
   and redeploy. Old signatures are then rejected.

Repeat the same steps on the Worker if it holds the webhook secret.

## PayMeGate dashboard configuration

1. API keys (Settings → API Keys): a sandbox `pmg_test_` key and a separate live key.
   Grant `orders:create` plus read access for `GET /v1/orders/*` and
   `GET /v1/payment-methods`. The OpenAPI document leaves those scopes unlabeled,
   so confirm them in the dashboard. Do not grant `orders:manage`, `products:write`,
   wallet or `webhooks:write`.
2. Webhook URL: production `https://codesboxs.com/webhooks/paymegate`. Sandbox
   endpoint = sandbox Worker origin + `/webhooks/paymegate`. Each endpoint has its own
   signing secret in its own environment.
3. **Do not replay** historical failed deliveries. Any that arrive are authenticated,
   stored and quarantined (`unknown_provider_order`), never fulfilled.
4. Configure the payout wallet (otherwise `POST /v1/orders` returns 422
   `payout_wallet_required`).
5. Choose payment methods to match the published Payment Policy (cards, bank
   transfer). `*` also enables crypto, which the current policy text does not mention.
6. Default checkout back URL: `https://codesboxs.com/checkout/success`.

## Products

No PayMeGate catalog products are needed. The documented ad-hoc order takes exact
`amount` + `currency`, so `pricing_packages` stays the single catalog and no
`payment_provider_prices` table exists. A package is payable online when it is
`approved=1`, `status='published'`, `billing='one_time'` with an amount and a valid
`service_slug`. Edit packages in the existing admin pricing editor. Starter
($499), Business ($1,499) and Enterprise ($1,999) already qualify in production.

## Sandbox environment (approval required; the old preview was deleted)

```sh
npx wrangler d1 create codesboxs-paymegate-sandbox
# put the new database_id into wrangler.preview.json, then:
npx wrangler d1 migrations apply codesboxs-paymegate-sandbox --config wrangler.preview.json --remote
npm run build:web && npx wrangler deploy --config wrangler.preview.json
```

Sandbox checks to run:
- separator diagnostic
- `livemode=false` present
- whether simulated sandbox payments include `transactionUUID`/`transactionRef`

The OpenAPI document says `transactionUUID` is present only for provider-settled
payments. If sandbox events omit it, they are quarantined by design. In that case
ask PayMeGate how sandbox settlement is represented; do not relax the check.

## Production checklist

1. Owner approves legal identity and checkout disclosure changes.
2. Sandbox matrix passes on the recreated preview.
3. Back up D1: `npx wrangler d1 export agency-site-db --env production --remote --output backups/before-0012.sql`.
4. Apply `0012_paymegate_integration.sql` (additive): `npx wrangler d1 migrations apply agency-site-db --env production --remote`.
5. Set Pages and Worker production variables with `PAYMENTS_ENABLED=false`, then secrets.
6. Merge to `feature/codesboxs-premium-production` (Pages auto-deploys) and deploy
   the Worker via `.github/workflows/deploy.yml`.
7. Verify that `/api/payments/readiness` reports disabled and that an unsigned POST to
   `/webhooks/paymegate` returns 400/401.
8. Set `PAYMENTS_ENABLED=true` and redeploy Pages. Monitor inbox `review` rows and
   `settlement_differs`.

## Rollback

- Immediate: `PAYMENTS_ENABLED=false` and redeploy. Checkout returns 503; the
  quote/invoice flow continues.
- Code: redeploy `e97402e` (tag `checkpoint/pre-paymegate-2026-11-28-production`).
- Database: 0012 is additive and ignored by the old code. Restore from the
  pre-migration export only if required.
