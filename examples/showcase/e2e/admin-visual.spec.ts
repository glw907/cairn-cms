import { test, expect } from '@playwright/test';

const ORIGIN = 'http://localhost:4173'; // the showcase preview origin from playwright.config webServer

// The per-phase visual baseline. A sweep phase that intentionally shifts a surface updates the
// committed snapshot in the same commit; that update is the reviewed record of intended drift.
test('admin office shell — light', async ({ page, context }) => {
  await context.addCookies([{ name: 'cairn-admin-theme', value: 'cairn-admin', url: ORIGIN }]);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/admin/posts');
  await expect(page).toHaveScreenshot('admin-office-light.png', { fullPage: true });
});

test('admin office shell — dark', async ({ page, context }) => {
  await context.addCookies([{ name: 'cairn-admin-theme', value: 'cairn-admin-dark', url: ORIGIN }]);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/admin/posts');
  await expect(page).toHaveScreenshot('admin-office-dark.png', { fullPage: true });
});
