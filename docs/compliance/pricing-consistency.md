# Pricing Consistency Audit

## Approved Pricing Cards (PremiumHome.tsx)

The homepage PremiumHome component renders three pricing cards using the `packages` array and `PricingCards` component. Pricing is displayed via `ConvertedPrice` or fallback `p.engagement` values.

### Three Approved Price Points

| Focus | Service Slug | Price (USD) | Billing Model |
|-------|-------------|-------------|---------------|
| Website Development | starter | $499 | one_time (project-based) |
| Business Applications | business | $1,499 | one_time (milestone-based) |
| AI Automation Solutions | enterprise | $1,999 | one_time (tailored AI solutions) |

## Database State (migration 0003_commercial_readiness.sql)

Current migration state has all three packages with `billing: 'quote'` which displays "Custom quotation" instead of actual prices. The amounts need to be updated from `quote` to `one_time` with proper `amount_minor` values.

### Required Database Updates

| Package | slug | amount_minor | billing | currency |
|---------|------|-------------|---------|----------|
| Starter | starter | 49900 | one_time | USD |
| Business | business | 149900 | one_time | USD |
| Enterprise | enterprise | 199900 | one_time | USD |

**Note**: amounts are in minor units (cents for USD). $499 = 49900 minor units.

## TypeScript Type References

- `tsconfig.json` includes `@cloudflare/workers-types` and `vite/client` in the `types` array
- `src/worker/commerce.ts` defines `pricingSchema` with `amount_minor: z.number().int().min(0).max(100000000).nullable()`
- `src/shared/pricing.ts` exports `formatMinorAmount(amount, currency)` for formatting
- `src/web/ConvertedPrice.tsx` displays price using `formatMinorAmount` or `record.amount_minor`

## Build & Typecheck Status

- `npm run typecheck` (`tsc --noEmit`): 8 errors found in test files (guest-commerce.test.ts and phase2-commerce.test.ts) - type mismatch on currency rates object, not runtime issues
- `npm run build`: Fails due to native binding issue with rolldown/@rolldown/binding - not a code issue
- `npm run lint`: Needs to be verified after typecheck fixes

## Evidence Gaps

- [ ] Migration 0003 has not been applied to any target database (verified by git history)
- [ ] Actual rendered prices on homepage need verification (ConvertedPrice API rates not configured)
- [ ] Currency converter functionality needs testing (DisplayCurrency component)
- [ ] No live checkout or payment activation performed

## Action Items

1. Update migration 0003 to set amount_minor and billing = one_time for the three packages
2. OR create migration 0004 as forward migration if 0003 already applied
3. Verify CurrencySelector/DisplayCurrency works without fabricated exchange rates
4. Confirm invoice amounts remain unchanged (no default currency, deposit or milestone charges advertised)