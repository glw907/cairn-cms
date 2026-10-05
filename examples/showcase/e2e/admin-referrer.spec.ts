import { test, expect } from '@playwright/test';

// Every admin document carries exactly one referrer meta, emitted by the view that owns the
// document. Counting on the served document (not a component render) catches a second meta added
// by any child, and a head that lost its own. The header is asserted on the confirm document
// only: the e2e build runs the dev-backend handle in place of the guard, so `applySecurityHeaders`
// does not run here, while the confirm load sets its own header.
const documents = [
  { name: 'login', path: '/admin/login', header: false },
  { name: 'confirm', path: '/admin/auth/confirm?token=referrer-token', header: true },
  { name: 'edit', path: '/admin/posts/2026-06-hello', header: false },
] as const;

for (const { name, path, header } of documents) {
  test(`the ${name} document carries exactly one strict-origin referrer meta`, async ({ page }) => {
    const response = await page.goto(path);
    if (header) expect(response?.headers()['referrer-policy']).toBe('strict-origin');
    const metas = page.locator('head meta[name="referrer"]');
    await expect(metas).toHaveCount(1);
    await expect(metas).toHaveAttribute('content', 'strict-origin');
  });
}
