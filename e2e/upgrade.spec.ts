import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("concept portfolio filtering, detail navigation and responsive layouts", async ({
  page,
}) => {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/portfolio");
    expect(await page.locator(".project-card").count()).toBeGreaterThanOrEqual(
      12,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("button", { name: "AI Voice Agent Development", exact: true })
      .click();
    await expect(page.locator(".project-card")).toHaveCount(1);
    await page.locator(".project-card").click();
    await expect(page.locator("h1")).toHaveText("Relay Voice Desk");
    await expect(
      page.getByText("CONCEPT PROJECT · NOT CLIENT WORK", { exact: true }),
    ).toBeVisible();
  }
});

test("article pagination, references and careers closed state", async ({
  page,
}) => {
  await page.goto("/blog");
  await page
    .getByRole("searchbox", { name: "Search articles" })
    .fill("Technical SEO Checklist for 2026");
  await expect(page.locator(".project-card")).toHaveCount(1);
  await page.locator(".project-card").click();
  await expect(page.locator("article.prose h2")).toHaveCount(6);
  await expect(page.locator(".editorial-references a")).toHaveCount(2);
  await page.goto("/careers/apply");
  await expect(
    page.getByText("No published positions are open."),
  ).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await page.goto("/careers/application-status");
  await page.getByLabel("Application reference").fill("a".repeat(64));
  await page.getByLabel("Private access key").fill("b".repeat(64));
  await page.getByRole("button", { name: "Check Application Status" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Invalid application credentials",
  );
});

test("new routes are keyboard accessible and have no automated accessibility violations", async ({
  page,
}) => {
  for (const path of [
    "/portfolio",
    "/blog/technical-seo-checklist-2026",
    "/careers",
    "/careers/application-status",
  ]) {
    await page.goto(path);
    const result = await new AxeBuilder({ page }).analyze();
    expect(result.violations, path).toEqual([]);
  }
});

test("private document downloads require a session and applicant lookup rejects foreign origins", async ({
  request,
}) => {
  const document = await request.get(
    `/api/admin/applications/${"a".repeat(64)}/documents/resume`,
  );
  expect(document.status()).toBe(401);
  const status = await request.post("/api/recruitment/status", {
    headers: { Origin: "https://evil.example" },
    data: { reference: "a".repeat(64), accessKey: "b".repeat(64) },
  });
  expect(status.status()).toBe(403);
  const submit = await request.post("/api/recruitment/submit", {
    headers: { Origin: "http://localhost:8787" },
    multipart: { name: "Test Applicant" },
  });
  expect(submit.status()).toBe(503);
  expect(await submit.json()).toHaveProperty("error");
});
