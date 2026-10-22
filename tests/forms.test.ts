import { afterEach, describe, expect, it, vi } from "vitest";
import { request } from "../src/web/forms";

afterEach(() => vi.unstubAllGlobals());

describe("truthful public form receipts", () => {
  it("rejects failed HTTP, non-JSON, null and incomplete successful responses", async () => {
    for (const response of [
      Response.json({ error: "Storage unavailable" }, { status: 503 }),
      new Response("<html>Maintenance</html>"),
      Response.json(null),
      Response.json([]),
      Response.json({}),
      Response.json({ stored: false, id: "a".repeat(64), message: "Saved" }),
      Response.json({ stored: true, message: "Saved" }),
    ]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response));
      await expect(
        request("/api/contact", { name: "Receipt test" }),
      ).rejects.toThrow();
    }
  });
  it("requires storage acknowledgement for newsletter subscriptions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(Response.json({ message: "Subscribed" })),
    );
    await expect(request("/api/newsletter/subscribe", {})).rejects.toThrow(
      "Receipt is not confirmed",
    );
  });
  it("accepts committed references without claiming notification delivery", async () => {
    const receipt = {
      stored: true,
      id: "a".repeat(64),
      message: "Saved; delivery unconfirmed",
      notification: "blocked",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(Response.json(receipt)),
    );
    expect(await request("/api/contact", {})).toEqual(receipt);
  });
  it("preserves the existing job receipt contract", async () => {
    const receipt = {
      stored: true,
      id: "b".repeat(64),
      notification: "blocked",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(Response.json(receipt)),
    );
    expect(await request("/api/jobs/example/apply", {})).toEqual(receipt);
  });
});
