# PayMeGate production runbook (live mode, no sandbox)

Each gate needs explicit owner approval. `PAYMENTS_ENABLED` stays `false`
throughout Gates 1–4. Public checkout is never exposed for verification.

## Verified state (read-only, 2026-11-28)

| Item | Pages `agency-site` (codesboxs.com) | Worker `agency-site` (admin.codesboxs.com) |
|---|---|---|
| Code | `e97402e` | version `6fb59fae` (dashboard var change; code not traceable to Git) |
| `PAYMENTS_ENABLED` | `false` | `false` |
| `PAYMEGATE_MODE` | `live` | `live` |
| `PAYMEGATE_API_BASE_URL` | `https://api.codesboxs.com/v1` | same |
| `PAYMEGATE_CHECKOUT_ORIGIN` | `https://pay.codesboxs.com` | same |
| `PAYMEGATE_WORKSPACE` | `codesboxs-llc` | same |
| `PAYMEGATE_PAYMENT_METHODS` | `*` | `*` |
| `PUBLIC_SITE_URL` | `https://codesboxs.com` | `https://codesboxs.com` |
| Secrets | API key, webhook secret, Turnstile, careers (present) | same |
| D1 `DB` | `a6095c86-…` | same |
| Cron / domains | n/a / `codesboxs.com`, `agency-site-6ie.pages.dev` | `*/10 * * * *` / `admin.codesboxs.com`, workers.dev on |
| D1 migrations | 0001–0010 applied; schema identical to repo; **0012 pending** | same DB |

`wrangler.jsonc` `env.production` declares exactly the Worker's live plain variables,
custom domain, `workers_dev`, `preview_urls` and cron. Top-level `keep_vars: true`
preserves dashboard-only variables. Pages ignores `wrangler.jsonc` (no
`pages_build_output_dir`), so its dashboard values are never overwritten.

### `"*"` payment methods (official OpenAPI)

`paymentMethodsKeys: ["*"]` must be sent alone. It "offers every currently
available method". `GET /v1/payment-methods` returns the concrete `AVAILABLE` keys
with minimums. `crypto` appears only when crypto checkout is enabled for the
merchant, and the special `all`/`hosted` sentinels are never returned. The
integration sends `["*"]` unchanged. Before each order it requires at least one
available method whose same-currency minimum is at or below the amount. The admin
diagnostics endpoint shows exactly which live keys `"*"` currently resolves to.

## Gate 1: D1 backup and migration

Run from `codesboxs-site/`. A D1 export briefly blocks other queries, so run it at
low traffic.

```sh
npx wrangler d1 export agency-site-db --env production --remote \
  --output ../backups/agency-site-db-before-0012-$(date +%Y%m%d-%H%M).sql
npx wrangler d1 migrations list agency-site-db --env production --remote
#   expect exactly: 0012_paymegate_integration.sql
npx wrangler d1 migrations apply agency-site-db --env production --remote
npx wrangler d1 migrations list agency-site-db --env production --remote
#   expect: No migrations to apply
npx wrangler d1 execute agency-site-db --env production --remote --command \
 "SELECT name FROM sqlite_master WHERE name IN ('payment_webhook_inbox','service_fulfillments','orders_cart','orders_open_verification','payment_attempts_open') ORDER BY name"
#   expect 5 rows
```

0012 is additive. The deployed code ignores it, so migrating before deploying is
safe. Rollback: leave it in place. For a disaster restore, import the export into a
new database (`wrangler d1 create` + `wrangler d1 execute --file`) and rebind `DB`.

## Gate 2: deploy with payments disabled

```sh
git push origin feature/paymegate-integration          # branch only; Pages builds a preview
gh pr create --base feature/codesboxs-premium-production --head feature/paymegate-integration
# after review and approval: merge → Pages production auto-deploys
npx wrangler deploy --env production --dry-run --outdir worker-build   # confirm bindings
npx wrangler deploy --env production                    # or GitHub "Approved production deployment"
```

Smoke checks (no money):

```sh
curl -s https://codesboxs.com/api/payments/readiness            # "enabled":false
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://codesboxs.com/webhooks/paymegate   # 400 (503 = config incomplete)
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://codesboxs.com/api/checkout \
  -H 'Origin: https://codesboxs.com' -H 'Content-Type: application/json' -d '{}'          # 503
```

As admin in the browser: `https://codesboxs.com/api/admin/payments/diagnostics`.
Expect:
- `api.authenticated: true` and the `methods` list. This is what `"*"` resolves to,
  including `crypto` if it is enabled.
- `webhook.urlMatches: true`, `status: "active"` and `events`.
- `problems: []`.

`authenticated:false` with `paymegate_401_invalid_api_key` means a wrong key.
`paymegate_403_*` means a missing scope.

## Gate 3: webhook URL and signature format (no money)

1. PayMeGate dashboard webhook URL = `https://codesboxs.com/webhooks/paymegate`.
   Confirm with diagnostics `webhook.url`. **Do not replay** historical failed deliveries.
2. Signature format: the official OpenAPI is `HMAC-SHA256(secret, timestamp + "." + rawBody)`,
   unpadded base64url. That is the only construction accepted. It is resolved by the
   first signed delivery (a dashboard test event if available, otherwise the Gate 4
   payment). Check the Pages logs:
   - `200` and an inbox row: `"."` confirmed.
   - `paymegate_webhook_rejected` + `"diagnostic":"colon_separator_matches"`: the
     dashboard's `":"` is what PayMeGate sends. The request was rejected; nothing was
     applied. Get written confirmation from PayMeGate, then change one constant in
     `verifySignature` (not both) with a regression test.
   - `"diagnostic":"no_known_construction_matches"`: wrong secret in Cloudflare.
3. Other subscribed events (`payment.created`, …) are stored as `ignored`, never applied.

## Gate 4: restricted low-value live verification (real money, ≤ US$5.00)

No public exposure: `PAYMENTS_ENABLED` stays `false`, and only a signed-in
administrator can create the order.

1. Pages dashboard → add `PAYMEGATE_VERIFICATION_ENABLED=true` → redeploy Pages.
   The Worker does not need it.
2. In the browser, signed in at `https://codesboxs.com/admin`, run this in the console
   (it uses the existing admin session and CSRF token):
   ```js
   const s = await (await fetch("/api/admin/session")).json();
   const r = await fetch("/api/admin/payments/verification", {
     method: "POST",
     headers: { "Content-Type": "application/json", "X-CSRF-Token": s.csrfToken },
     body: JSON.stringify({ amount: "1.00" }), // ≤ 5.00; must be ≥ a method minimum (see diagnostics)
   });
   console.log(r.status, await r.json()); // save orderId + accessKey
   ```
3. Duplicate check before paying: run it again with the same amount. The same
   `checkoutUrl` comes back and no second provider order is created. A different
   amount returns 409.
4. Open `checkoutUrl` (must be `https://pay.codesboxs.com/pay/<uuid>`) and pay with
   your own card (or crypto, to test that path).
5. Verify (read-only):
   ```sh
   npx wrangler d1 execute agency-site-db --env production --remote --command \
    "SELECT o.status,o.purpose,r.status AS record,r.transaction_ref IS NOT NULL AS has_ref,r.received_amount,r.received_currency FROM orders o LEFT JOIN payment_records r ON r.order_id=o.id WHERE o.purpose='verification' ORDER BY o.created_at DESC LIMIT 1"
   npx wrangler d1 execute agency-site-db --env production --remote --command \
    "SELECT event_type,status,detail FROM payment_webhook_inbox ORDER BY received_at DESC LIMIT 5"
   ```
   Expected:
   - `paid | verification | paid | 1`.
   - The inbox shows `order.paid | applied`, or `applied | settlement_differs` for
     crypto or fees.
   - No `service_fulfillments` row and no customer emails. Only the admin
     notification is queued.
   - `/order-status` with `orderId` + `accessKey` shows "Paid — verification order
     (no service delivery)".
6. Duplicate delivery: resend the event from the PayMeGate dashboard if possible.
   The inbox gains no second `applied` row.
7. Refund: refund through the original provider. Then record it in PayMeGate
   (`POST /orders/{id}/refunds` records only; it moves no money). The Worker cron
   (≤ 6 h) moves the order to `refunded`.
8. Remove `PAYMEGATE_VERIFICATION_ENABLED` (or set it to `false`) and redeploy Pages.

Go-live (separate approval, after policy changes): set `PAYMENTS_ENABLED=true` on
Pages and the Worker.

## Webhook secret rotation (no code change)

The official API cannot rotate the secret. `PUT /v1/webhook` preserves the existing
secret, and the secret is returned only once, at first configuration. Rotate in the
PayMeGate dashboard if it offers rotation; otherwise ask PayMeGate support.

```sh
# 1. keep the current secret as the previous one (type the CURRENT value)
npx wrangler pages secret put PAYMEGATE_WEBHOOK_SECRET_PREVIOUS --project-name agency-site
npx wrangler secret put PAYMEGATE_WEBHOOK_SECRET_PREVIOUS --env production
# 2. rotate in PayMeGate, then store the NEW value
npx wrangler pages secret put PAYMEGATE_WEBHOOK_SECRET --project-name agency-site
npx wrangler secret put PAYMEGATE_WEBHOOK_SECRET --env production
# 3. redeploy Pages (Worker secret put already creates a new version); both verify
# 4. after PayMeGate's retry window, remove the old secret and redeploy Pages
npx wrangler pages secret delete PAYMEGATE_WEBHOOK_SECRET_PREVIOUS --project-name agency-site
npx wrangler secret delete PAYMEGATE_WEBHOOK_SECRET_PREVIOUS --env production
```

Diagnostics `webhookSecretsConfigured` shows 2 during the overlap and 1 afterwards.

## Rollback

| Situation | Action |
|---|---|
| Stop new payments | `PAYMENTS_ENABLED=false` (and `PAYMEGATE_VERIFICATION_ENABLED` off) → redeploy Pages. Existing orders keep reconciling. |
| Bad Pages release | Cloudflare dashboard → Pages → Deployments → `e97402e` → "Rollback to this deployment" (tag `checkpoint/pre-paymegate-2026-11-28-production`) |
| Bad Worker release | `npx wrangler rollback --env production` (previous version `6fb59fae`) |
| Database | Leave 0012 (additive). Disaster restore from the Gate 1 export. |
