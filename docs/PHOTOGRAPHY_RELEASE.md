# CodesBoxs photography release — October 23, 2026

## Scope

Preserves six featured homepage projects and ten services. Completes all fourteen currently published concept projects (including database-seeded projects) and nineteen articles. Listing, detail, related-content and concept gallery photography uses slug-based mappings. Article Open Graph/Twitter images use the same local photo. Owner-supplied images and nonconcept project images remain untouched. Text, authors, dates, claims, layouts and commercial configuration are unchanged.

All imagery is contextual stock, not delivered-client screenshots, staff portraits, endorsement or transaction evidence. Each project and each article has a distinct photo within its collection. Some photography is reused across different collections when the subject is relevant, avoiding duplicate files. Supporting concept galleries deliberately repeat that project's contextual photo rather than inventing product screenshots.

## Assets and provenance

81 local WebP variants: 27 source subjects at 320, 640 and 960px. This includes 51 preserved homepage assets and 30 new variants from ten additional sources. Sources and license URLs, dimensions, bytes and SHA-256 are recorded in `public/images/photography/manifest.json`. Mappings live in `src/web/Photography.tsx`; acquisition inputs are `scripts/homepage-photo-sources.json` and `scripts/release-photo-sources.json`.

Pexels license was checked October 23, 2026. The license permits website use and editing without mandatory credit; do not imply endorsement, resell unaltered copies, redistribute as stock, or use photographs as trademarks. Photographer metadata is preliminary unless the manifest explicitly records a name found on a successfully fetched source page; no public formal photographer credits were added based on unverified names. Source-page access checks are recorded in the local evidence. The photo source pages remain the authoritative provenance reference; some may restrict automated access.

## Release isolation

Original dirty tree: `D:\company site\codesboxs-site`.

Isolated candidate: `D:\company site\codesboxs-photography-release`, based on production commit `0e9466ce47e62aaac1afb6f2c6ffd2d387f65c21`.

Only image-specific changes were transferred. `App.tsx` excludes the sandbox checkout import/route. The worker was reconstructed from its committed version with only article photography metadata changes. No payment implementation, content payment route, provider adapter, API, schema, migration, production configuration or credentials are in the approved file list. No original uncommitted work was discarded. On Windows the isolated checkout required LF normalization for the existing formatter; this is not intended to produce unrelated staged changes.

## Validation and evidence

Validation results and actual logs are under `artifacts/photography-release/` in the candidate tree. They cover TypeScript, ESLint, formatting, unit tests, production build, Pages bundle render, Cloudflare production dry-run, browser content/image regression, existing homepage/link/journey/API tests, and Git whitespace. Browser regression traverses all fourteen projects and nineteen posts at desktop/tablet/mobile widths, collection pagination, social imagery, image decode/HTTP results, console/page errors and overflow. Existing homepage coverage exercises card hover animation.

Actual screenshots are captured for homepage, Portfolio, Blog and representative details on desktop/mobile, without production style overrides. The previous homepage before/after screenshots remain in the original tree's `artifacts/homepage-images/`.

Cloudflare Pages was verified read-only as project `agency-site`, GitHub source `codexs-technology/agency-site`, production branch `feature/codesboxs-premium-production`, custom domain `codesboxs.com`. Deployment is only permitted after every mandatory check succeeds, through a normal non-force Git push. No Worker deployment or database migration is authorized by this release script.

Final commit/deployment IDs and live verification are recorded separately in the original tree's `artifacts/photography-release/release-result.json` and live verification reports, because those IDs cannot be known before creating this commit. A static HTTP 200 does not prove email delivery or payment processing. Payments must remain disabled; recruitment uploads must not be enabled.