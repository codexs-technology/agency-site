/**
 * ISO 4217 minor units for currencies whose CLDR display precision differs.
 * Amounts are stored in ISO minor units (PKR in paisa), but Intl shows PKR
 * without decimals, so dividing by Intl's digits would overstate PKR 100x.
 */
const isoMinorUnits: Record<string, number> = { PKR: 2 };

/** D1 amounts use the currency's minor unit, not an assumed hundredth. */
export function formatMinorAmount(amount: number, currency: string): string {
  if (!Number.isSafeInteger(amount) || amount < 0)
    throw new Error("Invalid minor-unit amount");
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  });
  const digits =
    isoMinorUnits[currency.toUpperCase()] ??
    formatter.resolvedOptions().maximumFractionDigits ??
    2;
  return formatter.format(amount / 10 ** digits);
}
