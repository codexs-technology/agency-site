import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";
import { readFileSync } from "node:fs";

const evidence = "compliance/rapid-gateway/screenshots";
mkdirSync(evidence, { recursive: true });

test("capture actual local application evidence with synthetic data only", async ({
  page,
  request,
}) => {
  for (const [path, name] of [
    ["/", "homepage"],
    ["/services", "catalog"],
    ["/pricing", "pricing"],
    ["/services/seo", "seo"],
  ]) {
    await page.goto(path);
    await page.screenshot({ path: `${evidence}/${name}.png`, fullPage: true });
  }
  await page.goto("/pricing");
  await page
    .getByRole("combobox", { name: /Display currency/ })
    .first()
    .selectOption("EUR");
  const currencySection = page
    .getByRole("heading", { name: "Service packages and display currency" })
    .locator("..");
  await currencySection.scrollIntoViewIfNeeded();
  await currencySection.screenshot({
    path: `${evidence}/currency-selector.png`,
  });
  await page
    .locator("footer")
    .screenshot({ path: `${evidence}/footer-address-blocked.png` });
  const secret = readFileSync(".test-bootstrap-secret", "utf8").trim();
  const email = "synthetic-admin@example.invalid",
    password = "Synthetic-Only-QA!2026";
  const boot = await request.post("/api/admin/bootstrap", {
    headers: { Origin: "http://localhost:8787", "X-Bootstrap-Secret": secret },
    data: { email, password },
  });
  expect([201, 409]).toContain(boot.status());
  // Another full-suite test may already own the bootstrap account.
  if (boot.status() === 409) return;
  await page.goto("/admin");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.getByRole("button", { name: "Quote / invoice requests" }).click();
  await page.screenshot({
    path: `${evidence}/admin-synthetic-inquiries.png`,
    fullPage: true,
  });
});

test("guest quote flow persists once, stays unpaid and protects private status", async ({
  page,
  request,
}) => {
  await page.goto("/services/web-development");
  await page.getByRole("button", { name: "Add to quote cart" }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await page.getByRole("link", { name: "Continue as guest" }).click();
  await page
    .getByRole("button", { name: "Review server-validated selection" })
    .click();
  await page.getByLabel("Full name").fill("Synthetic QA Customer");
  await page
    .getByLabel("Email", { exact: true })
    .fill("synthetic-qa@example.invalid");
  await page.getByLabel("Country (two-letter code, for example PK)").fill("PK");
  await page.setViewportSize({ width: 390, height: 844 });
  const checkoutScan = await new AxeBuilder({ page })
    .include("#main")
    .analyze();
  expect(checkoutScan.violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `${evidence}/guest-checkout.png`,
    fullPage: true,
  });
  await page
    .getByRole("checkbox", { name: /I consent to processing this inquiry/ })
    .check();
  await page
    .getByRole("button", { name: "Submit request — no payment" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Request saved — no payment taken" }),
  ).toBeVisible();
  const keys = await page.locator("code").allTextContents();
  expect(keys).toHaveLength(2);
  const denied = await request.post("/api/guest/status", {
    headers: { Origin: "http://localhost:8787" },
    data: { id: keys[0], accessKey: "0".repeat(64) },
  });
  expect(denied.status()).toBe(404);
  await page.goto("/order-status");
  await page.getByLabel("Request reference").fill(keys[0]);
  await page.getByLabel("Private access key").fill(keys[1]);
  await page.getByRole("button", { name: "Check status" }).click();
  await expect(page.getByText("Status: received")).toBeVisible();
  await page.goto("/checkout/success");
  await expect(
    page.getByText(/No payment is confirmed by this page/),
  ).toBeVisible();
});

test("guest request idempotency and authenticated admin boundaries", async ({
  request,
}) => {
  const headers = { Origin: "http://localhost:8787" };
  const cartResponse = await request.post("/api/guest/carts", {
    headers,
    data: [{ service: "seo", quantity: 1 }],
  });
  expect(cartResponse.status()).toBe(201);
  const cart = await cartResponse.json();
  const data = {
    cartId: cart.id,
    cartKey: cart.key,
    name: "Synthetic Replay",
    email: "replay@example.invalid",
    country: "PK",
    requestType: "quote",
    currency: "AED",
    consent: true,
    turnstileToken: "",
    website: "",
  };
  const first = await request.post("/api/guest/requests", { headers, data });
  expect(first.status()).toBe(201);
  const receipt = await first.json();
  const replay = await request.post("/api/guest/requests", { headers, data });
  expect(replay.status()).toBe(200);
  const second = await replay.json();
  expect(second.id).toBe(receipt.id);
  expect(second.replayed).toBe(true);
  expect(second.paid).toBe(false);
  const conflict = await request.post("/api/guest/requests", {
    headers,
    data: { ...data, name: "Different details" },
  });
  expect(conflict.status()).toBe(409);
  const unauthorized = await request.get(
    "/api/admin/commerce/invoice-requests",
  );
  expect(unauthorized.status()).toBe(401);
});

test("private commerce routes, mobile layout, a11y and fail-closed endpoints", async ({
  page,
  request,
}) => {
  for (const path of [
    "/cart",
    "/checkout",
    "/checkout/success",
    "/checkout/cancel",
    "/order-status",
  ]) {
    const r = await page.goto(path);
    expect(r?.status()).toBe(200);
    expect(r?.headers()["x-robots-tag"]).toContain("noindex");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/checkout");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const scan = await new AxeBuilder({ page }).analyze();
  expect(scan.violations).toEqual([]);
  const bad = await request.post("/api/guest/carts", {
    headers: { Origin: "https://evil.invalid" },
    data: [{ service: "web-development", quantity: 1 }],
  });
  expect(bad.status()).toBe(403);
  const injected = await request.post("/api/guest/carts", {
    headers: { Origin: "http://localhost:8787" },
    data: [{ service: "web-development", quantity: 1, amountMinor: 1 }],
  });
  expect(injected.status()).toBe(400);
  const hook = await request.post("/api/payments/rapidgateway/webhook", {
    data: { status: "paid" },
  });
  expect(hook.status()).toBe(503);
});
