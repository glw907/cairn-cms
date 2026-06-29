import { test, expect } from '@playwright/test';

// The end-to-end proof of the custom-admin-screen seam (Plan 1). The cms-dev handle mints an owner
// editor and supplies a fake APP_DB on platform.env, so the create-then-delete round-trips through
// an in-memory store seeded empty per process: the flow is self-contained, with no migration step.

test('a custom admin screen renders in the shell, reads identity, and writes its own D1', async ({ page }) => {
  await page.goto('/admin/signups');
  // The registered adminNav entry renders as a sidebar link inside the shared shell.
  await expect(page.locator('a[href="/admin/signups"]')).toBeVisible();
  // The custom screen's own content renders inside that shell.
  await expect(page.getByRole('heading', { name: 'Signups' })).toBeVisible();
  await page.fill('input[name="name"]', 'Ada');
  await page.fill('input[name="email"]', 'ada@test');
  // The bare CsrfField rides the shell's context token; the guard fail-closes a tokenless POST.
  await page.getByRole('button', { name: 'Add' }).click();
  // The row round-trips through the fake APP_DB.
  await expect(page.getByRole('cell', { name: 'Ada' })).toBeVisible();
  // The owner-gated destructive action removes it.
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('cell', { name: 'Ada' })).toHaveCount(0);
});

test("the shell's global logout action targets the absolute catch-all path from a custom route", async ({ page }) => {
  await page.goto('/admin/signups');
  await expect(page.locator('form[action="/admin?/logout"]')).toHaveCount(1);
});
