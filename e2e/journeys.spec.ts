import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";

test("valid contact UI persists and backend failure never shows success", async ({
  page,
}) => {
  await page.goto("/contact");
  await page.getByLabel("Full name").fill("Browser Inquiry Example");
  await page
    .locator("main")
    .getByLabel("Email address")
    .fill(`browser-${randomBytes(6).toString("hex")}@example.com`);
  await page
    .getByLabel("Service interested in")
    .selectOption("Web Development");
  await page.getByLabel("Project timeline").selectOption("Exploring options");
  await page
    .getByLabel("Project description")
    .fill(
      "We would like a customer-facing portal with accessible onboarding and documented integrations.",
    );
  await page.locator("main").getByRole("checkbox").check();
  await page.getByRole("button", { name: "Send Project Inquiry" }).click();
  await expect(
    page.getByRole("heading", { name: "Inquiry saved." }),
  ).toBeVisible();
  await page.goto("/contact");
  await page.getByLabel("Full name").fill("Failure Inquiry Example");
  await page
    .locator("main")
    .getByLabel("Email address")
    .fill("failure@example.com");
  await page
    .getByLabel("Service interested in")
    .selectOption("Web Development");
  await page.getByLabel("Project timeline").selectOption("Exploring options");
  await page
    .getByLabel("Project description")
    .fill(
      "A detailed project inquiry for testing a failed backend response and honest error handling.",
    );
  await page.locator("main").getByRole("checkbox").check();
  await page.route("**/api/contact", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Test backend temporarily unavailable" }),
    }),
  );
  await page.getByRole("button", { name: "Send Project Inquiry" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "temporarily unavailable",
  );
  await expect(
    page.getByRole("heading", { name: "Inquiry saved." }),
  ).toHaveCount(0);
});

test("multistep project inquiry reviews and persists", async ({ page }) => {
  await page.goto("/start-project");
  await page.getByLabel("AI Development", { exact: true }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page
    .getByLabel("What are you hoping")
    .fill(
      "We want a source-aware assistant for a small approved internal knowledge collection, with human review.",
    );
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Timeline").selectOption("Exploring options");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Full name").fill("Project Browser Example");
  await page
    .locator("main")
    .getByLabel("Email address")
    .fill(`project-browser-${randomBytes(6).toString("hex")}@example.com`);
  await page.locator("main").getByRole("checkbox").check();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator(".review-list")).toContainText("AI Development");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByLabel("Full name")).toHaveValue(
    "Project Browser Example",
  );
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Submit Project Brief" }).click();
  await expect(
    page.getByRole("heading", { name: "Project brief saved." }),
  ).toBeVisible();
});

test("representative routes meet automated accessibility checks", async ({
  page,
}) => {
  for (const path of [
    "/services/web-development",
    "/contact",
    "/start-project",
    "/faq",
    "/blog",
    "/admin",
  ]) {
    await page.goto(path);
    if (path === "/admin")
      await expect(
        page.getByRole("heading", { name: "Administrator sign in" }),
      ).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(result.violations, path).toEqual([]);
  }
});
