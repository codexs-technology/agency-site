import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { portfolioConcepts } from "../src/shared/portfolio";
import { editorialArticles } from "../src/shared/editorial";
import {
  blogPhotography,
  photographForArticle,
  photographForProject,
  projectPhotography,
} from "../src/web/Photography";

describe("Photography coverage and preservation", () => {
  it("maps every fallback concept and article to distinct photography within its collection", () => {
    for (const item of portfolioConcepts)
      expect(photographForProject(item)).toBeTruthy();
    for (const item of editorialArticles)
      expect(photographForArticle(item)).toBeTruthy();
    expect(
      new Set(Object.values(projectPhotography).map((p) => p.key)).size,
    ).toBe(Object.keys(projectPhotography).length);
    expect(new Set(Object.values(blogPhotography).map((p) => p.key)).size).toBe(
      Object.keys(blogPhotography).length,
    );
  });
  it("preserves owner-supplied images and nonconcept work", () => {
    const item = portfolioConcepts[0];
    expect(
      photographForProject({ ...item, image: "/uploads/real.webp" }),
    ).toBeUndefined();
    expect(photographForProject({ ...item, is_concept: 0 })).toBeUndefined();
    expect(
      photographForArticle({
        ...editorialArticles[0],
        image: "/uploads/article.webp",
      }),
    ).toBeUndefined();
  });
  it("verifies local asset hashes, dimensions, budgets and full responsive variants", () => {
    const manifest = JSON.parse(
      readFileSync("public/images/photography/manifest.json", "utf8"),
    ) as {
      filename: string;
      sha256: string;
      width: number;
      height: number;
      bytes: number;
      source: string;
      license: string;
    }[];
    for (const item of manifest) {
      const bytes = readFileSync(`public/images/photography/${item.filename}`);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        item.sha256,
      );
      expect(bytes.length).toBe(item.bytes);
      expect(item.width).toBeGreaterThanOrEqual(320);
      expect(item.height).toBeGreaterThan(200);
      expect(item.bytes).toBeLessThan(200000);
      expect(item.source).toContain("pexels.com/photo/");
      expect(item.license).toBe("https://www.pexels.com/license/");
    }
    for (const photo of [
      ...Object.values(projectPhotography),
      ...Object.values(blogPhotography),
    ])
      for (const width of [320, 640, 960])
        expect(
          manifest.some(
            (item) => item.filename === `${photo.key}-${width}.webp`,
          ),
        ).toBe(true);
  });
});
