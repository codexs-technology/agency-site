import { afterEach, describe, expect, it, vi } from "vitest";
import { emailConfigured, processOutbox } from "../src/worker/email";
import type { Env } from "../src/worker/types";

function environment(recipient = "owner@example.com", attempts = 0) {
  const writes: { sql: string; args: unknown[] }[] = [];
  const DB = {
    prepare(sql: string) {
      let args: unknown[] = [];
      const statement = {
        bind(...values: unknown[]) {
          args = values;
          return statement;
        },
        async run() {
          writes.push({ sql, args });
          return { success: true };
        },
        async first() {
          writes.push({ sql, args });
          return { id: "test-outbox" };
        },
        async all() {
          return {
            results: [
              {
                id: "test-outbox",
                recipient,
                subject: "Receipt",
                text: "Saved <inquiry>",
                attempts,
              },
            ],
          };
        },
      };
      return statement;
    },
  };
  return {
    env: {
      DB,
      RESEND_API_KEY: "test-only",
      EMAIL_FROM: "CodesBoxs <verified@example.com>",
    } as unknown as Env,
    writes,
  };
}
afterEach(() => vi.unstubAllGlobals());
describe("email configuration and outbox logic (mock provider, not live delivery)", () => {
  it("rejects missing or invalid addresses", () => {
    const { env } = environment();
    expect(emailConfigured(env)).toBe(true);
    expect(emailConfigured({ ...env, EMAIL_FROM: "invalid" })).toBe(false);
    expect(emailConfigured({ ...env, NOTIFICATION_EMAIL: "invalid" })).toBe(
      false,
    );
    expect(emailConfigured({ ...env, RESEND_API_KEY: "" })).toBe(false);
  });
  it("does not send when credentials are absent", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { env } = environment();
    await processOutbox({ ...env, RESEND_API_KEY: undefined });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("records provider acceptance and escapes HTML", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetch);
    const { env, writes } = environment();
    await processOutbox(env);
    expect(writes.some((w) => w.sql.includes("status='sent'"))).toBe(true);
    const options = fetch.mock.calls[0][1];
    expect(options.headers["Idempotency-Key"]).toBe("test-outbox");
    expect(JSON.parse(options.body).html).toContain("&lt;inquiry&gt;");
  });
  it("retries sanitized provider failures and stops after five attempts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    );
    for (const attempts of [0, 4]) {
      const { env, writes } = environment("owner@example.com", attempts);
      await processOutbox(env);
      const failure = writes.find((w) => w.sql.includes("last_error=?"));
      expect(failure?.args[0]).toBe(attempts === 4 ? "failed" : "pending");
      expect(failure?.args[2]).toBe("provider_503");
    }
  });
  it("never sends to an invalid stored recipient", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { env, writes } = environment("bad-address");
    await processOutbox(env);
    expect(fetch).not.toHaveBeenCalled();
    expect(writes.some((w) => w.sql.includes("invalid_recipient"))).toBe(true);
  });
});
