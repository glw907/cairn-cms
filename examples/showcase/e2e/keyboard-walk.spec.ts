import { test, expect, type Page } from '@playwright/test';
import { stringify } from 'devalue';

// The three journeys a keyboard-only editor takes: sign in, edit and save, publish. Every step
// goes through page.keyboard, with no pointer and no `fill`, and each stop asserts that the
// document's active element is the control the step names and that the browser would draw its
// focus ring (`:focus-visible`). The edit and publish walks use an entry the spec creates with a
// per-run id, since the e2e run is one worker over one fake repo and publishing the shared seed
// would move it for every later spec.
//
// hooks.server.ts seeds the owner session, so the edit walks need no login. The sign-in walk
// stops where the fake auth database does: it has no token branch, so an address off the list and
// a confirm page both answer, and the walk asserts the answers the engine gives.

const ORIGIN = `http://localhost:${process.env.E2E_PORT ?? '4173'}`;

type Role = 'link' | 'button' | 'textbox';

/**
 * Press Tab until the active element is the one role and name name, then assert it shows focus.
 * The cap keeps a missing stop from looping; the stop count is not asserted, only reachability.
 */
async function tabTo(
  page: Page,
  role: Role,
  name: string | RegExp,
  options: { key?: string; presses?: number } = {},
): Promise<void> {
  const target = page.getByRole(role, { name, exact: typeof name === 'string' }).first();
  const key = options.key ?? 'Tab';
  for (let i = 0; i < (options.presses ?? 80); i++) {
    if (await isFocused(target)) break;
    await page.keyboard.press(key);
  }
  await expectFocused(page, role, name);
}

/** Whether the located element is the document's active element. */
function isFocused(locator: ReturnType<Page['getByRole']>): Promise<boolean> {
  return locator
    .evaluate((el) => el === document.activeElement, undefined, { timeout: 500 })
    .catch(() => false);
}

/** Assert the active element has the role and name, and that focus is visible on it. */
async function expectFocused(page: Page, role: Role, name: string | RegExp): Promise<void> {
  const target = page.getByRole(role, { name, exact: typeof name === 'string' }).first();
  await expect(target).toBeFocused();
  expect(await target.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
}

/**
 * Create a post and commit its first save through the forms' own actions, so it is a real entry
 * on the fake repo's default branch and appears in the office list. The create action only opens
 * an unsaved draft; the save posts the edit form exactly as the page holds it.
 */
async function createEntry(page: Page, title: string, slug: string): Promise<void> {
  await page.goto('/admin/posts', { waitUntil: 'networkidle' });
  const csrf = await page.locator('dialog form input[name="csrf"]').first().inputValue();
  const created = await page.request.post('/admin/posts?/create', {
    headers: { origin: ORIGIN, 'x-sveltekit-action': 'true' },
    form: { csrf, title, slug, date: '2026-11-02' },
  });
  const { location } = JSON.parse(await created.text()) as { location: string };
  await page.goto(location, { waitUntil: 'networkidle' });
  await expect(page.locator('.cm-content')).toBeVisible();
  const fields = await page
    .locator('form[action*="?/save"]')
    .first()
    .evaluate((form) => {
      const out: Record<string, string> = {};
      for (const [key, value] of new FormData(form as HTMLFormElement)) {
        if (typeof value === 'string') out[key] = value;
      }
      return out;
    });
  const saved = await page.request.post(`${location.split('?')[0]}?/save`, {
    headers: { origin: ORIGIN, 'x-sveltekit-action': 'true' },
    form: { ...fields, title, body: 'Typed by the setup.' },
  });
  expect(await saved.text(), String(saved.status())).toContain('"type":"redirect"');
}

/** Tab from the office list to the new entry's link, press Enter, and wait for the editor. */
async function openEntryByKeyboard(page: Page, title: string): Promise<void> {
  await page.goto('/admin/posts', { waitUntil: 'networkidle' });
  await tabTo(page, 'link', title);
  await page.keyboard.press('Enter');
  await expect(page.locator('.cm-content')).toBeVisible();
}

test('sign in by keyboard: Email, Enter, then the confirm page', async ({ page }) => {
  await page.goto('/admin/login', { waitUntil: 'networkidle' });
  await tabTo(page, 'textbox', 'Email');
  await page.keyboard.type('nobody@example.test');
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Check your email' }).or(page.getByRole('status')),
  ).toBeVisible();

  await page.goto('/admin/auth/confirm?token=keyboard-walk-token', { waitUntil: 'networkidle' });
  await tabTo(page, 'button', 'Confirm sign-in');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: /This didn’t work|Sign in to/ })).toBeVisible();
});

/** Reach the markdown editor by Tab and type into it, leaving the page dirty. */
async function typeIntoEditor(page: Page, text: string): Promise<void> {
  await tabTo(page, 'textbox', 'Markdown source');
  await page.keyboard.type(text);
  await expect(page.locator('.navbar .cairn-save-state')).toContainText('Unsaved changes');
}

/** Leave the editor backwards, past the toolbar and the title, to the Save button the edit made appear. */
async function backToSave(page: Page): Promise<void> {
  await tabTo(page, 'button', 'Save', { key: 'Shift+Tab' });
}

async function newEntry(page: Page, label: string): Promise<string> {
  const stamp = Date.now();
  const title = `Keyboard ${label} ${stamp}`;
  await createEntry(page, title, `keyboard-${label}-${stamp}`);
  return title;
}

test('edit and save by keyboard, then a refused save lands on the title', async ({ page }) => {
  const title = await newEntry(page, 'save');
  await openEntryByKeyboard(page, title);

  await typeIntoEditor(page, ' Typed by keyboard.');
  await backToSave(page);
  const reloaded = page.waitForEvent('load');
  await page.keyboard.press('Enter');
  await reloaded;
  await expect(page).toHaveURL(/saved=1/);
  await expect(page.locator('.navbar .cairn-save-state')).toHaveText('Saved');

  // A refused save names the title, so focus lands on it and marks it invalid.
  const message = 'That title is not allowed here.';
  await page.route(
    (url) => url.search.startsWith('?/save'),
    (route) =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          type: 'failure',
          status: 400,
          data: stringify({ error: message, field: 'title' }),
        }),
      }),
  );
  await typeIntoEditor(page, ' Once more.');
  await backToSave(page);
  await page.keyboard.press('Enter');
  await expect(page.locator('.alert', { hasText: message })).toBeVisible();
  await expectFocused(page, 'textbox', 'Title');
  await expect(page.getByRole('textbox', { name: 'Title' })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
});

test('publish by keyboard', async ({ page }) => {
  const title = await newEntry(page, 'publish');
  await openEntryByKeyboard(page, title);

  await tabTo(page, 'button', 'Publish');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/published=1/, { timeout: 10_000 });
  await expect(
    page.locator('.alert', { hasText: 'Published. The live site is rebuilding.' }),
  ).toBeVisible();
});
