# Security implementation and pending review

## Implemented controls
- Server-side Zod validation and prepared D1 queries; admin SQL table/column names come only from fixed allowlists.
- Same-origin JSON mutations, per-session CSRF token for authenticated writes, no permissive CORS.
- Random opaque session tokens stored as SHA-256 digests, eight-hour expiration, logout deletion.
- HTTP-only SameSite=Strict cookies; Secure except explicitly enabled localhost testing.
- Bootstrap is secret-gated, rate-limited and closed by an atomic first-administrator insert.
- D1-backed IP rate buckets for submissions, login, bootstrap and applications.
- Turnstile verification checks success and hostname; missing production keys fail closed.
- React escapes content; arbitrary HTML and arbitrary image URLs are not accepted.
- CSP, anti-framing, nosniff, referrer/permissions policy and HTTPS HSTS.
- Notifications avoid including private inquiry bodies. Public error responses contain no stack trace.

## Password hashing
New passwords use standard PBKDF2-HMAC-SHA256 with 600,000 iterations, a random 256-bit salt and 256-bit output through the installed `@noble/hashes` async implementation (`pbkdf2-sha256-v2`). Verify Worker CPU cost and operational limits before production. The provisional `pbkdf2-chain-v1` format remains read-only compatible with disposable local accounts created during testing; no new passwords use it. No enterprise authentication claim is made; MFA, recovery and user provisioning beyond first-admin bootstrap are absent.

## Review before launch
Streaming body limits, honeypots, origin checks, duplicate applications and IP rate limits have local negative integration coverage. Remaining review includes shared-IP implications, identity-based login limits, bootstrap secret handling, production password CPU cost, session rotation, retention/deletion policy and real email/Turnstile configuration. Missing-account logins now use the same standard hash format as new accounts. Consider a vetted authentication provider if administrative risk warrants it.

Follow-up: Hono streaming body-limit middleware and duplicate-application conflict handling have now been added; their negative tests remain subject to the latest E2E result. Standard hashing was exercised in the actual local Worker and took approximately 12–14 seconds per operation on this machine. That latency requires explicit optimization/runtime budgeting before production approval. Provider API acceptance is not equivalent to inbox delivery; the outbox's current `sent` state means the provider accepted the request, not that delivery was independently confirmed.

## Incident response
Revoke sessions, rotate affected secrets through approved Cloudflare operations, preserve safe audit evidence and assess data access. Do not log tokens or private form bodies. Security reports can be sent to the supplied business email; no response SLA is claimed.