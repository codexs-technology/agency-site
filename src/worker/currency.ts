import { validateRates, type RateSnapshot } from "../shared/currency";

/** Daily lazy refresh also works on Pages, where scheduled handlers are not invoked. */
export async function currencySnapshot(
  db: D1Database,
): Promise<RateSnapshot | null> {
  const now = Math.floor(Date.now() / 1000);
  const row = await db
    .prepare("SELECT payload FROM currency_snapshots WHERE id='USD'")
    .first<{ payload: string }>();
  let cached: RateSnapshot | null = null;
  if (row) {
    try {
      cached = validateRates(JSON.parse(row.payload));
    } catch {
      /* Reject corrupt/obsolete cache. */
    }
  }
  if (cached && cached.nextUpdate > now) return cached;
  const lock = await db
    .prepare(
      "INSERT INTO currency_refresh_lock(id,retry_after) VALUES('USD',?) ON CONFLICT(id) DO UPDATE SET retry_after=excluded.retry_after WHERE retry_after<=?",
    )
    .bind(now + 3600, now)
    .run();
  if (lock.meta.changes) {
    try {
      const response = await fetch("https://open.er-api.com/v6/latest/USD", {
        signal: AbortSignal.timeout(6000),
      });
      if (!response.ok) throw new Error("Rates unavailable");
      const payload: unknown = await response.json();
      const fresh = validateRates(payload);
      if (fresh.stale) throw new Error("Provider rate is stale");
      await db
        .prepare(
          "INSERT INTO currency_snapshots(id,payload,updated_at,next_update) VALUES('USD',?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at,next_update=excluded.next_update",
        )
        .bind(JSON.stringify(payload), fresh.updatedAt, fresh.nextUpdate)
        .run();
      return fresh;
    } catch {
      /* Retain verified cache for up to seven days; never invent rates. */
    }
  }
  return cached ? { ...cached, stale: true } : null;
}
