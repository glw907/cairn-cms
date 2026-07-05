import { test, expect } from '@playwright/test';

// The 320px masthead defect: the wordmark ("Cairn Showcase") wrapped to two lines because the flex
// row let it shrink below its content width, and the primary nav clipped off the right edge of the
// viewport mid-item, leaving the tail of the nav (Styleguide, Admin) unreachable by a real tap. The
// fix is no-JS-first CSS: the wordmark carries `white-space: nowrap` so it can only ever wrap the
// row, never the letters, and the header's outer row plus the nav itself carry `flex-wrap` so the
// nav drops to its own full-width line below the wordmark instead of overflowing past the viewport.
// Nav links also grow a 44px-class touch target (WCAG 2.5.5), so a wrapped nav stays tappable, not
// just visible. Tested at 320/360/390, the phone-class widths the evidence shots covered.
for (const width of [320, 360, 390]) {
	test(`at ${width}px the wordmark stays one line and every nav item is reachable and tappable`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: 800 });
		await page.goto('/');

		const wordmark = page.locator('.site-header a[href="/"] span');
		await expect(wordmark).toBeVisible();
		expect(await wordmark.evaluate((el) => getComputedStyle(el).whiteSpace)).toBe('nowrap');

		// nowrap only forbids letter-wrapping; the real proof it did not just overflow off-screen is
		// that the wordmark's own box sits fully inside the viewport.
		const wordmarkBox = await wordmark.boundingBox();
		expect(wordmarkBox).not.toBeNull();
		expect(wordmarkBox!.x).toBeGreaterThanOrEqual(0);
		expect(wordmarkBox!.x + wordmarkBox!.width).toBeLessThanOrEqual(width);

		// Scoped to the header: the footer reuses the `.site-nav` class for its own, separate nav.
		const navLinks = page.locator('.site-header nav.site-nav a');
		const count = await navLinks.count();
		expect(count).toBeGreaterThan(0);
		for (let i = 0; i < count; i += 1) {
			const link = navLinks.nth(i);
			await expect(link).toBeVisible();
			const box = await link.boundingBox();
			expect(box).not.toBeNull();
			// Reachable: the full box sits inside the viewport, not clipped past the right edge.
			expect(box!.x).toBeGreaterThanOrEqual(0);
			expect(box!.x + box!.width).toBeLessThanOrEqual(width);
			// Tappable: a 44px-class touch target (WCAG 2.5.5 AA), not the original ~27px hit area.
			expect(box!.height).toBeGreaterThanOrEqual(44);
		}
	});

	// The footer nav gets the same WCAG 2.5.8 treatment as the header: `flex-wrap` so it drops to
	// its own line rather than clipping, and a 44px-class tap target on every link.
	test(`at ${width}px every footer nav item is reachable and tappable`, async ({ page }) => {
		await page.setViewportSize({ width, height: 800 });
		await page.goto('/');

		const footerLinks = page.locator('.site-footer nav.site-nav a');
		const count = await footerLinks.count();
		expect(count).toBeGreaterThan(0);
		for (let i = 0; i < count; i += 1) {
			const link = footerLinks.nth(i);
			await expect(link).toBeVisible();
			const box = await link.boundingBox();
			expect(box).not.toBeNull();
			expect(box!.x).toBeGreaterThanOrEqual(0);
			expect(box!.x + box!.width).toBeLessThanOrEqual(width);
			expect(box!.height).toBeGreaterThanOrEqual(44);
		}
	});
}
