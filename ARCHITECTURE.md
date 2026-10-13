# Architecture

## Boundaries
- `src/shared`: typed public content, validation and page metadata.
- `src/web`: React public and admin components, accessible responsive styling.
- `src/worker`: Hono API, server-side React rendering, authentication and integrations.
- `migrations`: versioned D1 schema and safe original editorial/concept seed.
- `public/images`: original SVG artwork, locally served, no licensing dependency.
- `tests`: unit and real local Worker/D1 integration; `e2e`: browser journeys.
- `scripts`: build/runtime/bootstrap helpers. `docs`: operational runbooks.

## Rendering and hosting
Vite bundles the hydration entry and CSS into `dist`. Wrangler bundles the Worker separately. The Worker serves all HTML routes using React server rendering with hydrated interactive controls. Static assets are delegated to the ASSETS binding; APIs never fall through to HTML. Dynamic published content is loaded from D1 for SSR. Unknown pages return HTTP 404. Admin HTML is noindex and private; its data APIs require a session.

## Data and trust
Browser -> same-origin Worker -> bound D1. Server validates all data with Zod and prepared SQL, with a streaming request body limit. No localStorage lead database. Random opaque session tokens are hashed before storage. HTTP-only, Secure, SameSite cookies; same-origin checks plus per-session CSRF token for admin mutations. Bootstrap requires an environment secret and is disabled after the first administrator. Password hashing uses standard PBKDF2-SHA256 through the installed Workers-compatible @noble/hashes library; Web Crypto supplies random tokens and digests. Parameters and measured local cost are documented.

## Integrations
Turnstile verification occurs server-side and fails closed when production configuration is missing. Explicit local-only bypass is never active on a public host. Resend notifications use an outbox with recorded delivery states/retry attempts; submission persistence and email delivery are separate outcomes. No analytics or advertising cookies are enabled by default. Optional R2 resume storage is deferred unless configuration and safe upload validation exist.

Newsletter persistence and optional confirmation insertion share a D1 batch. An already-subscribed address does not create duplicate receipts; re-subscription rotates the stored hashed unsubscribe token. Invalid/replaced tokens fail explicitly. Sender and recipient email configuration is validated before the outbox sends. `sent` denotes provider acceptance, not inbox receipt. Published admin-created service slugs are rendered by the Worker, listed publicly and included in the sitemap; the original thirteen services retain their specific capabilities and deliverables.

## Production controls
Local operations are allowed. Remote database changes, secret creation, DNS, deployments and remote push must not occur without authorization. Production domain/database identifiers are owner configuration, not invented facts. All compliance/performance claims require measured evidence.