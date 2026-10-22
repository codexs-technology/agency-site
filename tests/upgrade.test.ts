import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import pages from "../src/worker/pages";
import { editorialArticles } from "../src/shared/editorial";
import { mergeEditorial, portfolioConcepts } from "../src/shared/portfolio";
import { services } from "../src/shared/content";
import {
  validateDocument,
  MAX_DOCUMENT_BYTES,
} from "../src/worker/recruitment";
import {
  recruitmentSchema,
  recruitmentStatuses,
} from "../src/shared/validation";
import type { Env } from "../src/worker/types";

const context = {
  waitUntil() {},
  passThroughOnException() {},
} as unknown as ExecutionContext;
const env = {
  ASSETS: { fetch: async () => new Response("asset") },
} as unknown as Partial<Env>;
describe("premium editorial routes and integrity", () => {
  it("provides twelve disclosed concepts and sixteen complete original articles", () => {
    expect(portfolioConcepts).toHaveLength(12);
    expect(editorialArticles).toHaveLength(16);
    expect(new Set(portfolioConcepts.map((item) => item.category)).size).toBe(
      12,
    );
    for (const item of [...portfolioConcepts, ...editorialArticles]) {
      expect(existsSync(`public${item.image}`), item.slug).toBe(true);
      expect(
        item.body.split("\n\n").filter((block) => block.startsWith("## "))
          .length,
      ).toBeGreaterThanOrEqual(4);
    }
    for (const item of editorialArticles) {
      expect(item.body.split(/\s+/).length, item.slug).toBeGreaterThan(300);
      expect(item.references?.length).toBeGreaterThanOrEqual(2);
      expect(
        services.some((service) => service.slug === item.serviceSlug),
        item.slug,
      ).toBe(true);
      expect(item.published_at).toBe("2026-10-23T00:00:00+05:00");
    }
    expect(portfolioConcepts.every((item) => item.is_concept === 1)).toBe(true);
  });
  it("preserves owner records and deduplicates by slug", () => {
    const owner = { ...portfolioConcepts[0], title: "Owner-controlled record" };
    const merged = mergeEditorial([owner], portfolioConcepts);
    expect(merged).toHaveLength(12);
    expect(merged[0].title).toBe("Owner-controlled record");
  });
  it("serves crawlable article and project details with canonical metadata", async () => {
    for (const [prefix, records] of [
      ["blog", editorialArticles],
      ["portfolio", portfolioConcepts],
    ] as const) {
      for (const record of records) {
        const response = await pages.fetch(
          new Request(`https://example.pages.dev/${prefix}/${record.slug}`),
          env,
          context,
        );
        expect(response.status, record.slug).toBe(200);
        const html = await response.text();
        expect(html).toContain(
          `<link rel="canonical" href="https://example.pages.dev/${prefix}/${record.slug}">`,
        );
        expect(html).toContain(record.body.split("\n\n")[0].slice(3));
        if (prefix === "blog") expect(html).toContain('"@type":"Article"');
        else expect(html).toContain("CONCEPT PROJECT · NOT CLIENT WORK");
      }
    }
  });
  it("lists all new content in sitemap and excludes private status access", async () => {
    const response = await pages.fetch(
      new Request("https://example.pages.dev/sitemap.xml"),
      env,
      context,
    );
    const xml = await response.text();
    for (const item of [...portfolioConcepts, ...editorialArticles])
      expect(xml).toContain(item.slug);
    expect(xml).not.toContain("application-status");
  });
  it("replaces public custom quote wording and gates unpublished applications", async () => {
    for (const path of ["/", "/pricing"]) {
      const response = await pages.fetch(
        new Request(`https://example.pages.dev${path}`),
        env,
        context,
      );
      const html = await response.text();
      expect(html).not.toMatch(/custom quote/i);
      expect(html).toContain("Project-Based Pricing");
      expect(html).toContain("Milestone-Based Development");
      expect(html).toContain("Tailored AI Solutions");
    }
    const response = await pages.fetch(
      new Request("https://example.pages.dev/careers/apply"),
      env,
      context,
    );
    expect(await response.text()).toContain("No published positions are open.");
  });
  it("keeps R2 migration additive and recruitment statuses separate", () => {
    const migration = readFileSync("migrations/0005_recruitment.sql", "utf8");
    expect(migration).not.toMatch(/DROP TABLE|DELETE FROM/i);
    expect(recruitmentStatuses).toHaveLength(7);
    expect(recruitmentSchema.safeParse({ name: "A" }).success).toBe(false);
  });
});

describe("document validation is bounded and explicitly not antivirus", () => {
  it("accepts a bounded passive PDF", async () => {
    const result = await validateDocument(
      new File(["%PDF-1.4\nexample\n%%EOF"], "resume.pdf", {
        type: "application/pdf",
      }),
    );
    expect(result.extension).toBe("pdf");
  });
  it("rejects disguised types, active PDFs, empty files and excessive sizes", async () => {
    for (const file of [
      new File(["not pdf"], "resume.pdf", { type: "application/pdf" }),
      new File(["%PDF-1.4 /JavaScript %%EOF"], "resume.pdf", {
        type: "application/pdf",
      }),
      new File(["%PDF-1.4 %%EOF"], "resume.exe", { type: "application/pdf" }),
      new File([], "resume.pdf", { type: "application/pdf" }),
      new File([new Uint8Array(MAX_DOCUMENT_BYTES + 1)], "resume.pdf", {
        type: "application/pdf",
      }),
      new File(["PK malformed"], "resume.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
    ])
      await expect(validateDocument(file)).rejects.toThrow();
  });
});
