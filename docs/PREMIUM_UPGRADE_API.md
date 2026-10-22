# Upgrade routes and API contract

## Public pages
Existing About, Pricing, Portfolio, Blog and Careers remain in their existing
layout. Added: `/careers/apply`, `/careers/application-status`,
`/newsletter/confirm`, twelve `/portfolio/:slug` and sixteen `/blog/:slug` routes.
Source-controlled content is crawlable without D1 and is not editable through
the current D1 admin editor. Matching owner-published D1 slugs override it.

## APIs
- `POST /api/recruitment/submit`: same-origin multipart, approved private R2
  binding and published job required. Fields match recruitmentSchema; required
  `resume`, optional `cover_file`. Receipt requires `stored:true`, `id`,
  `accessKey`. No real collection enabled by default.
- `POST /api/recruitment/status`: JSON `{reference,accessKey}`; only minimal
  position/status/date returned. No name, email or documents returned.
- `POST /api/recruitment/withdraw`: same private credentials; marks Withdrawn.
- `GET /api/admin/applications/:id/documents/resume|cover`: authenticated
  attachment download with audit entry; no R2 public URL.
- `PATCH /api/admin/applications/:id/status`: existing session/CSRF/origin
  authorization, now seven recruitment-specific statuses.
- `POST /api/newsletter/confirm`: JSON `{token}` from confirmation email; explicit
  user action, expiration and single-use verification required.
- `PATCH /api/admin/subscribers/:id/status`: authenticated/CSRF-protected
  unsubscribe only; staff cannot override the email confirmation requirement.

Existing contact/project/newsletter APIs retain storage acknowledgements and
failure input preservation. Legacy text-only job endpoint remains compatible.
Notifications are durable outbox entries, not proof of inbox delivery.

## Required release order
Owner review → identify actual serving project → backup/restore check → apply
additive migrations → configure environment bindings/secrets → test approved
preview → authorize production submissions → owner-approved workflow dispatch.
No production bucket/database provisioning or remote data changes were performed.

## Validation evidence
Final validation completed successfully on 2026-10-23:
- TypeScript, ESLint, formatting, production build and git diff checks passed.
- Unit tests: 45/45 across ten files.
- Initial full Chromium run: 26/28; outdated WebP assertion and receipt timing
  assertion corrected. Final targeted rerun: 9/9, including both failures plus
  D1/auth/CSRF/newsletter, contact/project and all new upgrade browser tests.
- Production Worker dry-run passed; no deployment or remote migration performed.
- All six migrations applied successfully to an isolated local test database.
The entire 28-test suite was not rerun after the final small changes; the focused
9-test run covers changed workflows. Do not report 28/28 final-suite completion.

Latest final results: `upgrade-final-results.json` and `upgrade-final-*.log` in
the local workspace (not committed as generated artifacts). Unit coverage includes
45 tests; recruitment HTTP tests use isolated D1/R2 doubles. Local browser tests
use actual Wrangler/D1 with all six migrations. A real private R2 integration,
malware handling, actual email delivery and manual cross-browser/assistive-tech
checks remain release blockers.