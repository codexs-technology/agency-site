# Deployment runbook — approval required

## Preflight
1. Complete local checks and inspect REQUIREMENTS.md. Measure browser accessibility and Lighthouse rather than assuming targets were achieved.
2. Review legal drafts, business content and owner-published jobs. Confirm company facts and domain.
3. Confirm the intended Cloudflare account and ensure no existing production application will be overwritten.
4. Present the exact resource names, environment and commands to the owner and obtain approval before any remote action.

## Owner configuration
Create a **separate production environment** in `wrangler.jsonc` with `ENVIRONMENT=production`, the approved HTTPS `PUBLIC_SITE_URL`, real D1 binding `DB`, and production Turnstile public key. Do not reuse the placeholder database ID or development variables. Keep production secrets out of Wrangler source.

After approval, resource setup uses `wrangler d1 create <approved-name>`. Copy the returned database ID into the production binding. Present and approve `wrangler d1 migrations apply <approved-name> --remote --env production` before running it. Migrations create schema and clearly labeled concept/editorial seeds; no jobs or credentials are seeded.

Configure approved secrets with `wrangler secret put <NAME> --env production`: `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, and temporarily `ADMIN_BOOTSTRAP_SECRET`. Validate the email sender/domain in the provider dashboard. `NOTIFICATION_EMAIL` must be a validated business recipient. Enable confirmations only after verifying delivery and unsubscribe behavior.

Do not set `LOCAL_TEST_MODE=true` in production. Local bypass also checks the request hostname and environment. Bootstrap the first administrator over HTTPS using a strong owner-selected password and the private secret, verify login/logout and remove the bootstrap secret.

## Release
After approval: run the production guard, build assets, then `wrangler deploy --env production`. The manual GitHub workflow requires configured Cloudflare secrets and a production environment with required reviewers. Database migration is intentionally not automatic during deployment.

Custom domain routing and DNS are separate approval-requiring changes. Verify domain ownership, existing records, HTTPS and rollback options first. No domain is assumed in this repository.

## Smoke tests on the actual URL
Verify homepage HTML/meta before JavaScript, HTTP 404, assets, sitemap, robots, redirects, API JSON, security headers, production Turnstile, real D1 lead persistence, authenticated access, CSRF rejection, publishing/unpublishing, email provider acceptance and actual inbox receipt. Check mobile journeys and safe error logging. Record deployment identifier, URL, test results and rollback target.

## Caching and limitations
Public HTML and APIs currently use no-store to avoid stale published/private data. Hashed/static assets can use Cloudflare asset caching. Tune SSR query load and cache invalidation after measuring traffic; do not cache session responses. An original 1200×630 raster OG/Twitter preview is now wired; real social-crawler previews still require the final public deployment URL.