export const displayCurrencies = ["USD", "PKR", "EUR", "GBP", "AED"] as const;
export type DisplayCurrency = (typeof displayCurrencies)[number];
export type RateSnapshot = {
  rates: Record<DisplayCurrency, string>;
  updatedAt: number;
  nextUpdate: number;
  stale: boolean;
};

// Decimal strings become fixed-point integers. Only the final minor unit is rounded.
function scaled(value: string): bigint {
  if (!/^\d{1,9}(\.\d{1,12})?$/.test(value)) throw new Error("Invalid rate");
  const [whole, fraction = ""] = value.split(".");
  const n = BigInt(whole) * 10n ** 12n + BigInt(fraction.padEnd(12, "0"));
  if (n <= 0n) throw new Error("Rate must be positive");
  return n;
}
export function convertMinor(
  amount: number,
  from: DisplayCurrency,
  to: DisplayCurrency,
  rates: RateSnapshot["rates"],
): number {
  if (!Number.isSafeInteger(amount) || amount < 0)
    throw new Error("Invalid amount");
  if (from === to) return amount;
  const numerator = BigInt(amount) * scaled(rates[to]);
  const denominator = scaled(rates[from]);
  const result = (numerator + denominator / 2n) / denominator;
  if (result > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error("Amount overflow");
  return Number(result);
}

export function validateRates(value: unknown, now = Date.now()): RateSnapshot {
  const data = value as Record<string, unknown>;
  if (!data || data.result !== "success" || data.base_code !== "USD")
    throw new Error("Invalid exchange-rate response");
  const updatedAt = Number(data.time_last_update_unix);
  const nextUpdate = Number(data.time_next_update_unix);
  const seconds = Math.floor(now / 1000);
  if (
    !Number.isSafeInteger(updatedAt) ||
    !Number.isSafeInteger(nextUpdate) ||
    updatedAt > seconds + 300 ||
    updatedAt < seconds - 7 * 86400 ||
    nextUpdate <= updatedAt ||
    nextUpdate > updatedAt + 2 * 86400
  )
    throw new Error("Invalid exchange-rate timestamp");
  const input = data.rates as Record<string, unknown>;
  const rates = {} as RateSnapshot["rates"];
  for (const currency of displayCurrencies) {
    const raw = input?.[currency];
    const rate =
      typeof raw === "number"
        ? raw.toFixed(12).replace(/0+$/, "").replace(/\.$/, "")
        : String(raw);
    scaled(rate);
    rates[currency] = rate;
  }
  if (rates.USD !== "1") throw new Error("Invalid base rate");
  return { rates, updatedAt, nextUpdate, stale: nextUpdate <= seconds };
}
