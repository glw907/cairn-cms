import { test, expect } from '@playwright/test';

// The end-to-end proof of the custom-admin-screen seam (Plan 1). The cms-dev handle mints an owner
// editor and supplies a fake APP_DB on platform.env, so the create-then-delete round-trips through
// the developer's own binding. The fake APP_DB is process-global, so a row added on one request is
// visible on the next; a unique signup name per run keeps the assertions exact under Playwright's
// CI retries (a retry shares the running server, so a fixed name would accumulate duplicate rows).

test('a custom admin screen renders in the shell, reads identity, and writes its own D1', async ({ page }) => {
  await page.goto('/admin/signups');
  // The registered adminNav entry renders as a sidebar link inside the shared shell. Scope to the
  // sidebar nav: the same href also resolves in the command palette (which maps the nav items), so a
  // bare locator would match two real elements.
  await expect(
    page.getByRole('navigation', { name: 'Site content' }).getByRole('link', { name: 'Signups' }),
  ).toBeVisible();
  // The custom screen's own content renders inside that shell.
  await expect(page.getByRole('heading', { name: 'Signups' })).toBeVisible();
  const name = `Ada-${Date.now()}`;
  await page.fill('input[name="name"]', name);
  await page.fill('input[name="email"]', 'ada@test');
  // The bare CsrfField renders the shell's context token, so the create form round-trips. The dev
  // handle replaces the real guard, so this proves the token plumbing, not the guard's rejection
  // path; the guard's fail-closed CSRF and owner checks are covered in src/tests/unit/guard.test.ts.
  await page.getByRole('button', { name: 'Add' }).click();
  // The row round-trips through the fake APP_DB.
  const row = page.getByRole('row', { name: new RegExp(name) });
  await expect(row.getByRole('cell', { name })).toBeVisible();
  // The owner-gated destructive action removes that row.
  await row.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('cell', { name })).toHaveCount(0);
});

test("the shell's global logout action targets the absolute catch-all path from a custom route", async ({ page }) => {
  await page.goto('/admin/signups');
  await expect(page.locator('form[action="/admin?/logout"]')).toHaveCount(1);
});
