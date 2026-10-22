# Merchant audit continuation — October 23, 2026 (local date)

## Release decision

**NO-GO for merchant submission, payments or deployment.** No owner release
approval or approved commercial/legal documents were supplied. No push, remote
migration, deployment, DNS change, live form submission or payment operation was
performed. Existing untracked files were preserved.

## Live read-only findings

`audit-public-routes.json` records 46 GET requests at
2026-10-22T21:18:32Z (October 23 locally). Every repository-defined static public
and service route returned 200, including `/pricing` and its three detail pages.
`/terms-and-conditions` returned 404. `/api/services` and
`/api/payments/readiness` returned 503. Public HTML contained no configured
Turnstile key. These observations do not establish a database migration failure
or identify the serving Cloudflare project. Do not attach a database speculatively.
Blog/portfolio records, external accounts, every content-managed route and live
browser interactions were not exhaustively checked by this GET audit.

## Changes in this continuation

- `src/worker/index.tsx`: 308 alias from `/terms-and-conditions` (including a
  trailing slash) to retained `/terms-of-service`; existing draft/noindex retained.
- `src/web/forms.tsx`: public submissions reject null, arrays, missing storage
  acknowledgement and missing/malformed inquiry/job reference even on HTTP 200.
  Existing job response contract preserved; no notification-delivery claim added.
- `src/web/PremiumHome.tsx`: quote-only pricing now explicitly discusses currency,
  deposits, milestone invoicing, authorized approval and proposed delivery records.
  No rates, percentages, timelines or payment method were invented.
- `src/web/BusinessDetails.tsx`: removed unverified city/country fallback from
  business-address display; full address remains gated on documentary approval.
- `tests/pages.test.ts`, `tests/forms.test.ts`, `e2e/merchant.spec.ts`: all static
  public/service deep links, terms alias, retained draft and receipt validation;
  expanded mobile axe coverage to privacy and terms pages.
- `.github/workflows/deploy.yml`: existing manual production workflow also runs
  formatting, browser/D1 integration checks and explicit production bundle dry-run
  before deployment. No workflow dispatched. GitHub environment protection and
  required owner reviewers must be confirmed in repository settings.
- `scripts/audit-public-routes.mjs`: repeatable fixed-origin GET-only route audit.
- `docs/MERCHANT_EVIDENCE_PROCESS.md`: proposed invoice/authorization/handover
  evidence checklists. Not an implemented invoicing or acceptance system.

All paths above are relative to `D:\company site\codesboxs-site`.
No stylesheet, palette, framework, service catalogue, policy approval flag or
payment adapter was replaced. Existing premium design retained.

## Technical verification

- TypeScript: passed (`audit-typecheck.log`).
- Unit tests: 34/34 passed across eight files (`audit-unit.log`).
- Formatting: passed (`audit-format.log`).
- Lint: initial new-script regex errors corrected; final lint completed without
  diagnostics (`audit-lint-final.log`, `audit-lint-done.log`).
- Read-only smoke checker tests: 7/7 passed (`audit-smoke-tests.log`).
- Client/Pages SSR build and default Worker dry-run passed (`audit-build.log`).
  Nonfatal lucide module-directive and unspecified default environment warnings
  remain; default build is not proof of production binding correctness.
- Explicit production Worker dry-run passed (`audit-production-dry-run.log`),
  using configured `agency-site-db` and HTTPS URL. No deployment was performed.
- `git diff --check`: no errors (`audit-diff.log`).
- Full isolated Chrome/Worker/D1 suite: **24/24 passed in 8.2 minutes**
  (`audit-e2e.log`). Includes direct routes/internal links, real local storage,
  authentication/CSRF, inquiry failure handling/replay, rate limits, responsive
  overflow, mobile navigation and automated axe scans. Fresh 390px and 1440px
  homepage screenshots were opened and visually inspected; no obvious overlap
  observed. Two local proxy dropped connections recovered automatically during
  the run; no failed tests. This is not production Turnstile/email validation,
  a manual accessibility certification or an exhaustive visual review.

## Required owner decisions / evidence

1. Privately provide approved registration, current address proof, NTN and exact
   publication fields. Supplied legal name/contact details are not independently
   documentary-verified. Do not publish an inferred identifier or address.
2. Approve actual package prices or quote-only offering, currency/taxes, deposit,
   milestones, revisions, delivery estimates, support coverage and acceptance.
3. Approve cancellation/refund eligibility, review and processing timelines,
   disputes/governing law, privacy retention, processors and cookie inventory.
   Five policies remain explicit unapproved drafts; do not remove warnings.
4. Identify the custom domain's actual Pages/Worker version and bindings. Confirm
   backup, migration state and rollback before authorizing any correction.
5. Configure actual Turnstile keys/hostnames, verified email sender, notification
   inbox and secrets in the serving environment. Verify cron/retry execution (a
   Pages deployment does not execute this Worker's scheduled handler).
6. Separately authorize labeled real integration submissions; verify D1 storage,
   dashboard access, abuse denial, outbox retry and actual inbox receipt. Do not
   disclose secrets or customer documents in chat/source.
7. Approve proposed invoice/delivery workflow, implement any needed internal
   recording tools and provide genuine redacted evidence only when it exists.
8. Complete manual keyboard/screen-reader and cross-browser review. Obtain owner
   approval before a connected GitHub push or production deployment.
9. Obtain specific processor authorization for legitimate software-service sales;
   keep payments disabled pending separately implemented and tested integration.
   No gambling deposits, payment aggregation or disguised transactions permitted.

## Deployment

Deployed URLs from this task: **none**. Live origin audited:
`https://codesboxs.com`. Local alias and form changes are not live. After all
approvals/checks, use only the existing GitHub/Cloudflare workflow; retain the
current version and recovery details. Do not confuse a dry-run with deployment.