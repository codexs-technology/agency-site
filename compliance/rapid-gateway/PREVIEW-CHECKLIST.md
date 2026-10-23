# Preview and production checklist

## Preview gate — blocked, no deployment made

- [x] Recheck origin: `codexs-technology/codesboxs-site`; remote HEAD is `main`, observed October 23, 2026.
- [ ] Restore authorized Cloudflare management access. Fresh read-only project listing returned HTTP 401.
- [ ] Confirm actual production target (Pages versus Workers), connected repository, production branch, preview branches and automatic deployment behavior.
- [ ] Confirm preview database is isolated from every production database and preview cannot send real emails or initiate financial transactions.
- [ ] Extract this task's changes from the dirty review baseline; do not stage unrelated photography, Gmail records or unapproved legal drafts.
- [ ] Create a new feature branch, descriptive commit and PR against the verified base. Do not push the old review branch.
- [ ] Apply migration 0008 to the isolated preview DB only after confirming existing migrations and backup/recovery procedures.
- [ ] Configure preview Turnstile with matching hostname; verify server validation with an actual challenge.
- [ ] Build using the verified target adapter and deploy preview only. Do not use the existing production workflow as a preview shortcut.
- [ ] Verify homepage, catalog, pricing, new guest routes, admin authorization and policy routes on preview.
- [ ] Review genuine screenshots with owner; do not describe local screenshots as deployed evidence.

## Owner and provider gates

- [ ] Final approval of five legal policies, including new guest-request retention/cookie and FX processing disclosures where applicable.
- [ ] Exact address copied from verification document; resolve Nursery/Nersari spelling, postal code and legal identity evidence. Do not publish a draft as verified.
- [ ] Approve service/package prices, delivery estimates, taxes, recurring intervals, limits and add-ons. No fabricated amount is currently seeded.
- [ ] Obtain verified provider API specification, merchant approval for disclosed services, sandbox access and supported settlement currencies.
- [ ] Implement provider adapter, signed webhook processing, reconciliation, transaction/refund state persistence and actual sandbox tests before payment activation. Current state-transition helper is not a live adapter.
- [ ] Test configured email delivery to authorized recipients; request persistence does not imply email delivery.
- [ ] Complete site-wide link/image/mobile/a11y/SEO and dependency review beyond the scoped checks.

## Production — requires explicit approval AFTER preview review

- [ ] Receive explicit owner approval to deploy this reviewed preview.
- [ ] Snapshot production DB; confirm current schema and additive migration plan; separately approve any production migration.
- [ ] Confirm secrets by binding names/presence only; no secret values in logs, PR or screenshots.
- [ ] Re-run typecheck, tests, build, lint, formatting, secret scan and diff checks on clean release tree.
- [ ] Deploy through freshly verified existing workflow; monitor deployment and rollback readiness.
- [ ] Verify live homepage, 18 service pages, pricing, guest APIs/routes, contact and five legal pages.
- [ ] Record commit, PR, deployment ID, URL, test results and unresolved issues. Never perform a real financial transaction as QA.