/** D1 amounts use the currency's minor unit, not an assumed hundredth. */
export function formatMinorAmount(amount: number, currency: string): string {
  if (!Number.isSafeInteger(amount) || amount < 0)
    throw new Error("Invalid minor-unit amount");
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  });
  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  return formatter.format(amount / 10 ** digits);
}
