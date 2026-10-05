import { test, expect, type Page, type Response } from '@playwright/test';
import {
  FACTORY_ORIGIN_FRAGMENT,
  KIT_CROSS_SITE_BODY,
  ORIGINS,
  rewriteAdminDocument,
  submitNatively,
} from './csrf-helpers.js';

// SvelteKit's own Origin check runs on every route of the served build, admin included, because the
// site carries no csrf config. The members request form is the probe for the pair below: the auth
// channel also answers 403 on an origin mismatch (its own compare), so only Kit's exact body proves
// the framework refused, and a status alone would pass with the check switched off.

test('a form posted from the other host name is refused by the framework, not the auth channel', async ({
  page,
}) => {
  await page.goto(`${ORIGINS.loopback}/members/login`);
  await page.locator('#member-contact').fill('csrf-pair@showcase.test');
  const response = await submitNatively(
    page,
    page.locator('form[action="?/request"]'),
    `${ORIGINS.named}/members/login?/request`,
  );
  expect(response.status()).toBe(403);
  const body = await response.text();
  expect(body).toBe(KIT_CROSS_SITE_BODY);
  expect(body).not.toContain(FACTORY_ORIGIN_FRAGMENT);
});

test("the same submission from the form's own host name reaches the members form", async ({
  page,
}) => {
  await page.goto(`${ORIGINS.named}/members/login`);
  await page.locator('#member-contact').fill('csrf-pair@showcase.test');
  const response = await submitNatively(page, page.locator('form[action="?/request"]'));
  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body).not.toContain(KIT_CROSS_SITE_BODY);
  expect(body).not.toContain(FACTORY_ORIGIN_FRAGMENT);
  await expect(page.getByRole('status')).toContainText('A code was sent.');
});

test('a same-origin admin Save passes the framework check', async ({ page }) => {
  await page.goto('/admin/posts/2026-06-hello');
  // Keys go to CodeMirror only once it has mounted; typing at the server-rendered textarea races
  // hydration.
  const editor = page.locator('.cm-content');
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('Saved through the framework origin check.');
  await expect(page.locator('input[name="body"]')).toHaveValue(
    'Saved through the framework origin check.',
  );

  const posted = page.waitForResponse((response) => response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Save' }).click();
  const response = await posted;
  expect(response.status()).not.toBe(403);
  await expect(page).toHaveURL(/saved=1/);
});

test("the confirm page posts its form and gets the engine's answer, never the framework's refusal", async ({
  page,
}) => {
  await page.goto('/admin/auth/confirm?token=csrf-confirm-token');
  const posted = page.waitForResponse((response) => response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Confirm sign-in' }).click();
  const response = await posted;
  // The action answers (a redirect to sign-in, or its own failure page); either is the engine's,
  // reached only if the POST carried a real Origin. The framework's refusal is a bare 403.
  expect(response.status()).not.toBe(403);
  await expect(page.getByRole('heading', { name: /This didn’t work|Sign in to/ })).toBeVisible();
});

test.describe('a site that sets no-referrer everywhere', () => {
  // No scripts, so the form posts natively and nothing re-creates a stripped meta during hydration.
  test.use({ javaScriptEnabled: false });

  async function signIn(page: Page): Promise<Response> {
    await page.locator('input[name="email"]').fill('csrf-sitewide@showcase.test');
    const posted = page.waitForResponse((response) => response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Send sign-in link' }).click();
    return posted;
  }

  test("cairn's own referrer meta still carries a real Origin on the sign-in POST", async ({
    page,
  }) => {
    const counts = await rewriteAdminDocument(page, '/admin/login', { stripCairnMeta: false });
    await page.goto('/admin/login');
    const response = await signIn(page);
    expect(response.status()).toBe(200);
    expect(await response.text()).not.toContain(KIT_CROSS_SITE_BODY);
    await expect(
      page.getByRole('heading', { name: 'Check your email' }).or(page.getByRole('status')),
    ).toBeVisible();
    // The rewrite left cairn's meta in place; the early site meta is what it overrode.
    expect(counts).toEqual({ before: 1, after: 1 });
  });

  test('a tab whose document lost every cairn referrer meta is refused by the framework', async ({
    page,
  }) => {
    const counts = await rewriteAdminDocument(page, '/admin/login', { stripCairnMeta: true });
    await page.goto('/admin/login');
    const response = await signIn(page);
    expect(response.status()).toBe(403);
    expect(await response.text()).toBe(KIT_CROSS_SITE_BODY);
    expect(counts).toEqual({ before: 1, after: 0 });
  });
});
