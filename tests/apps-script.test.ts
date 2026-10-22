import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

function scriptHarness() {
  const values: Record<string, string> = {
    CAREERS_WEBHOOK_SECRET: "s".repeat(64),
  };
  const sendEmail = vi.fn();
  const context = vm.createContext({
    ContentService: {
      MimeType: { JSON: "json" },
      createTextOutput: (text: string) => ({
        setMimeType: () => JSON.parse(text),
      }),
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key: string) => values[key],
        setProperty: (key: string, value: string) => {
          values[key] = value;
        },
        getProperties: () => values,
      }),
    },
    LockService: {
      getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }),
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: "sha256" },
      computeDigest: (_: string, value: string) => [
        ...createHash("sha256").update(value).digest(),
      ],
      base64Decode: (text: string) => [...Buffer.from(text, "base64")],
      newBlob: (bytes: number[]) => bytes,
    },
    MailApp: { getRemainingDailyQuota: () => 1, sendEmail },
  });
  vm.runInContext(
    readFileSync("integrations/careers/Code.gs", "utf8"),
    context,
  );
  const payload = {
    version: 1,
    issuedAt: Date.now(),
    secret: values.CAREERS_WEBHOOK_SECRET,
    reference: "a".repeat(64),
    name: "Synthetic Applicant",
    email: "synthetic@example.com",
    position: "Test role",
    coverLetter: "Synthetic test",
    files: [
      {
        name: "resume.pdf",
        mimeType: "application/pdf",
        base64: Buffer.from("%PDF-1.4\nsynthetic\n%%EOF").toString("base64"),
      },
    ],
  };
  const post = (body = payload) =>
    context.doPost({ postData: { contents: JSON.stringify(body) } });
  return { post, payload, sendEmail, values };
}

describe("exact replacement Code.gs in isolated Apps Script service doubles", () => {
  it("authenticates, sends once and deduplicates repeats", () => {
    const test = scriptHarness();
    expect(test.post()).toMatchObject({ ok: true, state: "sent" });
    expect(test.post()).toMatchObject({ ok: true, code: "duplicate" });
    expect(test.sendEmail).toHaveBeenCalledTimes(1);
    expect(
      test.post({ ...test.payload, coverLetter: "Changed payload" }),
    ).toMatchObject({ state: "pending", code: "reference_conflict" });
    expect(test.sendEmail).toHaveBeenCalledTimes(1);
  });
  it("does not retry ambiguous Gmail failures", () => {
    const test = scriptHarness();
    test.sendEmail.mockImplementation(() => {
      throw new Error("unknown outcome");
    });
    expect(test.post().state).toBe("pending");
    expect(test.post().state).toBe("pending");
    expect(test.sendEmail).toHaveBeenCalledTimes(1);
  });
  it("rejects wrong secrets, stale requests and invalid attachment signatures", () => {
    const test = scriptHarness();
    expect(test.post({ ...test.payload, secret: "wrong" }).code).toBe(
      "unauthorized",
    );
    expect(test.post({ ...test.payload, issuedAt: 0 }).code).toBe("invalid");
    expect(
      test.post({
        ...test.payload,
        files: [
          {
            name: "resume.pdf",
            mimeType: "application/pdf",
            base64: Buffer.from("not pdf").toString("base64"),
          },
        ],
      }).code,
    ).toBe("invalid");
    expect(test.sendEmail).not.toHaveBeenCalled();
  });
});
