# Phase 3 single-repository integration

## Authoritative destination

- Repository: codexs-technology/agency-site.
- Only authorized development branch: feature/codesboxs-premium-production (GitHub default branch verified October 23, 2026).
- Local integration checkout: D:\company site\codesboxs-production-release-1792719019701 (existing checkout reused; not a new repository).
- agency remote is authoritative; legacy origin points to codesboxs-site and must not be used for publishing.
- No new branches, PRs, repositories or Cloudflare projects are authorized. Earlier PHASE2/PULL-REQUEST instructions are historical and superseded by this document. Never execute the external phase2-publish-branch.mjs helper.

## Reconciliation

Remote base 7530da956426f4b39312de7f9c08c49e35cf0a01 includes the premium upgrade and photography commit. Phase 2 source is based on its parent 0e9466ce47e62aaac1afb6f2c6ffd2d387f65c21. Both source working trees remain intact. Reviewed Phase 2 files were applied on the existing authorized branch, retaining target photography imports/assets and cleanly combining worker changes. Import-only conflicts in App/PremiumHome were reconciled by keeping both feature sets. Unrelated uncommitted legal rewrites and payment experiments were not imported.

## Publication and commercial boundaries

The exact Nursery address is owner-confirmed and authorized for publication by the Phase 3 instruction of October 23, 2026. It is not independently document-verified. Footer/contact/business and policy views use the centralized value. The legal company name already exists in the target source; registration documents were not supplied or inspected. No new legal-name verification is claimed. Confirm document spelling before merchant submission.

PHASE3-PRICING-REVIEW.md holds twelve owner-provided amounts and six scope-based agent proposals plus Starter/Growth/Premium packages. It is not imported or seeded. No proposed amounts are approved or activated. Taxes, final payment terms, cancellation/refunds and acceptance remain owner/legal approval items.

## Deployment stop

Fresh Cloudflare Pages inspection confirms production_branch=feature/codesboxs-premium-production, deployments_enabled=true, production_deployments_enabled=true, path_includes=[*], no path exclusions. Preview branches are all included with no exclusions. A push can trigger public production deployment. DO NOT PUSH without explicit approval. Do not silently alter these settings.

Production Pages DB binding: a6095c86-021b-4409-85ae-c5e474389ca9. Pages preview has no D1 binding and only NODE_VERSION configured. Existing separate Worker preview uses DB 1379910f-611a-4194-aa2c-d3cdeb0e8ad3 and remains the sole safe remote test destination. No production migration is authorized. Local migration tests do not prove live schema state.

## Turnstile, email and provider blockers

Production Pages exposes configured TURNSTILE_SITE_KEY and secret TURNSTILE_SECRET_KEY names, but hostname allowlisting and actual challenge acceptance have not been tested. CAREERS_WEBHOOK_URL/SECRET are present for recruitment only; this is not proof of contact/quote notification delivery. RESEND_API_KEY, EMAIL_FROM and NOTIFICATION_EMAIL are not configured in the inspected Pages variables. Contact notifications use the Resend outbox and remain blocked if sender/key are missing. Guest quote requests are stored for authenticated admin review but do not currently enqueue an email; notification wiring is an additional outstanding item, not merely a missing secret. Sender-domain verification, notification recipient approval, scheduled outbox execution and authorized inbox acceptance are outstanding. Pages does not acquire the Worker's scheduled trigger merely from a local configuration; verify a supported scheduler before production notifications.

Preview Turnstile and notification email are intentionally unconfigured. Do not bypass protection or send real inquiries merely to test. Configure approved preview hostname keys and test inbox via local/dashboard tooling, never chat. No authorized email delivery test has been performed.

Provider-neutral lifecycle, verified webhook/reconciliation interface, duplicate protections, authoritative totals, transactional D1 ledger and refund states are internal architecture only. No live adapter is connected. Rapid Gateway has not supplied approved credentials/documentation; no endpoint or secret is invented. Secure quote creation is not payment authorization. Return URLs never establish paid status. Invoice requests remain unpaid and payment endpoints stay disabled.

## Evidence

Fresh audit, file comparison, validation and browser logs: D:\company site\phase3-evidence. Final results must distinguish this integrated checkout from earlier Phase 2 evidence. Production deployment, production schema/backup inspection and full merchant compliance require separate authorization and verification.