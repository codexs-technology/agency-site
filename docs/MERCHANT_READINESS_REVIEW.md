# CodesBoxs website review — October 22, 2026

## Scope and safety

Working branch: `review/merchant-readiness-2026-10-22`.
Repository root: `D:\company site\codesboxs-site`.
Existing React/TypeScript, Hono, D1, Workers and Pages architecture retained.
No production deployment, push, merge, remote migration, credential change or DNS mutation authorized or performed in this review.
Pre-existing untracked LIVE_HANDOFF, live-smoke scripts and worker-build-production are not this change set.

## Audit findings and implementation

| Area | Finding / disposition |
| --- | --- |
| Identity | Replaced abbreviated public identity with supplied legal name; shared phone, general/support email and six social destinations. Legal registration itself is not independently verified. |
| Address | Supplied address retained in shared source, with `addressVerified: false`. Full street address and Maps link intentionally withheld pending actual registration/address-proof documents. No invented postal code or identifiers. |
| Design | Retained the existing premium typography, original illustrations, section contrast, native motion/reduced-motion behavior and layouts. Added responsive contact details, restrained social links, policy guide navigation and pricing terms. No external stock assets added. |
| Footer | Company, three primary services and five legal destinations retained as working routes. Shared contacts, legal name, six securely linked labeled social destinations, dynamic year and top anchor included. Social destinations are supplied by owner; account ownership/availability remains manual. |
| About/contact | Shared business details added; no staffing, certifications, awards or historical claims invented. |
| Portfolio | Existing concept projects retained. Concept labels now depend on the actual concept flag rather than labeling all future client work as a concept. No client case studies fabricated. |
| Pricing | Fallback categories now Website Development, Business Applications and AI Automation Solutions; custom quote only. Removed unapproved fixed revision counts. Added timeline, revisions, support and order/billing/delivery disclosures. Existing admin-approved pricing remains authoritative. |
| Blog | Preserved D1-backed admin management, filtering, safe article bodies and related content. Added visible publication dates and nine-item client-side pagination over currently loaded records. SSR currently loads a maximum 200 published records per collection; server-side pagination beyond that is future scope. Existing seeded editorial requires owner approval; publication is not an assertion of owner approval. |
| Careers | Existing no-openings state and published-job-only application validation retained. No vacancies or resume upload invented. |
| Policies | Five substantive, navigable review drafts covering requested topics. No invented refund guarantee, liability cap, governing forum, support SLA or retention period. Drafts remain noindexed and are NOT approved merchant policies. |
| Services | Existing complete page layouts, process, deliverables, technology and FAQ retained. Expanded website, mobile and AI-agent scope descriptions to cover requested use cases. Capabilities are scope options, not performance promises or claims of delivered client work. |
| Forms | Missing Turnstile site key was the literal source of the footer warning. Public key is now emitted only when DB and secret binding also exist. Safe email/phone fallback and disabled submit remain. Challenge timeout/retry, token refresh after attempts, non-JSON response handling and fail-closed provider failure added. |
| Replay safety | Added optional Idempotency-Key support for inquiry APIs; browser requests generate a stable per-payload in-memory key. Atomic D1 batch stores key and inquiry; retry returns existing reference and changed payload conflicts. Migration 0004 is additive. This is not cross-device/content deduplication or reload-persistent browser retry storage. |
| Admin | Existing hashed sessions, same-origin writes, CSRF, rate limits, CRUD and audit infrastructure retained. Single administrator access model, not a newly implemented multi-role system. Production login CPU/plan validation, MFA/recovery and operational recovery exercises remain open. |
| Uploads | Not enabled. Existing safe restriction retained; no unreviewed upload endpoint added. |
| Cookies | No optional tracker found in reviewed app source, so no decorative consent control added. Essential administrator cookie documented; actual edge-provider cookies still need a live inventory. |
| SEO | Existing SSR, titles, descriptions, canonical, OG, robots, sitemap and real 404 retained. Organization schema gains brand/legalName, telephone, support and supplied social references; no unverified street address, ratings or reviews added. |
| Build hygiene | Generated worker-build-production excluded from lint, preserving its pre-existing untracked contents. |

## Form configuration and diagnosis

### Changed-file inventory

All paths are under `D:\company site\codesboxs-site`:

- `D:\company site\codesboxs-site\eslint.config.js`
- `D:\company site\codesboxs-site\src\shared\content.ts`
- `D:\company site\codesboxs-site\src\shared\policies.ts` (new)
- `D:\company site\codesboxs-site\src\web\App.tsx`
- `D:\company site\codesboxs-site\src\web\PremiumHome.tsx`
- `D:\company site\codesboxs-site\src\web\BusinessDetails.tsx` (new)
- `D:\company site\codesboxs-site\src\web\PolicyPage.tsx` (new)
- `D:\company site\codesboxs-site\src\web\merchant.css` (new)
- `D:\company site\codesboxs-site\src\web\components.tsx`
- `D:\company site\codesboxs-site\src\web\forms.tsx`
- `D:\company site\codesboxs-site\src\web\entry.tsx`
- `D:\company site\codesboxs-site\src\worker\api.ts`
- `D:\company site\codesboxs-site\src\worker\index.tsx`
- `D:\company site\codesboxs-site\src\worker\security.ts`
- `D:\company site\codesboxs-site\migrations\0004_inquiry_idempotency.sql` (new)
- `D:\company site\codesboxs-site\tests\merchant.test.tsx` (new)
- `D:\company site\codesboxs-site\e2e\merchant.spec.ts` (new)
- `D:\company site\codesboxs-site\scripts\merchant-verify.mjs` (new)
- `D:\company site\codesboxs-site\docs\MERCHANT_READINESS_REVIEW.md` (new)

Generated verification evidence: `D:\company site\codesboxs-site\merchant-verification.json` and ignored `.log` files. Generated build/screenshots remain local artifacts, not production changes.

### Page disposition

Updated: homepage shared footer/pricing, About, Contact, Pricing and three quote-detail routes, blog/portfolio listing interactions, conditional concept detail labels, three primary service content records, Terms, Privacy, Refund & Cancellation, Delivery and Cookie pages. Retained existing Careers/no-openings, remaining services, process/technology/industry/FAQ pages, admin routes and real 404. These are implemented page experiences, not a claim that all commercial content is approved or that every page received a bespoke redesign.

### Exact environment checklist

1. Identify what actually serves `codesboxs.com`: Pages project versus Worker `agency-site`. Compare deployed versions/routes and the exact Worker origin. The prior LIVE_HANDOFF reports missing DB on public APIs; that is historical evidence, not a newly verified live result.
2. Check binding **names** on the serving deployment, not a different project. `DB` must point to the owner-approved database. Existing production Wrangler points to `agency-site-db`; configuration was not changed.
3. Inspect pending migrations and take a database backup before approval to apply. This change adds `0004_inquiry_idempotency.sql`; deploy code only with the required schema available.
4. In the authorized Turnstile account create/review the widget and permitted hostnames. Configure public `TURNSTILE_SITE_KEY` and server-only `TURNSTILE_SECRET_KEY` on the serving environment. Never put the secret in VITE variables, browser source, a Git commit or chat.
5. Review production and preview separately. Do not assume bindings or vars are inherited. Do not use real production keys for unauthorized preview hosts. `LOCAL_TEST_MODE` must never enable a public bypass.
6. Verify `ENVIRONMENT=production` and the intended HTTPS `PUBLIC_SITE_URL`. Pages wrapper enforces production and disables local bypass.
7. Configure `RESEND_API_KEY`, verified `EMAIL_FROM` and monitored `NOTIFICATION_EMAIL` only through authorized server secrets/configuration. Keep `SEND_CONFIRMATIONS=false` until approved receipt/unsubscribe testing.
8. Test valid/invalid/expired challenges, blocked scripts, replay, rejected origin and rate limits with approved test data. Confirm D1 persistence, administrator visibility and actual inbox receipt separately. A stored lead is not proof of notification delivery.
9. For scheduled outbox processing verify the actual Worker cron. Pages does not execute this application's scheduled handler; do not silently migrate architectures to hide this gap.
10. Owner-run first-admin bootstrap only after production cost/security review; remove bootstrap secret afterward. Never share an owner password.

Cloudflare references checked: official Turnstile server-side-validation documentation (mandatory verification, single-use five-minute tokens) and Wrangler environments documentation (non-inherited bindings/vars). Account/dashboard inspection was unavailable through discovered connectors; no unrelated Supabase integration was connected.

## Verification evidence

### Final verified result

Second sequential run completed successfully: **28/28 unit tests, 23/23 Chrome browser/integration tests in 6.8 minutes**. TypeScript, full lint, client/Pages build, Worker deployment dry-run, formatting and Git diff whitespace checks all returned exit code 0, recorded in `D:\company site\codesboxs-site\merchant-verification.json`. All four migrations applied only to the fresh isolated local database. Replay returns the original saved inquiry reference; changed-payload conflicts and existing rate-limit/security checks passed. The expanded contact/about/pricing/policy mobile axe checks passed. All rendered internal links/local images and SSR route checks passed. No real Turnstile provider challenge, production credentials, remote DB, actual email inbox, or payment processing was tested.

Use `merchant-verification.json` and `merchant-verified-*.log` in the repository root for the final sequential run, including explicit exit codes. `scripts/merchant-verify.mjs` runs formatting, TypeScript, lint, unit tests, client/Pages/Worker dry-run build, formatting check, isolated real Worker/D1 browser suite, diff check and status sequentially. It uses installed Chrome; no remote writes.

Earlier run: 28/28 units passed. An overlapping repeat had a password-hash test timeout (27/28), with no hash weakening or timeout relaxation. Earlier browser run: 18/20 passed; two responsive overflow assertions failed while assets were being rebuilt. Contact text wrapping/grid minimums and footer wrapping were refined. These historical runs are not final acceptance. Read final logs before claiming a pass.

The first sequential full run passed typecheck/lint/build/format/28 units and 21/23 browser tests. New coverage found a pricing heading-level issue and a replay-test rate-limit collision with prior journeys. Added a semantic H2 before pricing cards and gave the local replay test an isolated documentation-range client IP; production rate-limit code is unchanged. Also corrected Turnstile listener cleanup placement found during source review. A second sequential full run is the acceptance gate, not the earlier partial result.

Desktop (1440) and mobile (390) homepage screenshots from the first sequential run were opened and visually inspected: cards, multi-column/stacked footer, contacts and pricing rendered without observed overlap. These captures are local test mode, not production security evidence. Social links currently use labeled globe icons rather than distinct platform logos; a branded-icon refinement remains optional design follow-up.

Build warnings about bundled lucide `use client` directives and unspecified default Wrangler environment in the existing dry-run command are nonfatal but retained transparently. A successful dry-run is NOT deployment or live binding verification. No fresh production Core Web Vitals, broad cross-browser or manual screen-reader certification is claimed.

## Manual / merchant release gates

- [ ] Match registration documents to exact legal identity and merchant account.
- [ ] Verify supplied address against proof, then approve setting `addressVerified` true and re-test displayed Maps link.
- [ ] Verify control/monitoring of phone, support/general inboxes and six social accounts.
- [ ] Approve actual terms, cancellation/refund eligibility, review/processing deadlines, payment methods, taxes/currency, liability/disputes and governing law with qualified counsel.
- [ ] Approve data retention, processors, transfers, cookie inventory and deletion procedure.
- [ ] Review/publish genuine articles and portfolio evidence; do not submit concepts as client work.
- [ ] Approve pricing/deliverables/timelines/revisions/support; keep unapproved records private.
- [ ] Identify serving deployment; verify bindings, schema, Turnstile, secure admin and actual email delivery.
- [ ] Review final automated results, mobile/desktop screenshots, keyboard and manual assistive-technology behavior.
- [ ] Obtain provider authorization for software/digital-service processing. No third-party/unrelated/gambling routing.
- [ ] Keep checkout disabled until separately implemented approved provider adapter, credentials and verified webhook/reconciliation/refund tests exist. No RapidGateway approval claim.

## Safe deployment instructions — only after explicit approval

1. Review the branch diff and final logs. Preserve unrelated user files; stage only the intended source/tests/migration/documentation. No commit or push was performed by this review.
2. Confirm whether pushing the branch triggers a connected deployment; do not push without approval.
3. Record current production version, routes, bindings and database recovery plan. Approve target database and backup before any remote migration.
4. Use an approved preview environment with its own explicit bindings; apply the four reviewed migrations only to the approved target, never run local helper commands against production.
5. Re-run build and dry-run with explicit production environment after identity of serving deployment is confirmed. Existing `npm run build` uses a default-environment dry-run and must not be mistaken for production validation.
6. After separate approval deploy through the existing authorized Worker or Pages pipeline, not both speculatively. Do not change DNS, overwrite Wrangler targets, or merge as part of a local review.
7. Run read-only route checks, then separately authorize test submissions/admin and provider tests. Retain old version for rollback. An additive schema table can remain during code rollback; do not destroy data to roll back UI changes.

**Release status: review implementation, NO-GO for production/merchant submission until the above owner and integration gates are satisfied.**