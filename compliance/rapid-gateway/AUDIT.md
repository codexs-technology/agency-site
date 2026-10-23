# Rapid Gateway readiness audit — October 23, 2026

## Baseline and boundaries

- React/TypeScript/Vite, Hono, Cloudflare D1; Pages advanced-mode adapter exists.
- Local origin: codexs-technology/codesboxs-site; agency remote also exists. Local branch is review/premium-upgrade-2026-10-23, not proof of production mapping.
- Existing uncommitted photography, payment-preparation and legal-review work must not be swept into a release.
- No production changes, migrations, financial transactions or activation authorized.

## Findings before implementation

| Area | Finding |
| --- | --- |
| Catalog | Substantive existing services; separate chatbot, SEO and graphic-design entries missing. Quote-only prices must remain explicit until approved. |
| Pricing | D1 pricing_packages is authoritative for approved prices; three seeded draft quote packages. No FX system. |
| Checkout | Sandbox preparation notice only. No guest cart, checkout or private order lookup. Payment endpoints fail closed. |
| Provider | No verified merchant API contract, sandbox credentials/approval evidence or settlement currencies. Do not activate or invent endpoints. |
| Database | Seven additive migrations; pricing/orders/payment records/events exist. Cart snapshots, guest details, FX cache and payment attempts missing. Production schema not freshly verified. |
| Security | Origin/content-type/body checks, Turnstile, rate limits, hashed sessions and CSRF already exist. New guest endpoints need the same protections and private lookup credentials. |
| Forms | Source supports persistence and honest delivery feedback. Real Turnstile completion and inbox delivery remain unverified; no claim that notifications work. |
| Legal | Five detailed drafts exist from previous task; still awaiting final owner approval. Keep review gates. |
| Address | Owner previously confirmed Nursery, but latest prompt supplies Nersari as a draft requiring document match. No document available: footer publication blocked. |
| Deployment | Historical Pages project agency-site; fresh management API attempt returned 401. Do not infer current production branch or preview DB isolation. |
| UX/SEO | Existing premium layout and service FAQs retained. New private transactional pages must be noindexed, with accessible inputs and truthful empty/error states. Browser/navigation verification follows implementation. |

## Implementation sequence

1. Preserve baseline; add integer-safe currency conversion and validated daily server cache.
2. Add safe additive guest-commerce schema, server-priced cart snapshots, invoice requests and protected status lookup.
3. Add premium guest UI and service-specific quote/package access without registration.
4. Extend authenticated admin read-only collections without relaxing session/CSRF checks.
5. Test migration/API/security/rounding, local browser journey, mobile and accessibility; capture synthetic-data evidence only.
6. Review diff/secrets; prepare feature-branch/PR/preview only if repository mapping and preview isolation can be verified.

## Release gates

Final legal approval; exact document-matched address authorization; approved package prices/taxes/billing; verified provider API and permitted services/currencies; monitored email provider test; fresh Cloudflare authorization and isolated preview DB; owner review of preview before any production action.