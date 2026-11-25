# Rapid Gateway Compliance

## Integration Status

Rapid Gateway is integrated as the primary payment provider for CodesBoxs platform. The integration is implemented in `src/worker/rapidgateway-signature.ts` and `src/worker/payments.ts`.

### Endpoints Mounted

- `commerce.get("/:entity", ...)` - Rapid gateway signature verification
- `commerce.post("/pricing", ...)` - Pricing package creation (admin only)
- `commerce.put("/pricing/:id", ...)` - Pricing package updates (admin only)

### Schema Validation

Pricing packages go through `pricingSchema` validation in `src/worker/commerce.ts` which requires:
- `amount_minor: number` (integer, min 0, max 100000000, nullable)
- `currency: string` (3-letter ISO currency code, must be supported by Intl)
- `billing: one_time | recurring | quote`
- `service_slug: string` (must match existing service from content.ts)
- `delivery`, `revisions`, `exclusions`, `disclosures` (all required for published status)
- `approved: 0 | 1` (must be 1 for published)

### Test Coverage

- `e2e/rapidgateway.spec.ts`: Tests rapid gateway signature and payment flow
- `tests/rapidgateway.test.ts`: Unit tests for rapid gateway integration
- `e2e/merchant.spec.ts`: Tests inquiry retries, idempotency, and policy navigation

### Compliance Checklist

- [x] Rapid gateway signature verification implemented
- [x] Pricing schema validates service_slug against content.ts services
- [x] amount_minor must be provided for published packages
- [x] delivery, revisions, exclusions, disclosures required for published status
- [x] billing interval required for recurring (monthly/yearly)
- [x] Currency must be recognized by Intl.supportedValuesOf
- [ ] Webhook endpoint for payment confirmation (not yet implemented)
- [ ] Refund flow testing (not yet implemented)
- [ ] Sandbox/test mode verification (checkout sandbox available at /payments/sandbox)

### Known Limitations

- No live payment collection - online payment collection is disabled per PremiumHome disclaimer
- No provider account activation (RAPIDGATEWAY_SECRET_KEY not configured)
- No webhook signature verification for incoming events
- Refunds and cancellations handled through policy pages only, not payment provider

### Evidence

- `src/worker/rapidgateway-signature.ts` contains HMAC signature verification logic
- `src/worker/payments.ts` contains order creation and payment record logic
- Migration 0003 creates `pricing_packages` and `orders` tables with proper schema
- e2e tests validate inquiry atomicity and idempotency key protection