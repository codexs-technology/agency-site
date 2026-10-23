import { afterEach, describe, expect, it, vi } from "vitest";
import { currencySnapshot } from "../src/worker/currency";

function cache(payload: unknown) {
  let writes = 0;
  const db = { prepare(query: string) { return {
    bind() { return this; },
    async first() { return payload === null ? null : { payload: JSON.stringify(payload) }; },
    async run() { if (query.includes("currency_snapshots")) writes++; return { meta: { changes: 1 } }; },
  }; } } as unknown as D1Database;
  return { db, writes: () => writes };
}
const seconds = Math.floor(Date.now() / 1000);
const rates = { result: "success", base_code: "USD", rates: { USD: 1, PKR: 278, EUR: 0.9, GBP: 0.8, AED: 3.67 }, time_last_update_unix: seconds - 86401, time_next_update_unix: seconds - 1 };
afterEach(() => vi.unstubAllGlobals());
describe("validated server currency cache", () => {
  it("returns fresh cache without networking", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const { db } = cache({ ...rates, time_last_update_unix: seconds - 1, time_next_update_unix: seconds + 86399 });
    expect((await currencySnapshot(db))?.stale).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("falls back to validated stale cache on provider failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network unavailable")));
    const { db, writes } = cache(rates);
    expect((await currencySnapshot(db))?.stale).toBe(true);
    expect(writes()).toBe(0);
  });
  it("rejects expired cache and invalid upstream data instead of inventing rates", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...rates, base_code: "EUR" }) }));
    const { db } = cache({ ...rates, time_last_update_unix: seconds - 8 * 86400 });
    expect(await currencySnapshot(db)).toBeNull();
  });
});