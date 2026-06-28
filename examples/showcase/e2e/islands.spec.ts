import { test, expect } from '@playwright/test';

test.describe('content islands', () => {
  test('renders the static fallback without JavaScript', async ({ browser }) => {
    // A no-JS context: the island boundary must still carry real content (the build() fallback).
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/styleguide');
    await expect(page.locator('.island-converter-fallback')).toContainText('1 mi = 1.609 km');
    // The live component never mounts without JS.
    await expect(page.getByTestId('converter-live')).toHaveCount(0);
    await context.close();
  });

  test('mounts the live island and converts interactively', async ({ page }) => {
    await page.goto('/styleguide');
    const live = page.getByTestId('converter-live');
    await expect(live).toBeVisible();
    // the fallback was replaced
    await expect(page.locator('.island-converter-fallback')).toHaveCount(0);
    await page.getByTestId('converter-input').fill('10');
    await expect(page.getByTestId('converter-output')).toContainText('16.09 km');
  });

  test('re-mounts after a client-side navigation', async ({ page }) => {
    // This must be a real in-app (SPA) navigation, not page.goto (a hard load tears down the whole JS
    // context and never exercises hydrateIslands' teardown/re-run path, which is the property under test).
    await page.goto('/');
    await page.getByRole('link', { name: 'Styleguide' }).click();
    await expect(page.getByTestId('converter-live')).toBeVisible();
    // navigate away and back, in-app both ways, so afterNavigate fires a second time over a fresh DOM.
    // The showcase home link is labelled "Writing" (href "/"), not "Home", and it appears in both the
    // primary nav and the footer, so scope the back-hop to the primary nav to keep the locator strict.
    await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Writing' }).click();
    await page.getByRole('link', { name: 'Styleguide' }).click();
    // exactly one live island, not a stacked duplicate from the second hydrate pass (the teardown works)
    await expect(page.getByTestId('converter-live')).toHaveCount(1);
    await page.getByTestId('converter-input').fill('2');
    await expect(page.getByTestId('converter-output')).toContainText('3.218 km');
  });
});
