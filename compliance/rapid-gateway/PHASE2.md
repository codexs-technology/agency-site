# Phase 2 — October 23, 2026

## Approval boundaries

No actual fees, tax treatment, refund terms or delivery dates have been invented. Approved and published D1 packages remain the only source of priced offers. `commercial-terms.json` records required owner inputs; authenticated Commercial Admin is the centralized entry/publication workflow. `src/shared/service-pricing.ts` provides quote-only scope defaults for all 18 services.

## Currency

USD, PKR, EUR, GBP and AED share a persisted display preference across homepage pricing, service scope panels, pricing catalog, cart, checkout and estimate summary. Conversion happens on the server. A unit is rounded once before quantity multiplication. Stale cached rates are marked; data older than seven days is rejected. No FX quote is a payable invoice or settlement authorization. Mixed billing periods and quote-only services are not misleadingly combined into a payable total.

## Payment architecture — disabled, not a connected processor

`payment-lifecycle.ts` defines authoritative approved one-time totals, a raw-body verification/reconciliation adapter contract, amount/currency/payment identity validation, monotonic cumulative refunds, failure handling and verified-event processing. `payment-store.ts` atomically persists events, state and audit entries with unique payment/event IDs and revision checks. Migration 0009 is additive and unseeded. SQL transaction tests exercise duplicate IDs, stale concurrent updates and rollback.

These modules are deliberately not mounted as public payment endpoints. The existing webhook returns 503. No hosted checkout is created. No provider API contract, signature algorithm, merchant identity, timestamp tolerance, refund authorization, settlement terms or credentials are assumed. Live activation additionally needs initiation/retry/reconciliation wiring, authenticated refund operations, provider-specific verification and authorized end-to-end sandbox scenarios. Mock tests are not provider certification.

## Address consistency inventory

`src/shared/business-address.ts` holds the Nursery draft, separately from the empty document-matched address and approval references. `business.address` remains empty until all approval inputs exist. Footer/contact `BusinessDetails` and public policy contact blocks use the same gate. Previous legal owner-review documents are retained as private drafts, not verification evidence.

Before publication match: footer, contact/about pages, five policy contacts, invoice/quote templates, receipts/support signatures, structured data/SEO, map URL, merchant/KYC application, registration/address proof and any external business profiles. Confirm Nursery versus Nersari against the actual accepted document and authorize exact spelling.

## Cloudflare read-only findings

Wrangler OAuth worked on October 23, 2026; no re-login was needed. The earlier management API 401 was not reproduced using Wrangler's existing authorized OAuth. No credentials were printed or changed.

The live `agency-site` Pages project is connected to **codexs-technology/agency-site**, production branch **feature/codesboxs-premium-production**, not the current origin `codexs-technology/codesboxs-site`. Preview auto-deploy is enabled for all branches. Production DB is `agency-site-db`; preview currently has **no D1 binding** and only NODE_VERSION configured. The default local Wrangler database ID does not appear in the account's database list. Never deploy the default/production config as a preview.

Production has Turnstile and careers binding names configured, but this is not proof of working verification or email delivery. Preview needs isolated DB, correct PUBLIC_SITE_URL/ENVIRONMENT, preview-domain Turnstile and an authorized test email sink. Never use production secrets or LOCAL_TEST_MODE on a public preview.

## Git and release caveat

Original dirty tree is preserved. The isolated task worktree is `D:\company site\codesboxs-rapid-phase2` on `feature/rapid-readiness-phase2`. Task-only extraction excludes uncommitted photography, unrelated legal rewrites, Gmail state and local evidence. Its base is the existing reviewed premium branch; compared to origin/main it inherits substantial earlier premium work. Do not present a main-targeted PR as task-only without reviewing that inherited diff.

GitHub CLI was not installed. Tool discovery did not expose a GitHub connector. Do not substitute Bitbucket authorization. No production merge or deployment is authorized.

## Pending acceptance

Owner-approved prices/scopes/taxes/delivery/limits and policies; document-matched address; approved provider documentation and secure sandbox configuration; actual Turnstile completion and authorized inbox test; preview acceptance; separate explicit production migration/merge/deploy approval.