import { test, expect } from "@playwright/test";
test("book → interviewer PASS → student award → team invalidation → preserved PASS", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Book Interview" }).first().click();
  await page.locator(".slot-options button").first().click();
  await page
    .getByRole("button", { name: "Confirm booking", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Your interview is booked/ }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /Your interview is booked/ }),
  ).toBeVisible();
  await page.getByLabel("Demo persona").selectOption("interviewer");
  const appointment = page
    .locator(".appointment")
    .filter({ hasText: "Aarav Mehta" });
  await expect(appointment).toBeVisible();
  await appointment
    .getByRole("button", { name: "Demo: complete interview" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  await appointment.getByRole("button", { name: "Record outcome" }).click();
  await page
    .getByLabel("Internal notes")
    .fill("Clear thinking and sound implementation.");
  await page.getByRole("button", { name: "Review & save" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  await page.getByLabel("Demo persona").selectOption("student");
  await expect(
    page
      .getByText(
        "Congratulations! You've passed your interview and earned the AI Product Mastery — Novice Track Badge.",
      )
      .first(),
  ).toBeVisible();
  await page.getByLabel("Demo persona").selectOption("team");
  await page
    .getByLabel("Integrity decision reason")
    .fill("Confirmed malpractice in a required contest");
  const award = page
    .locator(".integrity-row")
    .filter({ hasText: "Aarav Mehta" });
  await award.getByRole("button", { name: "Invalidate badge" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  await page.getByLabel("Demo persona").selectOption("student");
  await expect(
    page.getByRole("heading", { name: "Your badge needs a review." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "View progress", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "View journey" }).first().click();
  await expect(
    page.locator(".history-row").getByText("PASS", { exact: true }),
  ).toBeVisible();
});
test("responsive scenarios, role screens and no horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  for (const scenario of [
    "LOCKED",
    "BOOKED",
    "AWAITING_RESULT",
    "PASSED",
    "FAILED",
    "RETAKE_REQUIRED",
    "BADGE_INVALIDATED",
  ]) {
    await page.getByLabel("Demo scenario").selectOption(scenario);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Confirm", exact: true })
      .click();
    await expect(page.locator(".hero")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({ path: "docs/mobile-dashboard.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.getByLabel("Demo scenario").selectOption("ELIGIBLE_UNBOOKED");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  await page.screenshot({ path: "docs/student-dashboard.png", fullPage: true });
  await page.getByLabel("Demo persona").selectOption("interviewer");
  await page.getByRole("button", { name: "Availability", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Add availability", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Demo persona").selectOption("team");
  await expect(
    page.getByRole("heading", { name: "See the queue. Keep it moving." }),
  ).toBeVisible();
  await page.screenshot({ path: "docs/team-operations.png", fullPage: true });
});

test("reschedule and cancellation preserve history, and persona survives refresh", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Book Interview" }).first().click();
  await page.locator(".slot-options button").first().click();
  await page
    .getByRole("button", { name: "Confirm booking", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  await page.getByRole("button", { name: "Reschedule interview" }).click();
  await page.locator(".date-options button").nth(1).click();
  await page.locator(".slot-options button").first().click();
  await page.getByRole("button", { name: "Confirm new time" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  await expect(page.locator(".history-row")).toHaveCount(2);
  await expect(
    page.locator(".history-row").getByText("CANCELLED", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cancel interview", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  await expect(
    page.locator(".history-row").getByText("CANCELLED", { exact: true }),
  ).toHaveCount(2);
  await page.getByLabel("Demo persona").selectOption("interviewer");
  await page.reload();
  await expect(page.getByLabel("Demo persona")).toHaveValue("interviewer");
  await expect(
    page.getByRole("heading", { name: "Make room for someone’s next step." }),
  ).toBeVisible();
});
