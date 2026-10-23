import { useSyncExternalStore } from "react";
import { displayCurrencies, type DisplayCurrency } from "../shared/currency";

const key = "codesboxs-display-currency-v1";
let current: DisplayCurrency = "USD";
const listeners = new Set<() => void>();
function snapshot(): DisplayCurrency {
  try {
    const stored = localStorage.getItem(key);
    if (displayCurrencies.includes(stored as DisplayCurrency))
      current = stored as DisplayCurrency;
  } catch {
    /* Private browsing may disable persistence. */
  }
  return current;
}
export function useDisplayCurrency() {
  const currency = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    snapshot,
    () => "USD" as DisplayCurrency,
  );
  return [
    currency,
    (value: DisplayCurrency) => {
      current = value;
      try {
        localStorage.setItem(key, value);
      } catch {
        /* In-memory fallback. */
      }
      listeners.forEach((listener) => listener());
    },
  ] as const;
}
export function CurrencySelector() {
  const [currency, setCurrency] = useDisplayCurrency();
  return (
    <label className="field">
      Display currency
      <select
        value={currency}
        onChange={(event) => setCurrency(event.target.value as DisplayCurrency)}
      >
        {displayCurrencies.map((code) => (
          <option key={code}>{code}</option>
        ))}
      </select>
    </label>
  );
}
