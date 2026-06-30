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

// The auth surfaces, swept in Phase 2 (office chrome). Both are public (isPublicAdminPath) and render
// unconditionally in the showcase: the dev backend mints locals.editor directly, so the seeded session is
// inert for these pathname-gated routes and there is no redirect to defend against. The login form is the
// unauthenticated entry; the confirm page renders its static "Almost there" state for any token (a GET
// consumes nothing, only the POST verifies), so the token reaches only a hidden input and the screenshot
// is deterministic. The role assertion settles the DOM before the screenshot.
test('admin login page — light', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'cairn-admin-theme', value: 'cairn-admin', url: baseURL! }]);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/admin/login');
  await expect(page.getByRole('button', { name: 'Send sign-in link' })).toBeVisible();
  await expect(page).toHaveScreenshot('auth-login-light.png', { fullPage: true });
});

test('admin login page — dark', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'cairn-admin-theme', value: 'cairn-admin-dark', url: baseURL! }]);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/admin/login');
  await expect(page.getByRole('button', { name: 'Send sign-in link' })).toBeVisible();
  await expect(page).toHaveScreenshot('auth-login-dark.png', { fullPage: true });
});

test('admin confirm page — light', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'cairn-admin-theme', value: 'cairn-admin', url: baseURL! }]);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/admin/auth/confirm?token=preview-token');
  await expect(page.getByRole('button', { name: 'Confirm sign-in' })).toBeVisible();
  await expect(page).toHaveScreenshot('auth-confirm-light.png', { fullPage: true });
});

test('admin confirm page — dark', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'cairn-admin-theme', value: 'cairn-admin-dark', url: baseURL! }]);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/admin/auth/confirm?token=preview-token');
  await expect(page.getByRole('button', { name: 'Confirm sign-in' })).toBeVisible();
  await expect(page).toHaveScreenshot('auth-confirm-dark.png', { fullPage: true });
});

// The editors page (ManageEditors), swept in Phase 3 (forms). The dev backend seeds the session owner
// plus one editor, so the table renders real rows; the heading settles the DOM before the screenshot.
test('admin editors page — light', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'cairn-admin-theme', value: 'cairn-admin', url: baseURL! }]);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/admin/editors');
  await expect(page.getByRole('heading', { level: 1, name: 'Editors' })).toBeVisible();
  await expect(page).toHaveScreenshot('admin-editors-light.png', { fullPage: true });
});

test('admin editors page — dark', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'cairn-admin-theme', value: 'cairn-admin-dark', url: baseURL! }]);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/admin/editors');
  await expect(page.getByRole('heading', { level: 1, name: 'Editors' })).toBeVisible();
  await expect(page).toHaveScreenshot('admin-editors-dark.png', { fullPage: true });
});
