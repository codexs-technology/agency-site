# HISTORICAL ONLY — superseded by Phase 3

Do not create a PR or publish a Phase 2 branch. The sole authorized destination is codexs-technology/agency-site, existing branch feature/codesboxs-premium-production. Pushing can deploy production and requires explicit approval. See PHASE3.md. The earlier draft below is retained only as historical context.

# Draft PR: guest commerce, consistent display currency and disabled payment ledger

Target repository: codexs-technology/codesboxs-site. Head: feature/rapid-readiness-phase2.

## Scope
- Preserve 18 service pages and premium design, add quote-only centralized scope defaults.
- Persist USD/PKR/EUR/GBP/AED display preference across homepage, services, catalog, cart and checkout; server-calculated estimates with validated FX fallback and timestamps.
- Preserve private guest inquiry flow; no issued invoice, processor, charge or financial success is implied.
- Add disabled provider-independent lifecycle and transactional event/audit ledger with mock/SQLite tests and additive migration 0009.
- Gate address on document match and explicit owner approval.

## Important review constraints
- This branch is based on reviewed premium commit 0e9466c, ahead of origin/main. A PR against main includes earlier premium work; review the complete inherited diff. No merge is authorized.
- Uncommitted photography and unrelated legal drafts remain in the original worktree and are not swept into this task commit.
- Production Pages is connected to a different repository (agency-site) and branch. Do not change that connection or deploy this branch to production.
- Prices, taxes, dates, refund policies, KYC address and provider contract remain owner/provider approval items.
- Public preview must use wrangler.preview.json and the separate preview D1, with test mode disabled and no production secrets.

See PHASE2.md and VERIFICATION.md for evidence and limitations. Automated mocks are not live provider certification or a claim of full Rapid Gateway compliance.