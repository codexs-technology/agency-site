# Premium upgrade handoff — 2026-10-23

## Release boundary
Implementation is local until a reviewed commit is explicitly released. Do not
run remote migrations, enable uploads, activate payments or deploy without owner
approval. Existing legal drafts and missing verified address warnings remain.

## Added public content
- Twelve original concept studies in `src/shared/portfolio.ts`, all explicitly
  not client work; source-controlled content merges after owner-published D1
  records, deduplicated by slug. No content migration or overwrite required.
- Sixteen original editorial articles in `src/shared/editorial.ts`, written on
  2026-10-23 (Pakistan local date). No search-volume/trending/ranking claim.
  Primary vendor references are displayed on each article; no fabricated author
  biography, testimonial or commercial outcome.
- Local original SVG editorial/concept artwork (vector, no raster compression
  needed); About/Careers use a 104 KB WebP stock office image. Original article
  artwork is intentionally illustrative, not photographs of real projects.
- Careers apply/status routes; no speculative vacancy or general-interest form.
- Proposal labels, comparison, FAQ and working inquiry links. No fixed fees.

## Private recruitment configuration
- Apply `0005_recruitment.sql` only after backup/restore/rollback review.
- Bind an owner-created **private** R2 bucket as `APPLICATION_DOCUMENTS`. Do not
  enable r2.dev public access or a public custom domain. No bucket is provisioned
  by this change, and no placeholder production bucket name is committed.
- Production R2 binding is environment-specific. Pages needs a dashboard binding
  and Worker deployments need an explicit `env.production.r2_buckets` entry.
- `APPLICATION_UPLOADS_APPROVED=true` is a separate owner activation gate. Keep
  false/unset until retention, access, safe document handling and privacy terms
  are approved. Never use a production bucket for local tests.
- File limits: 5 MB each, 11 MB request, PDF/DOCX allowlist and structural checks,
  rejection of common active-content markers. **Not a PDF/ZIP parser, antivirus,
  content disarm service or guarantee of safety**. Agree a scanning/quarantine
  workflow before handling real applicants. Staff must treat downloads as
  untrusted. Downloads require admin session and are attachment/octet-stream.
- Reference plus separate random 256-bit access key; only its SHA-256 hash is
  stored. Key is displayed once, not in URL/email. Lost-key recovery is manual
  and requires an owner-approved identity review; no insecure public reset.
- D1 insert and notification outbox are batched after R2 upload. Compensating R2
  delete occurs on persistence failure; abrupt process termination can still
  leave an orphan object. Add an approved orphan reconciliation/retention job
  before sustained production use. No automated document deletion is enabled.
- Existing text-only `/api/jobs/:id/apply` remains backward compatible; older
  applications have no status credential or uploaded documents. Their status
  access must not be inferred from their public reference.

## Newsletter
- Apply additive `0006_newsletter_confirmation.sql` after backup review.
- New requests remain unsubscribed until explicit email-token confirmation.
  24-hour hashed token, rate limits, single-use confirmation and unsubscribe.
- Legacy subscribers are not silently marked confirmed. Any future campaign or
  export for marketing MUST require status=subscribed AND confirmed_at IS NOT NULL.
- Set `SEND_CONFIRMATIONS=true`; configure verified sender and delivery provider.
  Otherwise requests can be recorded but confirmation delivery remains blocked.
  No bulk campaign sender is implemented.

## Contact production root-cause evidence
Read-only live check on 2026-10-23 local / 2026-10-22 22:43 UTC:
`/api/services` returned 503 with the missing-bindings guard message; `/contact`
returned 200, empty public Turnstile key and truthful unavailable notice. This
matches a deployment lacking DB and/or required security configuration, not a
frontend success-state problem. Actual serving project/version remains unverified.

Required before claiming forms fixed in production:
1. Identify serving Cloudflare Pages/Worker project and exact version.
2. Verify D1 binding and migration state, backup and restore procedure.
3. Configure matching Turnstile site/secret keys and approved domain.
4. Configure RESEND_API_KEY, verified EMAIL_FROM, NOTIFICATION_EMAIL and
   SEND_CONFIRMATIONS; confirm actual inbox ownership and receipt.
5. Verify durable outbox retry scheduling. Pages does not execute Worker cron.
6. Authorize labeled production submissions; verify record persistence, duplicate
   handling, abuse controls and actual email receipt. Do not assume a queued email
   was delivered. No live form submissions performed for this upgrade.

## Search Console and indexing checklist
- Owner verifies domain property using DNS; never invent verification tokens.
- Confirm production canonical host, HTTPS redirects and useful server HTML.
- Submit `/sitemap.xml`; inspect home, services, concept and article URLs.
- Confirm status, admin and token pages excluded/noindex; legal drafts remain so.
- Validate Article markup against visible authorship/date/content.
- Review mobile usability, page indexing, manual actions and available field CWV.
- Request indexing only after production and policy review. No indexing/ranking
  or Core Web Vitals pass is guaranteed by a local build.

## Asset provenance
`public/images/workspace.webp`: Unsplash image identifier
`photo-1497366754035-f200968a6e72`, downloaded as WebP via
`scripts/prepare-workspace-image.mjs`. Illustrative stock workspace, never company
premises or staff. Source/license review: https://unsplash.com/license .
All files in `public/images/concepts` and `public/images/editorial` are original
local generated vector graphics; reproducible via `scripts/generate-upgrade-art.mjs`.

## Outstanding quality limits
Manual screen-reader, Safari/Firefox and actual-device review remain required.
Article drafts are concise, approximately 400–500 words each; the title “Complete
2026 Guide” should undergo editorial review if a substantially longer guide is
expected. No paid keyword research or numerical trend data was available.
Owner legal identity/address/NTN and approved commercial/privacy/refund terms,
processor permission, hiring/retention approvals and production configuration
remain blockers. This is not a claim of production readiness or processor approval.