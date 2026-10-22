# Premium upgrade implementation checklist — 2026-10-23

Preserve React/TypeScript, Hono, D1, existing fonts, palette, layouts and motion.
No production data overwrite, remote migrations or deployment without approval.

## Inspection findings
- Public collections already support search/filter/pagination and detail routes.
- Current published data is D1-only; missing binding leaves empty collections.
- Form security is deliberately disabled when DB/Turnstile bindings are absent.
  Do not remove the warning without actually configuring and testing integrations.
- Existing careers supports published vacancies only, text application, no R2.
- Current applicant statuses reuse sales-lead labels; separate recruitment states.
- Existing rich-text renderer supports only paragraph/H2, no references or links.
- Existing legal drafts/address verification/payment safeguards must remain.
- Existing untracked handoff/smoke files and production artifacts are unrelated.

## Implementation checklist
- [x] Pricing engagement labels, working CTAs, comparison, FAQs and written fees.
- [x] Twelve honestly labeled concept projects, detail pages and homepage selection.
- [x] Sixteen original researched articles, references, schema and metadata.
- [x] Optimized stock workspace imagery with provenance and clear disclosure.
- [x] Careers apply/status routes; no invented vacancies/general-interest approval.
- [x] Private R2 code; bounded validation and authorized downloads. Real bucket unconfigured.
- [x] Separate applicant credentials; recruitment states and admin review.
- [x] Contact/newsletter diagnostics; fail-closed behavior; explicit newsletter confirmation.
- [x] Sitemap/article tests and Search Console checklist. Existing visible breadcrumbs preserved.
- [ ] TypeScript/lint/format/unit/build/e2e and upload/authorization tests.
- [ ] Review changed files and configuration gates; no unapproved deployment.

Research uses primary vendor documentation and Google Search Central. No keyword
volume, rankings, search trend or guaranteed business outcome is asserted.

## Release blockers
Production DB/Turnstile/email configuration, real private R2 integration/scanning,
approved privacy/retention policy, legal/commercial documents, manual cross-browser
and assistive-technology review, actual inbox receipt and owner release approval.
The implementation checklist is not a production-readiness certification.