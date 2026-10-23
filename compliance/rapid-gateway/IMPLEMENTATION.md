# Implementation status

This is a local implementation, not a production-compliance certificate. Payment remains unavailable. No package amounts or business address have been invented.

## Routes and APIs

- `/cart`: session-storage selection, remove actions, empty state, guest continuation.
- `/checkout`: server-validated cart, customer details, country, preferred display currency, quote/invoice request, policy acknowledgment, Turnstile, persistent request receipt. No card fields or registration.
- `/checkout/success` and `/checkout/cancel`: truthful return pages; neither confirms payment.
- `/order-status`: POST-based lookup with separate private key; no personal details or keys in URL.
- `/services/ai-chatbot-development`, `/services/seo`, `/services/banner-graphic-design`: substantive additions, preserving existing 15 services. All service pages gain a quote-cart action and commercial disclosures.
- `/pricing`: preserves existing three engagement cards; adds backend-approved package listing and five-currency selector.
- `GET /api/guest/catalog?currency=USD`: approved package data and converted amounts, not a generic raw exchange-rate API.
- `POST /api/guest/carts`: strict selection schema, approved server price resolution, private cart token, expiry.
- `POST /api/guest/requests`: consent/Turnstile/rate limits, revalidation, atomic customer/request/item/audit inserts, idempotent cart submission.
- `POST /api/guest/status`: rate-limited, private lookup; always distinguishes inquiry from payment.
- Authenticated `/api/admin/commerce/pricing`: create draft packages and update validated packages; service binding and recurring interval required for approved priced publication.
- Authenticated `/api/admin/commerce/invoice-requests`: paginated read-only inquiries, not payment administration or invoice issuance.

## Schema

`migrations/0008_guest_commerce.sql` adds service binding and billing interval to existing pricing packages; creates currency snapshots/refresh lock, guest customers, carts, requests, request items and reserved payment attempts. Existing services, contacts, pricing, orders, payment_records, payment_events and audit_logs remain in use. Requests are deliberately separate from payable orders.

No production migration run. No existing customer data altered. Local isolated migration checks apply all eight migrations.

## Currency

Five supported display currencies: USD, PKR, EUR, GBP, AED. Fixed-point BigInt calculations round only the final minor unit. Server fetch validates provider identity, timestamps and required rates. Daily expiry-based refresh plus scheduled-Worker refresh; Pages relies on lazy refresh because scheduled handlers are not a Pages scheduler. A database lock bounds refresh retries. On failure, verified cached rates may be used for up to seven days with a stale disclosure; otherwise base amounts remain visible and conversions are explicitly unavailable.

ExchangeRate-API attribution is visible. No key required for the selected open endpoint. No settlement currency is advertised. There is no approved priced package currently seeded; conversion of real owner-approved offers and cross-page/cart display selection still require acceptance work before claiming the gateway currency requirement complete.

## Security scope

Existing origin, JSON/body-size, admin-session and CSRF middleware retained. New requests use rate limits, server-resolved prices, snapshot change detection, strict schemas, consent, Turnstile and atomic D1 batches. Random 256-bit access tokens are stored hashed; lookup credentials are not put in URLs. Audit events omit request PII and keys. Browser success URLs cannot change payment state. Webhook remains 503 rather than acknowledging unprocessed events. Payment transition helper is tested but not wired to any live provider.

Outstanding: production security configuration, real Turnstile completion, email delivery, full dependency/vulnerability review, full-site accessibility/navigation checks, signed webhook processing/reconciliation/refunds and provider sandbox tests. Do not infer these from local unit tests.

## Preservation

The existing legal drafts, review notice, premium CSS, photography UI and pending RapidGateway adapter files were not changed by this task. Dirty-baseline hashes and diff are stored outside the repository. Screenshots use local synthetic data and are ignored by Git; no KYC or banking documents added.

## Publication blockers

1. Final policy approval and guest-processing disclosures.
2. Document-matched address; latest draft spelling differs from prior owner confirmation.
3. Approved prices, intervals, delivery limits, taxes and add-ons.
4. Verified authorized provider contract, sandbox credentials and settlement currencies.
5. Fresh Cloudflare access (HTTP 401), actual deployment mapping and isolated preview D1.
6. Clean release extraction from existing dirty review tree before commit/push/PR.

See `AUDIT.md`, `PREVIEW-CHECKLIST.md` and the verification report for test/evidence status. Production remains unchanged.