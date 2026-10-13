# Cloudflare Pages deployment

The frontend build also creates `dist/_worker.js/index.js`, an advanced-mode
Pages Worker. It serves HTML, deep links, APIs and static assets using the
existing application. Do not upload only JS/CSS files without this directory.

## Git-connected Pages settings

- Framework preset: None
- Build command: `npm run build:web`
- Build output directory: `dist`
- Root directory: repository root
- Production branch: `main`

Push the changes and trigger a new deployment. Retrying an old deployment
without the updated commit will not fix the missing homepage.

The adapter always uses production mode and disables the local test bypass.
The public URL defaults to the current request origin, or an explicitly set
`PUBLIC_SITE_URL`. No database credentials are embedded in the frontend.

Without a D1 binding the public pages render with built-in service content
and empty database-backed collections. API requests and administrator access
return HTTP 503 with an honest configuration message. This is a public-site
preview, not a fully configured production application.

## Full functionality

Create and migrate the approved production D1 database and attach it as `DB`
in Pages settings. Configure both production and preview bindings deliberately.
Set `TURNSTILE_SITE_KEY` and the secret `TURNSTILE_SECRET_KEY` before accepting
public submissions. Configure email provider secrets only when verified.
Set a temporary private `ADMIN_BOOTSTRAP_SECRET` for first administrator setup
and remove it afterward. Never enable `LOCAL_TEST_MODE` in deployment.

Pages does not invoke the application's scheduled handler. Scheduled email
outbox retries and session cleanup still require a separate scheduled Worker,
or deployment of the complete application to Workers. Do not claim automated
email processing is operational from this Pages deployment alone.

Validate homepage HTML, assets, contact and service deep links, real 404s,
database persistence and security on the deployed URL. Existing production
approval and legal-review gates remain applicable.