# Historical Phase 2 evidence

Superseded operationally by PHASE3.md. Do not follow the earlier branch/PR instructions below. The sole authorized development branch is feature/codesboxs-premium-production in codexs-technology/agency-site. Do not push without production-deployment authorization.

# Phase 2 result — October 23, 2026

## Verified
- Original mixed tree: TypeScript, full ESLint, build/dry-run passed; 95 unit tests passed, then three additional FX cache tests passed independently.
- Extracted feature worktree: TypeScript, full ESLint, build/dry-run, diff checks and 71 unit tests passed. Six task-specific Playwright tests passed, including all 18 service pages at 390/768/1440 widths, axe checks, guest inquiry persistence, idempotency, private lookup and currency persistence.
- Nine additive migrations passed locally and against the **new isolated preview database only**. No production migration was run.
- npm audit: zero known vulnerabilities. Limited release-file secret-pattern/merge-marker scan: no matches; not a substitute for a formal security audit.
- Preview Worker deployed at https://codesboxs-rapid-phase2-preview.codexstechnology.workers.dev using preview DB 1379910f-611a-4194-aa2c-d3cdeb0e8ad3, distinct from production. HTTP routes/catalog/estimate returned 200; inactive payment webhook returned 503.

## Limitations
- No provider connected; no live financial test, transaction, receipt delivery or refund execution claimed.
- Preview Turnstile/email are intentionally unconfigured; secure final inquiry submission is blocked rather than bypassed. Local mock/synthetic tests are not remote notification acceptance.
- First full mixed-tree browser attempt timed out after finding test-bootstrap, changed policy-heading and slow photography-test issues. After correcting these harness assumptions and bounded asset-check concurrency, the full rerun passed **37/37 browser tests** in 12.2 minutes. Evidence: D:\company site\phase2-evidence\final-browser.log. The separate extracted task suite also passed 6/6.
- Feature branch `feature/rapid-readiness-phase2` exists at D:\company site\codesboxs-rapid-phase2. Reviewed task files are staged; commit failed because Git author identity is not configured. No push, PR, main merge or production deployment.
- Task-only extraction excludes unrelated uncommitted photography and legal-policy rewrites; the original premium working tree is retained. Branch inherits earlier committed premium work relative to origin/main; a main-targeted PR needs review of that full inherited diff.

## Owner actions
1. Set the real approved commit identity locally (not a password/token):
   `git -C "D:\company site\codesboxs-rapid-phase2" config user.name "YOUR APPROVED COMMIT NAME"`
   `git -C "D:\company site\codesboxs-rapid-phase2" config user.email "YOUR VERIFIED COMMIT EMAIL"`
   Then resume commit/push and draft PR; do not merge.
2. Approve service scopes/prices/currencies/billing/taxes/revisions/delivery dependencies and final policies. No actual amounts/dates have been invented.
3. Provide exact document-matched address and explicit authorization; Nursery draft is not verified.
4. Supply approved provider API/sandbox documentation and configure secrets through authorized local/dashboard tooling, never chat.
5. Configure preview-domain Turnstile and an authorized test-email sink; complete actual browser verification and inbox tests.
6. Review the isolated preview. Production migration/merge/deployment requires separate explicit approval afterward.

Wrangler OAuth already works. If it expires, use `npx.cmd wrangler login` from D:\company site\codesboxs-site and complete browser login. No Cloudflare password/token needs to be pasted into chat.