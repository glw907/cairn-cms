import { test, expect } from '@playwright/test';

// Every admin document carries exactly one referrer meta, emitted by the view that owns the
// document. Counting on the served document (not a component render) catches a second meta added
// by any child, and a head that lost its own.
const documents = [
  { name: 'login', path: '/admin/login' },
  { name: 'confirm', path: '/admin/auth/confirm?token=referrer-token' },
  { name: 'edit', path: '/admin/posts/2026-06-hello' },
] as const;

for (const { name, path } of documents) {
  test(`the ${name} document carries exactly one strict-origin referrer meta and header`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.headers()['referrer-policy']).toBe('strict-origin');
    const metas = page.locator('head meta[name="referrer"]');
    await expect(metas).toHaveCount(1);
    await expect(metas).toHaveAttribute('content', 'strict-origin');
  });
}
