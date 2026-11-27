import { afterEach, describe, expect, it, vi } from "vitest";
import { convertMinor } from "../src/shared/currency";
import { formatMinorAmount } from "../src/shared/pricing";
import { packageStartingPrices } from "../src/shared/service-pricing";
import { guestCommerce } from "../src/worker/guest-commerce";

const seconds = Math.floor(Date.now() / 1000);
const provider = {
  result: "success",
  base_code: "USD",
  rates: { USD: 1, PKR: 278.25, EUR: 0.9, GBP: 0.8, AED: 3.6725 },
  time_last_update_unix: seconds - 60,
  time_next_update_unix: seconds + 86000,
};
const brokenDb = {
  prepare() {
    throw new Error("no such table: currency_snapshots");
  },
} as unknown as D1Database;

afterEach(() => vi.unstubAllGlobals());

describe("starting prices and display currency", () => {
  it("formats PKR amounts in ISO minor units instead of overstating them 100x", () => {
    const pkr = convertMinor(packageStartingPrices.starter, "USD", "PKR", {
      USD: "1",
      PKR: "278.25",
      EUR: "0.9",
      GBP: "0.8",
      AED: "3.6725",
    });
    expect(formatMinorAmount(pkr, "PKR").replace(/\s/g, " ")).toBe(
      "PKR 138,847",
    );
    expect(formatMinorAmount(packageStartingPrices.business, "USD")).toBe(
      "$1,499.00",
    );
  });

  it("serves display rates even when the D1 rate cache is unavailable", async () => {
    const fetch = vi.fn(async () => Response.json(provider));
    vi.stubGlobal("fetch", fetch);
    const response = await guestCommerce.request(
      "/rates",
      {},
      { DB: brokenDb },
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { rates: Record<string, string> };
    expect(body.rates.PKR).toBe("278.25");
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("never invents rates when the provider fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("down", { status: 503 })),
    );
    const response = await guestCommerce.request(
      "/rates",
      {},
      { DB: brokenDb },
    );
    expect(response.status).toBe(503);
  });
});
