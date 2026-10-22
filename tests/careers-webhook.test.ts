import { afterEach, describe, expect, it, vi } from "vitest";
import {
  careersConfigured,
  deliverCareers,
  toBase64,
} from "../src/worker/careers-webhook";
import type { Env } from "../src/worker/types";

const env = {
  CAREERS_WEBHOOK_URL: "https://script.google.com/macros/s/test/exec",
  CAREERS_WEBHOOK_SECRET: "x".repeat(64),
} as Env;
const payload = {
  name: "Synthetic Applicant",
  email: "test@example.com",
  position: "Test role",
  reference: "a".repeat(64),
  coverLetter: "Synthetic test",
  files: [],
};
afterEach(() => vi.unstubAllGlobals());
describe("Gmail transport contract with mocked HTTP (not inbox delivery)", () => {
  it("rejects unsafe configuration", () => {
    for (const url of [
      "http://script.google.com/macros/s/test/exec",
      "https://evil.example/exec",
      "https://script.google.com/macros/s/test/dev",
      "https://script.google.com/macros/s/test/exec?secret=x",
    ])
      expect(careersConfigured({ ...env, CAREERS_WEBHOOK_URL: url })).toBe(
        false,
      );
    expect(toBase64(new Uint8Array([0, 255, 1]))).toBe("AP8B");
  });
  it("follows Google ContentService redirect with GET and no secret", async () => {
    const mock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: {
            Location:
              "https://script.googleusercontent.com/macros/echo?key=test",
          },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          version: 1,
          reference: payload.reference,
          ok: true,
          state: "sent",
        }),
      );
    vi.stubGlobal("fetch", mock);
    expect((await deliverCareers(env, payload)).state).toBe("sent");
    expect(mock.mock.calls[1][1]).toMatchObject({ method: "GET" });
    expect(mock.mock.calls[1][1].body).toBeUndefined();
    expect(mock.mock.calls[1][1].headers).toBeUndefined();
  });
  it("never retries timeouts, non-JSON, quota, mismatched acknowledgements or hostile redirects", async () => {
    const responses = [
      new Response("login", { headers: { "Content-Type": "text/html" } }),
      new Response(null, {
        status: 302,
        headers: { Location: "https://evil.example" },
      }),
      Response.json({
        version: 1,
        reference: "b".repeat(64),
        ok: true,
        state: "sent",
      }),
      new Response("quota", { status: 429 }),
      Response.json({
        version: 1,
        reference: payload.reference,
        state: "pending",
      }),
    ];
    for (const response of responses) {
      const mock = vi.fn().mockResolvedValue(response);
      vi.stubGlobal("fetch", mock);
      expect((await deliverCareers(env, payload)).state).toBe("pending");
      expect(mock).toHaveBeenCalledTimes(1);
    }
    const mock = vi.fn().mockRejectedValue(new Error("timeout"));
    vi.stubGlobal("fetch", mock);
    expect((await deliverCareers(env, payload)).state).toBe("pending");
    expect(mock).toHaveBeenCalledTimes(1);
  });
  it("reports explicit pre-send quota rejection as failed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          version: 1,
          reference: payload.reference,
          state: "failed",
          code: "quota",
        }),
      ),
    );
    expect(await deliverCareers(env, payload)).toEqual({
      state: "failed",
      code: "quota",
    });
  });
});
