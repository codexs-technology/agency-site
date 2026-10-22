import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";

test("business contacts, policy navigation and mobile layouts", async ({
  page,
}) => {
  for (const path of [
    "/contact",
    "/about",
    "/pricing",
    "/refund-policy",
    "/service-delivery-policy",
    "/cookie-policy",
    "/privacy-policy",
    "/terms-and-conditions",
  ]) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    await expect(
      page
        .locator("footer")
        .getByRole("link", { name: "support@codesboxs.com", exact: true }),
    ).toHaveAttribute("href", "mailto:support@codesboxs.com");
    await expect(page.locator("footer .social-links a")).toHaveCount(6);
    await expect(page.locator('a[href*="google.com/maps"]')).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      path,
    ).toBe(true);
    const result = await new AxeBuilder({ page }).analyze();
    expect(result.violations, path).toEqual([]);
  }
  await page.goto("/refund-policy");
  await page
    .getByRole("link", { name: "Cancellation before work begins", exact: true })
    .click();
  await expect(page).toHaveURL(/#policy-1$/);
});

test("terms alias redirects to the retained review draft on direct navigation", async ({
  request,
}) => {
  const response = await request.get("/terms-and-conditions", {
    maxRedirects: 0,
  });
  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe("/terms-of-service");
});

test("blog pagination and filters use published content without inventing articles", async ({
  page,
}) => {
  await page.route("**/api/**", (route) => route.continue());
  await page.goto("/blog");
  const search = page.getByRole("searchbox", { name: "Search articles" });
  await search.fill("no-matching-article-merchant-test");
  await expect(page.getByText("No matching published articles.")).toBeVisible();
  await search.fill("");
  await expect(page.locator(".project-card").first()).toBeVisible();
});

test("inquiry retries return the original reference and reject changed payloads", async ({
  request,
}) => {
  const headers = {
    Origin: "http://localhost:8787",
    "CF-Connecting-IP": "192.0.2.147",
    "Idempotency-Key": randomUUID(),
  };
  const data = {
    name: "Replay Test",
    email: "replay@example.com",
    service: "Web Development",
    timeline: "Exploring options",
    description:
      "A local integration inquiry verifying atomic replay protection and safe duplicate handling.",
    consent: true,
  };
  const first = await request.post("/api/contact", { headers, data });
  expect(first.status()).toBe(201);
  const stored = await first.json();
  const second = await request.post("/api/contact", { headers, data });
  expect(second.status()).toBe(200);
  expect((await second.json()).id).toBe(stored.id);
  const changed = await request.post("/api/contact", {
    headers,
    data: { ...data, name: "Changed request" },
  });
  expect(changed.status()).toBe(409);
});
