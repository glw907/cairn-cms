import { test, expect, type Page } from '@playwright/test';

// The reading-surface article carries several real (network-fetched) images: a hero and three figure
// placements. toHaveScreenshot's own stability poll can time out while one is still decoding, since a
// late image swap keeps shifting the page between polls. Waiting for every <img> to report `complete`
// first removes that source of flake instead of papering over it with a longer timeout.
async function waitForImagesToLoad(page: Page): Promise<void> {
	await page.waitForFunction(() =>
		Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0),
	);
}

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

// The responsive-extremes matrix. Three Waymark-audit fixes (the masthead's flex-wrap at the phone
// floor, the fluid root-scale clamp at the ultrawide ceiling, and the table's own scroll container)
// only show at a width the default 1280px project viewport never renders, so this block pins the two
// ends of that range on light theme: 320px, the narrowest real phone class, and 2560px, the clamp's
// scaled ceiling. It covers both the home page (the chrome: masthead, nav, footer) and the
// reading-surface article (the richest content page: figures, a table, a pull-quote). A future width
// change to either surface is deliberate only if it also updates one of these baselines.
//
// Widen this matrix sparingly: every added width is a baseline to regenerate and eyeball by hand.
// One mid-width addition earns its runtime, on the article only: the root clamp is a continuous
// `vw` interpolation between 1440px (flat 1rem, the same as 320px) and ~2200px (flat ~1.125rem, the
// same as 2560px), so the two extremes alone only prove the clamp's floor and its cap, never the
// slope between them. A 1920px baseline sits inside that active range, where a formula regression
// (a changed intercept or slope) would move every rem-sized measure and line break on the page while
// still leaving both endpoint screenshots unchanged. The article, not home, gets this baseline: its
// long paragraphs re-wrap visibly on a font-size drift, a sharper signal than the home page's cards.
for (const width of [320, 2560]) {
	test(`site home — light — ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 800 });
		await page.emulateMedia({ colorScheme: 'light' });
		await page.goto('/');
		await expect(page).toHaveScreenshot(`site-home-light-${width}.png`, { fullPage: true });
	});

	test(`reading-surface article — light — ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 800 });
		await page.emulateMedia({ colorScheme: 'light' });
		await page.goto('/posts/the-reading-surface');
		await expect(page.getByRole('heading', { level: 1, name: 'The reading surface' })).toBeVisible();
		await waitForImagesToLoad(page);
		await expect(page).toHaveScreenshot(`site-article-light-${width}.png`, { fullPage: true, timeout: 20000 });
	});
}

test('reading-surface article — light — 1920px (mid, active clamp slope)', async ({ page }) => {
	await page.setViewportSize({ width: 1920, height: 800 });
	await page.emulateMedia({ colorScheme: 'light' });
	await page.goto('/posts/the-reading-surface');
	await expect(page.getByRole('heading', { level: 1, name: 'The reading surface' })).toBeVisible();
	await waitForImagesToLoad(page);
	await expect(page).toHaveScreenshot('site-article-light-1920.png', { fullPage: true, timeout: 20000 });
});
