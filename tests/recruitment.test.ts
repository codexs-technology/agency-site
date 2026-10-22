import { afterEach, describe, expect, it, vi } from "vitest";
import { recruitment } from "../src/worker/recruitment";
import type { Env } from "../src/worker/types";

function harness(
  options: {
    failure?: boolean;
    open?: boolean;
    approved?: boolean;
    limited?: boolean;
    production?: boolean;
    duplicate?: boolean;
  } = {},
) {
  const objects = new Map<string, unknown>(); // No binary persistence in the Gmail workflow.
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        version: 1,
        ok: true,
        state: "sent",
        reference: [...applications.keys()][0],
      }),
    ),
  );
  const applications = new Map<string, { hash: string; status: string }>();
  const writes: { sql: string; values: unknown[] }[] = [];
  const DB = {
    prepare(sql: string) {
      const statement = {
        sql,
        values: [] as unknown[],
        bind(...values: unknown[]) {
          statement.values = values;
          return statement;
        },
        async first() {
          if (sql.includes("rate_limits"))
            return { count: options.limited ? 99 : 1 };
          if (sql.includes("SELECT id,title FROM job_openings"))
            return options.open === false
              ? null
              : { id: "published-role", title: "Synthetic integration role" };
          if (sql.includes("SELECT id FROM job_applications"))
            return options.duplicate ? { id: "existing" } : null;
          if (sql.includes("JOIN job_openings")) {
            const stored = applications.get(String(statement.values[0]));
            return stored && stored.hash === statement.values[1]
              ? {
                  id: statement.values[0],
                  recruitment_status: stored.status,
                  created_at: "2026-10-23",
                  title: "Synthetic integration role",
                }
              : null;
          }
          return null;
        },
        async run() {
          if (sql.includes("UPDATE job_applications")) {
            const row = applications.get(String(statement.values[0]));
            if (row && row.hash === statement.values[1])
              row.status = "Withdrawn";
          }
          return { success: true, meta: { changes: 1 } };
        },
      };
      return statement;
    },
    async batch(statements: { sql: string; values: unknown[] }[]) {
      if (options.failure) throw new Error("Synthetic persistence failure");
      for (const statement of statements) {
        writes.push(statement);
        if (statement.sql.includes("INSERT INTO job_applications"))
          applications.set(String(statement.values[0]), {
            hash: String(statement.values.at(-1)),
            status: "Received",
          });
      }
      return statements.map(() => ({ success: true, meta: { changes: 1 } }));
    },
  };
  const env = {
    DB,
    ENVIRONMENT: options.production ? "production" : "development",
    LOCAL_TEST_MODE: "true",
    PUBLIC_SITE_URL: "http://localhost:8787",
    APPLICATION_UPLOADS_APPROVED: options.approved === false ? "false" : "true",
    CAREERS_WEBHOOK_URL:
      "https://script.google.com/macros/s/test-deployment/exec",
    CAREERS_WEBHOOK_SECRET: "test-secret-not-real-".repeat(3),
    SEND_CONFIRMATIONS: "true",
  } as unknown as Env;
  const context = {
    waitUntil() {},
    passThroughOnException() {},
  } as unknown as ExecutionContext;
  const submit = async (
    file = new File(["%PDF-1.4\npassive test\n%%EOF"], "resume.pdf", {
      type: "application/pdf",
    }),
  ) => {
    const form = new FormData();
    for (const [key, value] of Object.entries({
      name: "Synthetic Applicant",
      email: "synthetic@example.com",
      job_id: "published-role",
      phone: "+123456789",
      country: "Test country",
      applicant_location: "Test location",
      experience: "Synthetic experience for validation only.",
      skills: "Testing",
      cover_letter:
        "This is a synthetic application used only in isolated automated tests.",
      consent: "true",
      portfolio_url: "",
      professional_url: "",
    }))
      form.set(key, value);
    form.set("resume", file);
    return recruitment.fetch(
      new Request("http://localhost:8787/submit", {
        method: "POST",
        headers: { Origin: "http://localhost:8787" },
        body: form,
      }),
      env,
      context,
    );
  };
  const access = (action: string, reference: string, accessKey: string) =>
    recruitment.fetch(
      new Request(`http://localhost:8787/${action}`, {
        method: "POST",
        headers: {
          Origin: "http://localhost:8787",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reference, accessKey }),
      }),
      env,
      context,
    );
  return { submit, access, objects, applications, writes };
}

afterEach(() => vi.unstubAllGlobals());
describe("recruitment HTTP workflow with isolated D1/fetch doubles (not production proof)", () => {
  it("blocks rate abuse, production Turnstile bypass and duplicate email/role before dispatch", async () => {
    for (const [options, status] of [
      [{ limited: true }, 429],
      [{ production: true }, 422],
      [{ duplicate: true }, 409],
    ] as const) {
      const test = harness(options);
      expect((await test.submit()).status).toBe(status);
      expect(fetch).not.toHaveBeenCalled();
      expect(test.writes).toHaveLength(0);
    }
  });
  it("saves metadata before dispatch, hashes separate credentials and allows own withdrawal", async () => {
    const test = harness();
    const response = await test.submit();
    expect(response.status).toBe(201);
    const receipt = (await response.json()) as {
      id: string;
      accessKey: string;
      stored: boolean;
    };
    expect(receipt.stored).toBe(true);
    expect(test.objects.size).toBe(0);
    expect(test.applications.get(receipt.id)?.hash).not.toBe(receipt.accessKey);
    expect(
      test.writes.filter((row) => row.sql.includes("email_outbox")),
    ).toHaveLength(0);
    expect(fetch).toHaveBeenCalledTimes(1);
    const dispatch = JSON.parse(
      vi.mocked(fetch).mock.calls[0][1]!.body as string,
    );
    expect(dispatch.files[0].name).toBe("resume.pdf");
    expect(dispatch.files[0].base64).toBeTruthy();
    expect(JSON.stringify(test.writes)).not.toContain(dispatch.files[0].base64);
    const wrong = await test.access("status", receipt.id, "0".repeat(64));
    expect(wrong.status).toBe(401);
    const status = await test.access("status", receipt.id, receipt.accessKey);
    expect(await status.json()).toMatchObject({ status: "Received" });
    const withdrawn = await test.access(
      "withdraw",
      receipt.id,
      receipt.accessKey,
    );
    expect(await withdrawn.json()).toMatchObject({ status: "Withdrawn" });
  });
  it("never dispatches attachments after database failure", async () => {
    const test = harness({ failure: true });
    const response = await test.submit();
    expect(response.status).toBe(503);
    expect(test.objects.size).toBe(0);
    expect(test.writes).toHaveLength(0);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects unapproved collection, closed roles and invalid uploads without persistence", async () => {
    for (const [test, expected] of [
      [harness({ approved: false }), 503],
      [harness({ open: false }), 404],
    ] as const) {
      expect((await test.submit()).status).toBe(expected);
      expect(test.objects.size).toBe(0);
    }
    const test = harness();
    expect(
      (
        await test.submit(
          new File(["malicious"], "resume.pdf", { type: "application/pdf" }),
        )
      ).status,
    ).toBe(400);
    expect(test.objects.size).toBe(0);
    expect(test.writes).toHaveLength(0);
  });
});
