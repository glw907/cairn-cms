import { test, expect } from '@playwright/test';

// The public (site) theme toggle (SiteHeader.svelte): a manual override on top of the
// prefers-color-scheme default the rest of site-visual.spec.ts exercises. These tests drive the
// mechanism itself, not the pixels: the button flips `<html data-theme>` and persists a
// `cairn-site-theme` cookie that survives a reload, and a system-preference change with no cookie
// still resolves through the CSS the button never touches.

test('with no stored choice, the toggle button reflects the system scheme', async ({ page, context }) => {
	await context.clearCookies();
	await page.emulateMedia({ colorScheme: 'dark' });
	await page.goto('/');
	// The system is dark and nothing overrode it, so the button reads "currently dark, offers light".
	await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible();
	await expect(page.locator('html')).not.toHaveAttribute('data-theme');
});

test('clicking the toggle sets data-theme, persists the cookie, and survives a reload', async ({
	page,
	context,
}) => {
	await context.clearCookies();
	await page.emulateMedia({ colorScheme: 'light' });
	await page.goto('/');

	await expect(page.getByRole('button', { name: 'Switch to dark mode' })).toBeVisible();
	await page.getByRole('button', { name: 'Switch to dark mode' }).click();

	await expect(page.locator('html')).toHaveAttribute('data-theme', 'cairn-dark');
	await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible();

	const cookies = await context.cookies();
	const themeCookie = cookies.find((c) => c.name === 'cairn-site-theme');
	expect(themeCookie?.value).toBe('cairn-dark');

	// A reload with the system still light must keep the explicit dark choice: the head script in
	// app.html reads the cookie before first paint, and the button resolves the same attribute.
	await page.reload();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'cairn-dark');
	await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible();
});

test('an explicit light choice overrides a dark system scheme', async ({ page, context, baseURL }) => {
	await context.addCookies([{ name: 'cairn-site-theme', value: 'cairn', url: baseURL! }]);
	await page.emulateMedia({ colorScheme: 'dark' });
	await page.goto('/');

	await expect(page.locator('html')).toHaveAttribute('data-theme', 'cairn');
	await expect(page.getByRole('button', { name: 'Switch to dark mode' })).toBeVisible();
});
