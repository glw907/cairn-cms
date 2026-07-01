import { test, expect } from '@playwright/test';

// The starter-template visual baseline (the Phase-2 zero-pixel floor). The public (site) surface selects
// its theme by prefers-color-scheme, not a cookie, so emulateMedia is the lever (the same as
// styleguide.spec.ts). A template-track phase that intentionally shifts a surface updates the committed
// snapshot in the same commit, the reviewed record of intended drift. The home exercises the chrome
// (SiteHeader and SiteFooter via the (site) layout) and the masthead and CTA; the styleguide is the
// template's analog of the admin's live-components bar, showing every token, the type scale, the reading
// surface, and the component set. Both schemes are captured because the dark theme is a separate token set.
test('site home — light', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'light' });
	await page.goto('/');
	await expect(page).toHaveScreenshot('site-home-light.png', { fullPage: true });
});

test('site home — dark', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'dark' });
	await page.goto('/');
	await expect(page).toHaveScreenshot('site-home-dark.png', { fullPage: true });
});

test('styleguide — light', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'light' });
	await page.goto('/styleguide');
	// The masthead heading anchors the page; wait for it so the screenshot captures the settled DOM.
	await expect(page.getByRole('heading', { level: 1, name: 'Styleguide' })).toBeVisible();
	await expect(page).toHaveScreenshot('styleguide-light.png', { fullPage: true });
});

test('styleguide — dark', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'dark' });
	await page.goto('/styleguide');
	await expect(page.getByRole('heading', { level: 1, name: 'Styleguide' })).toBeVisible();
	await expect(page).toHaveScreenshot('styleguide-dark.png', { fullPage: true });
});
