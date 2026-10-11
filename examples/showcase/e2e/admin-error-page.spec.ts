import { test, expect, type Page } from '@playwright/test';

// A failure inside /admin renders in the admin shell and its theme wrapper, never the public
// site's chrome. The fixture route throws a 403 (the dev handle always mints an owner session, so
// no access-map refusal is reachable otherwise); an unknown path under /admin is the 404 case.

/** Asserts the page's one h1 sits inside the shell's theme wrapper and the public header is absent. */
async function expectAdminErrorPage(page: Page, heading: string, body: string) {
  const h1 = page.getByRole('heading', { level: 1, name: heading });
  await expect(h1).toBeVisible();
  await expect(page.locator('[data-theme]').filter({ has: h1 })).toHaveCount(1);
  await expect(page.getByText(body)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to the dashboard' })).toHaveAttribute(
    'href',
    '/admin',
  );
  await expect(page.locator('.cairn-site-shell')).toHaveCount(0);
}

test('a refused admin page renders the 403 copy inside the admin theme wrapper', async ({
  page,
}) => {
  const response = await page.goto('/admin/error-fixture');
  expect(response?.status()).toBe(403);
  await expectAdminErrorPage(
    page,
    "You don't have access to this page.",
    "Your role doesn't include this page. Ask the site owner if you need access.",
  );
});

test('an unknown admin path renders the 404 copy inside the admin theme wrapper', async ({
  page,
}) => {
  const response = await page.goto('/admin/no-such-screen');
  expect(response?.status()).toBe(404);
  await expectAdminErrorPage(
    page,
    "This page doesn't exist.",
    'Check the address, or go back to the dashboard.',
  );
});
