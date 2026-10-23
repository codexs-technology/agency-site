import { useEffect, useState } from "react";
import { formatMinorAmount } from "../shared/pricing";
import { request } from "./forms";
import { useDisplayCurrency } from "./DisplayCurrency";

type Price = {
  id: string;
  displayMinor: number | null;
  displayCurrency: string;
};
type Catalog = {
  packages: Price[];
  rateUpdatedAt: number | null;
  rateStale: boolean;
};
const pending = new Map<string, Promise<Catalog>>();
function catalog(currency: string) {
  const key = `${currency}:${Math.floor(Date.now() / 60000)}`;
  if (!pending.has(key)) {
    pending.clear();
    pending.set(
      key,
      request(`/api/guest/catalog?currency=${currency}`, undefined, "GET")
        .then((data) => data as unknown as Catalog)
        .catch((error) => {
          pending.delete(key);
          throw error;
        }),
    );
  }
  return pending.get(key)!;
}
export function ConvertedPrice({
  record,
}: {
  record: Record<string, unknown>;
}) {
  const [currency] = useDisplayCurrency();
  const [result, setResult] = useState<{
    currency: string;
    data: Catalog;
  } | null>(null);
  useEffect(() => {
    let active = true;
    catalog(currency)
      .then((data) => {
        if (active) setResult({ currency, data });
      })
      .catch(() => {
        if (active) setResult(null);
      });
    return () => {
      active = false;
    };
  }, [currency]);
  const data = result?.currency === currency ? result.data : null;
  const price = data?.packages.find((item) => item.id === record.id);
  if (record.approved !== 1 || record.status !== "published")
    return <>Quotation pending approval</>;
  if (record.amount_minor === null || record.billing === "quote")
    return <>Custom quotation</>;
  return (
    <>
      {price?.displayMinor != null
        ? formatMinorAmount(price.displayMinor, price.displayCurrency) +
          " estimated display"
        : formatMinorAmount(
            Number(record.amount_minor),
            String(record.currency),
          ) + " base price; conversion unavailable"}
      <small style={{ display: "block", fontSize: "0.75rem" }}>
        {data?.rateUpdatedAt
          ? `Rates: ${new Date(data.rateUpdatedAt * 1000).toISOString()}${data.rateStale ? " (stale cached estimate)" : ""}. `
          : ""}
        Display only; settlement currency is not activated. Rates By
        ExchangeRate-API.
      </small>
    </>
  );
}
