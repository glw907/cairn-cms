import { test, expect } from '@playwright/test';

// The showcase declares a navLayout (cairn.config.ts's editor block): a real end-to-end proof the
// engine actually consumed the declaration, not just a unit or component fixture. A silently-ignored
// navLayout would still pass every lower-level test if the shell fell back to the default arrangement,
// so this spec drives the real preview build and reads the rendered sidebar.

test('the sidebar renders the declared navLayout: two named sections, the relabel, and the fallback foot', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/posts$/);

  const sidebar = page.getByRole('navigation', { name: 'Site content' });
  const sections = sidebar.locator('details');
  await expect(sections).toHaveCount(2);

  // Section order and each section's arranged, in-declaration-order links (spec §2, §7).
  await expect(sections.nth(0).locator('summary')).toHaveText('Content');
  await expect(sections.nth(0).locator('a')).toHaveText(['Posts', 'Pages', 'Signups']);

  await expect(sections.nth(1).locator('summary')).toHaveText('Site');
  await expect(sections.nth(1).locator('a')).toHaveText(['Library', 'Tags', 'Navigation', 'Site settings', 'Editors']);

  // The relabel changes the visible label only; the engine-owned href stays /admin/settings.
  await expect(sidebar.getByRole('link', { name: 'Site settings' })).toHaveAttribute('href', '/admin/settings');
  // The bare "Settings" label the engine default would have used is gone; only the relabel renders.
  await expect(sidebar.getByRole('link', { name: 'Settings', exact: true })).toHaveCount(0);

  // Help is deliberately unreferenced, so it lands alone in the fallback foot band, not in either
  // section (the omission-fallback rule, locked call 5).
  const foot = sidebar.locator('[data-testid="cairn-nav-fallback"]');
  await expect(foot.locator('a')).toHaveText(['Help']);
  await expect(sidebar.getByRole('link', { name: 'Help' })).toHaveCount(1);
});

test('an engine door inside the declared layout still navigates to its real route', async ({ page }) => {
  await page.goto('/admin');
  await page.getByRole('navigation', { name: 'Site content' }).getByRole('link', { name: 'Tags' }).click();
  await expect(page).toHaveURL(/\/admin\/vocabulary$/);
});
