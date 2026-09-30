import { test, expect } from '@playwright/test';

// The styleguide's one `:::banner` sample comes from the banner component's own `preview` (see
// +page.server.ts), which expires in 2999, so the banner is always active and never depends on when
// the test runs. The expired-banner behavior is covered by banner-component.test.ts.
const ACTIVE_MESSAGE = 'The trailhead lot reopens in the spring.';

test.describe('content islands', () => {
  test('renders the active banner without JavaScript', async ({ browser }) => {
    // A no-JS context: the island boundary must still carry real content (the build() fallback).
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/styleguide');
    await expect(page.locator('.banner')).toHaveCount(1);
    await expect(page.locator('.banner')).toContainText(ACTIVE_MESSAGE);
    // The live component never mounts without JS.
    await expect(page.getByTestId('banner-live')).toHaveCount(0);
    await context.close();
  });

  test('mounts the live island for the active banner', async ({ page }) => {
    await page.goto('/styleguide');
    const live = page.getByTestId('banner-live');
    await expect(live).toHaveCount(1);
    await expect(live).toContainText(ACTIVE_MESSAGE);
    await expect(page.locator('[data-cairn-island="banner"]')).toHaveCount(1);
  });

  test('re-mounts after a client-side navigation', async ({ page }) => {
    // This must be a real in-app (SPA) navigation, not page.goto (a hard load tears down the whole JS
    // context and never exercises hydrateIslands' teardown/re-run path, which is the property under test).
    await page.goto('/');
    await page.getByRole('link', { name: 'Styleguide' }).click();
    await expect(page.getByTestId('banner-live')).toHaveCount(1);
    // navigate away and back, in-app both ways, so afterNavigate fires a second time over a fresh DOM.
    // The showcase home link is labelled "Writing" (href "/"), not "Home", and it appears in both the
    // primary nav and the footer, so scope the back-hop to the primary nav to keep the locator strict.
    await page
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('link', { name: 'Writing' })
      .click();
    await page.getByRole('link', { name: 'Styleguide' }).click();
    // exactly one live banner, not a stacked duplicate from the second hydrate pass (the teardown works)
    await expect(page.getByTestId('banner-live')).toHaveCount(1);
  });
});
