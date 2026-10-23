import {
  convertMinor,
  type DisplayCurrency,
  type RateSnapshot,
} from "./currency";
import type { CartItem } from "./guest-commerce";
import { displayCurrencies } from "./currency";

/** All surfaces round the unit once, then multiply, so catalog/cart totals agree. */
export function displayItems(
  items: CartItem[],
  currency: DisplayCurrency,
  fx: RateSnapshot | null,
) {
  return items.map((item) => {
    const amount = item.amountMinor;
    const unit =
      amount === null
        ? null
        : item.currency === currency
          ? amount
          : fx && displayCurrencies.includes(item.currency as DisplayCurrency)
            ? convertMinor(
                amount,
                item.currency as DisplayCurrency,
                currency,
                fx.rates,
              )
            : null;
    const line = unit === null ? null : unit * item.quantity;
    if (line !== null && !Number.isSafeInteger(line))
      throw new Error("Display total overflow");
    return {
      ...item,
      displayCurrency: currency,
      displayMinor: unit,
      displayLineMinor: line,
    };
  });
}
