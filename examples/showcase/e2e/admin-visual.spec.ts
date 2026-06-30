import { test, expect } from '@playwright/test';

// The SSR theme is selected by the `cairn-admin-theme` COOKIE, not by emulateMedia: the server reads the
// cookie to pick `cairn-admin` vs `cairn-admin-dark` before it renders, while emulateMedia only aligns the
// client-side media-query CSS (prefers-color-scheme) so the painted page matches the SSR choice. The cookie
// origin is derived from the test's `baseURL` fixture so a future preview-port change cannot desync the
// cookie origin from the navigation origin.

// The per-phase visual baseline. A sweep phase that intentionally shifts a surface updates the
// committed snapshot in the same commit; that update is the reviewed record of intended drift.
test('admin office shell — light', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'cairn-admin-theme', value: 'cairn-admin', url: baseURL! }]);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/admin/posts');
  await expect(page).toHaveScreenshot('admin-office-light.png', { fullPage: true });
});

test('admin office shell — dark', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'cairn-admin-theme', value: 'cairn-admin-dark', url: baseURL! }]);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/admin/posts');
  await expect(page).toHaveScreenshot('admin-office-dark.png', { fullPage: true });
});

// The vocabulary screen, the idiomatic-re-expression pilot. The Step-1 dev seed populates it (the
// listed tags, the in-use counts, the guarded delete, the unlisted seed section), so the baseline
// is the reviewed record of the populated screen, not a blank state.
test('admin vocabulary screen — light', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'cairn-admin-theme', value: 'cairn-admin', url: baseURL! }]);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/admin/vocabulary');
  await expect(page).toHaveScreenshot('vocabulary-light.png', { fullPage: true });
});

test('admin vocabulary screen — dark', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'cairn-admin-theme', value: 'cairn-admin-dark', url: baseURL! }]);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/admin/vocabulary');
  await expect(page).toHaveScreenshot('vocabulary-dark.png', { fullPage: true });
});
