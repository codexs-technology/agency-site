# Premium reference implementation — October 21, 2026

## Release decision: NOT production-ready

The screenshot governs the new homepage composition: cinematic black/gold device hero, technology strip, ten visual cards, automation showcase, portfolio, three pricing cards, permission-gated testimonials, closing CTA and five-column footer. Illustrations are original CSS/SVG interfaces, not photorealistic reproductions of the screenshot. Exact visual equivalence is not claimed.

The existing React SSR, Vite bundles, Worker, D1, admin authentication, CSRF, Turnstile, inquiry persistence and email outbox are preserved. The existing 13 service routes remain; branding and combined cloud/API service details are added. No production deployment, remote migration or force-push is authorized.

## New persistence

Apply `migrations/0003_commercial_readiness.sql` after 0001 and 0002. It is additive and seeds draft, unapproved packages and incomplete compliance tasks. Tables: pricing_packages, testimonials, compliance_items, orders, payment_records, payment_events. No real customer testimonials or merchant approval evidence are seeded.

The public Worker now expects migration 0003. Back up and apply migrations before activating this Worker in an approved deployment. Do not release code against the older schema.

## Administration

Existing bootstrap uses an owner-supplied secret and strong password; no default credentials. Existing sessions, authorization and CSRF protect `/api/admin/commerce/*`.

Pricing, testimonials and compliance use a validated JSON editor with search and pagination. Pricing values are in the currency's actual minor units (including zero- and three-decimal currencies), and unrecognized currency codes are rejected. Only published AND approved packages appear as approved public offers; defaults are quote-only engagement outlines. Approved publication requires nonblank delivery, revision, exclusion and disclosure details. Testimonials require verification and a permission reference before publication. Archive records rather than deleting review evidence. Orders are read-only because no payment execution is enabled.

Deep links `/admin/login`, `/admin/dashboard`, `/admin/leads`, `/admin/services`, `/admin/pricing`, `/admin/portfolio`, `/admin/testimonials`, `/admin/orders`, `/admin/newsletter`, `/admin/content`, `/admin/settings`, `/admin/audit-logs` resolve to the existing secure admin shell.

## Payments — interface/schema only

`src/worker/payments.ts` defines hosted checkout, raw-body webhook verification, reconciliation and refund interfaces. No provider adapter is implemented. `/api/payments/readiness` reports disabled. `POST /api/checkout` returns HTTP 503; it never fabricates a checkout or successful payment. Orders, webhook processing, customer order history, receipts, refunds and reconciliation are NOT operational. A real adapter must verify signatures before any status mutation, validate amount/currency against the server-created order, enforce unique event IDs, and use provider idempotency keys. Card data must never enter D1.

## Merchant blockers requiring owner action

- Verify the website, contracts and merchant account use CodesBoxs SMC Pvt Ltd, not CodesBoxs LLC. Legal identity is still the repository's shared constant, not fully admin-configurable.
- Confirm the existing repository email is a genuine monitored support channel; supply verified phone, jurisdiction and address where legally/provider required.
- Approve actual deliverables, availability, prices/currency, billing intervals, revision limits, taxes, fees and exclusions.
- Supply legally reviewed terms, privacy, refunds/cancellation, service delivery and cookie policies. Current pages are drafts/incomplete and noindexed; they are NOT merchant-ready legal documents.
- Supply project ownership/scope evidence and authorized screenshots. Current seeded portfolio entries are explicitly concepts, not verified customer case studies.
- Supply permissioned testimonials. The live section stays hidden without verified published records.
- Select an eligible approved payment provider; provide credentials through server secrets only and authorize integration testing.
- Configure production D1, Turnstile and an authorized email sender. Subscription persistence does not imply marketing delivery.
- Complete legal identity configurability, approved policy CMS, customer order/history flows and provider implementation before commercial launch.

## Local commands (PowerShell)

```powershell
Set-Location 'D:\company site\codesboxs-site'
npm ci
npm run typecheck
npm run lint
npm test
npm run build
node scripts/run-e2e.mjs e2e/premium.spec.ts e2e/api.spec.ts e2e/security.spec.ts
```

The E2E wrapper generates isolated local test configuration, migrates an isolated D1 and restores previous local secrets. Screenshots: `artifacts/premium/home-{320,375,390,768,1024,1440,1920}.png`. Logs, screenshots, local secrets and generated databases are ignored by Git. No Lighthouse scores are asserted for this redesign without a new measurement.

## Final review and local evidence

- Reviewed saved mobile, tablet and desktop homepage screenshots; original CSS/SVG artwork is deliberately illustrative and portfolio entries remain marked as concepts. There are no lazy-rendered blank sections in the reviewed captures.
- Added page-level headings on pricing routes, currency-specific minor-unit formatting, approved package price/billing details, and regression tests for currency and disclosure validation.
- Updated retired homepage assertions to the new composition. Preserved workflow and development timeline interaction coverage on their existing solutions/process routes. Scoped inquiry selectors to the main form because the footer now also has email and consent inputs.
- The first full browser run passed 18 of 20 tests and exposed undersized footer link targets in two accessibility tests. The footer now provides a minimum 24px link target. The final full Chromium rerun passed **20 of 20 tests** in 7.1 minutes, including representative-route accessibility, main inquiry flows, authentication/CSRF, public page families, internal links, responsive screenshots and console-error checks.
- Final local checks on October 21, 2026: **24 unit tests across six files passed**; typecheck, lint, format check, Vite client/SSR builds and Cloudflare deployment **dry-run** completed. Migration 0003 applied successfully with 0001/0002 to the isolated local D1 at `.wrangler/e2e-9513fd564ac9bdf5`. Full evidence: `premium-final-verification.log`. No remote migration or real deployment occurred. Local Worker proxy retry warnings recovered; the Vite dependency directive warning is nonfatal.
- Removed the temporary status script. Repository review found many status entries caused by line-ending normalization, not substantive unrelated rewrites. Formatting checks remain part of verification.
- Evidence files are local-only; CI must regenerate them. Automated accessibility checks do not constitute a complete manual accessibility audit.

## Approved deployment procedure — do not run without owner approval

1. Review branch, verified test evidence and remaining release gates.
2. Back up the genuine production D1; confirm account, database ID, environment, domain and legal merchant identity.
3. Configure production secrets using the existing `.env.example` and deployment documentation; never deploy local security bypass.
4. Apply all migrations to the approved database; retain the backup and a tested recovery plan.
5. Build and deploy only through the approved protected Cloudflare workflow.
6. Verify routes, persistence, access controls, CSP, newsletter consent, inbox behavior and (only after provider implementation) authorized payments/webhooks/refunds.

The provider alone decides merchant approval. This release must not be presented as approved or fully operational.