import { test, expect } from "@playwright/test";

test("process tabs support arrow, home and end keyboard navigation", async ({
  page,
}) => {
  await page.goto("/process");
  const tabs = page.getByRole("tab");
  await tabs.first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.nth(1)).toBeFocused();
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(tabs.last()).toBeFocused();
  await page.keyboard.press("Home");
  await expect(tabs.first()).toBeFocused();
  await expect(page.getByRole("tabpanel")).toHaveAttribute(
    "aria-labelledby",
    "stage-0",
  );
});

test("reduced motion leaves real server content visible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  for (const section of await page.locator("main > section").all()) {
    await section.scrollIntoViewIfNeeded();
    expect(
      await section.evaluate((node) => getComputedStyle(node).opacity),
    ).toBe("1");
  }
});
