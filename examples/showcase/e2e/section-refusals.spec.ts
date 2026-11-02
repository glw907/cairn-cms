import { test, expect, type Page } from '@playwright/test';

// Each refusal createSectionAction can return, driven by a native form post to the fixture route
// at /admin/section-refusals. The dev handle replaces the real guard, so `forged` proves
// createAdminAction's own CSRF check, not the guard's (as custom-screen.spec.ts says of its route).
// The live region is the one place a returned fail() renders; a thrown error never reaches it.

test.beforeEach(async ({ page }) => {
  await page.goto('/admin/section-refusals');
});

const region = (page: Page) => page.getByTestId('sr-outcome');

test('an allowed action succeeds, so the route does not refuse everything', async ({ page }) => {
  await page.getByRole('button', { name: 'Allowed' }).click();
  await expect(region(page)).toHaveText('Allowed.');
});

test('an unbound section answers the unavailable copy', async ({ page }) => {
  await page.getByRole('button', { name: 'Unbound' }).click();
  await expect(region(page)).toHaveText(
    'This section is not available. Let your site developer know.',
  );
});

test('a section with no resolveDb runs its handler rather than refusing', async ({ page }) => {
  await page.getByRole('button', { name: 'Omitted' }).click();
  await expect(region(page)).toHaveText('Allowed.');
});

// The dev backend names the fix. A deployed site answers the shared denial copy, which
// section-action.test.ts pins.
test('an unmapped target names the missing access rule under the dev backend', async ({ page }) => {
  await page.getByRole('button', { name: 'Unmapped' }).click();
  await expect(region(page)).toHaveText(
    "No access rule for /admin/no-such-rule. Add it to the adapter's access map.",
  );
});

test('a limited action answers the rate-limit copy', async ({ page }) => {
  await page.getByRole('button', { name: 'Limited' }).click();
  await expect(region(page)).toHaveText('Too many requests. Wait a moment and try again.');
});

test('a form without the CSRF field lands on the 403 error page', async ({ page }) => {
  await page.getByRole('button', { name: 'Forged' }).click();
  await expect(page.getByText("You don't have access to this page.")).toBeVisible();
  // Only a thrown error reaches the error page; a returned fail() renders in the region.
  await expect(region(page)).toHaveCount(0);
});
