# Task-scoped file inventory

All paths below are relative to `D:\company site\codesboxs-site\`.

## Existing files changed by this task

- `.gitignore` — ignore local evidence screenshots.
- `src/shared/content.ts` — three additional services and five guest routes.
- `src/web/Admin.tsx` — authenticated invoice-request navigation.
- `src/web/App.tsx` — guest routing, pricing catalog and service quote actions.
- `src/web/CommercialAdmin.tsx` — draft package creation, read-only inquiry view.
- `src/web/forms.tsx` — guest receipt validation and Turnstile reset.
- `src/worker/api.ts` — mount guest endpoints behind existing security middleware.
- `src/worker/commerce.ts` — package validation/creation and paginated inquiries.
- `src/worker/index.tsx` — private-route noindex header and scheduled FX refresh.
- `tests/pricing.test.ts` — service-bound approved pricing fixture.
- `tests/validation.test.ts` — updated preserved-plus-additional service inventory.

## New implementation/test files

- `src/shared/currency.ts`
- `src/shared/guest-commerce.ts`
- `src/worker/currency.ts`
- `src/worker/guest-commerce.ts`
- `src/web/GuestCommerce.tsx`
- `migrations/0008_guest_commerce.sql`
- `tests/guest-commerce.test.ts`
- `e2e/guest-commerce.spec.ts`

## New documentation

- `compliance/rapid-gateway/AUDIT.md`
- `compliance/rapid-gateway/IMPLEMENTATION.md`
- `compliance/rapid-gateway/MODIFIED-FILES.md`
- `compliance/rapid-gateway/PREVIEW-CHECKLIST.md`
- `compliance/rapid-gateway/VERIFICATION.md`

## Not part of this change

Existing dirty legal policies, legal review notice, photography assets/UI, Gmail state/evidence, legacy payment-preparation files and release helpers are not implicitly approved for staging. Final hash comparison confirms policy files, premium styles/home and payment/types baseline content was preserved.