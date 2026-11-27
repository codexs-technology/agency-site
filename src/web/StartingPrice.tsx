import { useEffect, useState } from "react";
import { convertMinor, type RateSnapshot } from "../shared/currency";
import { formatMinorAmount } from "../shared/pricing";
import { request } from "./forms";
import { useDisplayCurrency } from "./DisplayCurrency";

let ratesPromise: Promise<RateSnapshot | null> | null = null;
function loadRates() {
  ratesPromise ??= request("/api/guest/rates", undefined, "GET")
    .then((data) => data as unknown as RateSnapshot)
    .catch(() => {
      ratesPromise = null;
      return null;
    });
  return ratesPromise;
}

/** USD on the server and during hydration; converted after the visitor picks a currency. */
export function StartingPrice({ usdMinor }: { usdMinor: number }) {
  const [currency] = useDisplayCurrency();
  const [rates, setRates] = useState<RateSnapshot | null>(null);
  useEffect(() => {
    if (currency === "USD" || rates) return;
    let active = true;
    void loadRates().then((r) => {
      if (active) setRates(r);
    });
    return () => {
      active = false;
    };
  }, [currency, rates]);
  let converted: number | null = null;
  if (currency !== "USD" && rates) {
    try {
      converted = convertMinor(usdMinor, "USD", currency, rates.rates);
    } catch {
      converted = null;
    }
  }
  if (converted === null) return <>{formatMinorAmount(usdMinor, "USD")}</>;
  return (
    <>
      ≈ {formatMinorAmount(converted, currency)}
      <small className="price-approx">
        {formatMinorAmount(usdMinor, "USD")} · estimate
        {rates?.stale ? " (cached rate)" : ""}. Rates By ExchangeRate-API.
      </small>
    </>
  );
}
