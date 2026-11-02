import { test, expect, type Page } from '@playwright/test';
import { stringify } from 'devalue';
import { openCreateDialog } from './editor-helpers';

// A refused settings form keeps the working copy and puts focus on the refusal. Each screen below
// submits through `use:enhance`, so a refusal answers in place: the rows, tags, toggles, and typed
// values survive, and the alert takes focus. The server refusals are real wherever the screen's
// controls can produce one; Tidy's controls cannot produce invalid conventions, so its refusal is
// forged with page.route in the devalue form Kit's `deserialize` reads.
//
// hooks.server.ts seeds the owner session, so there is no login step. Every goto waits for the
// network to settle so the form is enhanced before the first click.

const FAILURE_NOTICE = 'That did not go through. Your text is still here; please try again.';

/** Open an admin screen and wait until it has hydrated, so its forms submit through `enhance`. */
async function open(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: 'networkidle' });
}

/** Match a request to one form action by its `?/<name>` search. */
function isAction(url: URL, pathname: string, name: string): boolean {
  return url.pathname === pathname && url.search.startsWith(`?/${name}`);
}

/** Set a marker a full document load would drop, so a test can tell an in-place update from a reload. */
async function markWindow(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as { __refusedFormsMarker?: boolean }).__refusedFormsMarker = true;
  });
}

/** Whether the marker survived: true means no document load happened since `markWindow`. */
async function markerSurvived(page: Page): Promise<boolean> {
  return page.evaluate(
    () => (window as unknown as { __refusedFormsMarker?: boolean }).__refusedFormsMarker === true,
  );
}

/** Add a nav row, blank its label, and return the labels now on screen. */
async function addBlankNavRow(page: Page): Promise<string[]> {
  const labels = page.locator('input[aria-label="Label"]');
  const before = await labels.count();
  await page.getByRole('button', { name: 'Add item' }).first().click();
  await expect(labels).toHaveCount(before + 1);
  await labels.last().fill('');
  const values = await labels.evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value));
  expect(values.at(-1)).toBe('');
  return values;
}

async function navLabels(page: Page): Promise<string[]> {
  return page
    .locator('input[aria-label="Label"]')
    .evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value));
}

test('Nav: a refused save keeps the rows and their order, and focuses the alert each time', async ({
  page,
}) => {
  await open(page, '/admin/nav');
  const expected = await addBlankNavRow(page);

  await page.getByRole('button', { name: 'Save navigation' }).click();
  const alert = page.locator('.alert-error');
  await expect(alert).toContainText('Each item needs a label');
  expect(await navLabels(page)).toEqual(expected);
  await expect(alert).toBeFocused();

  // The click moves focus to the button, so a second refusal proves the alert takes focus again.
  await page.getByRole('button', { name: 'Save navigation' }).click();
  expect(await navLabels(page)).toEqual(expected);
  await expect(page.locator('.alert-error')).toBeFocused();
});

test('Tags: a refused save keeps the other rows and focuses the alert', async ({ page }) => {
  await open(page, '/admin/vocabulary');
  const names = page.getByRole('textbox', { name: /^Tag name \(/ });
  const before = await names.evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value));
  expect(before.length).toBeGreaterThan(1);

  await names.first().fill('');
  await page.getByRole('button', { name: 'Save changes' }).click();

  const alert = page.locator('.alert-error');
  await expect(alert).toContainText('Each vocabulary entry needs a non-empty label');
  const after = await names.evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value));
  expect(after).toEqual(['', ...before.slice(1)]);
  await expect(alert).toBeFocused();
});

test('Tidy: a refused save keeps the changed toggle and focuses the alert', async ({ page }) => {
  const message = 'Those conventions could not be saved.';
  await page.route(
    (url) => isAction(url, '/admin/settings', 'settingsSave'),
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          type: 'failure',
          status: 400,
          data: stringify({ error: message }),
        }),
      }),
  );
  await open(page, '/admin/settings');
  const toggle = page.getByRole('button', { name: 'Oxford comma' });
  const was = await toggle.getAttribute('aria-pressed');
  await toggle.click();
  const now = was === 'true' ? 'false' : 'true';
  await expect(toggle).toHaveAttribute('aria-pressed', now);

  await page.getByRole('button', { name: 'Save changes' }).click();
  const alert = page.locator('.alert-error');
  await expect(toggle).toHaveAttribute('aria-pressed', now);
  await expect(alert).toContainText(message);
  await expect(alert).toBeFocused();
});

test('Create dialog: a refused create stays open with its values, focuses the alert, and reopens clean', async ({
  page,
}) => {
  await open(page, '/admin/pages');
  const dialog = await openCreateDialog(page, 'New page');
  await dialog.locator('input[name="title"]').fill('Another About');
  await dialog.locator('input[name="slug"]').fill('about');
  await dialog.getByRole('button', { name: 'Create' }).click();

  const alert = dialog.locator('.alert-error');
  await expect(page.locator('.alert-error').first()).toContainText('already exists');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('input[name="title"]')).toHaveValue('Another About');
  await expect(dialog.locator('input[name="slug"]')).toHaveValue('about');
  await expect(alert).toBeFocused();
  await expect(dialog.getByRole('button', { name: 'Create' })).toBeEnabled();
  // The refusal belongs to the dialog, so the page banner stays out of it.
  await expect(page.locator('.alert-error')).toHaveCount(1);

  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.alert-error')).toHaveCount(0);

  await openCreateDialog(page, 'New page');
  await expect(dialog.locator('.alert-error')).toHaveCount(0);
});

test('Editors: a refused add keeps Name and Email through the refresh and focuses the alert', async ({
  page,
}) => {
  await open(page, '/admin/editors');
  const addForm = page.locator('form[action="?/editorAdd"]');
  await addForm.getByLabel('Name').fill('Second Writer');
  await addForm.getByLabel('Email').fill('writer@showcase.test');
  await addForm.getByRole('button', { name: 'Add editor' }).click();

  const alert = page.locator('.alert-error');
  await expect(alert).toContainText('That editor already exists');
  await expect(addForm.getByLabel('Name')).toHaveValue('Second Writer');
  await expect(addForm.getByLabel('Email')).toHaveValue('writer@showcase.test');
  await expect(alert).toBeFocused();
});

test('Nav refused from ?saved=1 shows no saved banner, keeps its rows, and focuses the alert', async ({
  page,
}) => {
  await open(page, '/admin/nav?saved=1');
  await expect(page.getByText('Navigation saved.').first()).toBeVisible();
  const expected = await addBlankNavRow(page);

  await page.getByRole('button', { name: 'Save navigation' }).click();
  const alert = page.locator('.alert-error');
  await expect(alert).toContainText('Each item needs a label');
  await expect(page.getByText('Navigation saved.')).toHaveCount(0);
  expect(await navLabels(page)).toEqual(expected);
  await expect(alert).toBeFocused();
});

test('Create dialog refused from ?publishedAll=1 stays open with its values', async ({ page }) => {
  await open(page, '/admin/pages?publishedAll=1');
  const dialog = await openCreateDialog(page, 'New page');
  await dialog.locator('input[name="title"]').fill('Another About');
  await dialog.locator('input[name="slug"]').fill('about');
  await dialog.getByRole('button', { name: 'Create' }).click();

  await expect(page.locator('.alert-error').first()).toContainText('already exists');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('input[name="title"]')).toHaveValue('Another About');
  await expect(dialog.locator('input[name="slug"]')).toHaveValue('about');
  await expect(dialog.locator('.alert-error')).toBeFocused();
});

test('Nav: an error result keeps the rows and shows the notice', async ({ page }) => {
  await page.route(
    (url) => isAction(url, '/admin/nav', 'save'),
    (route) =>
      route.fulfill({
        status: 403,
        contentType: 'text/html',
        body: '<!doctype html><title>Forbidden</title><p>Forbidden</p>',
      }),
  );
  await open(page, '/admin/nav');
  const expected = await addBlankNavRow(page);

  await page.getByRole('button', { name: 'Save navigation' }).click();
  const alert = page.locator('.alert-error');
  await expect(alert).toContainText(FAILURE_NOTICE);
  expect(await navLabels(page)).toEqual(expected);
  await expect(alert).toBeFocused();
});

test('Nav: a double click on Save sends one POST', async ({ page }) => {
  await open(page, '/admin/nav');
  await page.getByRole('button', { name: 'Add item' }).first().click();
  // Hold the response so the second click lands while the first request is in flight.
  await page.route(
    (url) => isAction(url, '/admin/nav', 'save'),
    async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 400));
      await route.continue();
    },
  );
  let posts = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && isAction(new URL(request.url()), '/admin/nav', 'save')) posts++;
  });

  await page.getByRole('button', { name: 'Save navigation' }).dblclick();
  await expect(page).toHaveURL(/saved=1/);
  expect(posts).toBe(1);
});

test('Editors: add, role change, and remove update the table with no document load', async ({
  page,
}) => {
  await open(page, '/admin/editors');
  await markWindow(page);
  const email = `refused-forms-${Date.now()}@showcase.test`;
  const row = page.locator('tbody tr', { hasText: email });
  const status = page.getByRole('status');

  const addForm = page.locator('form[action="?/editorAdd"]');
  await addForm.getByLabel('Name').fill('Marker Editor');
  await addForm.getByLabel('Email').fill(email);
  await addForm.getByRole('button', { name: 'Add editor' }).click();
  await expect(row).toBeVisible();
  await expect(status).toHaveText('The editor list is updated.');
  await expect(addForm.getByLabel('Name')).toHaveValue('');

  await row.getByRole('button', { name: /^Toggle role / }).click();
  await expect(row.locator('.badge')).toHaveText('owner');

  await row.getByRole('button', { name: /^Remove / }).click();
  await expect(row).toHaveCount(0);
  await expect(status).toHaveText('The editor list is updated.');
  expect(await markerSurvived(page)).toBe(true);
});

test('Nav: a save redirects through a document load and the status region reads', async ({
  page,
}) => {
  await open(page, '/admin/nav');
  await page.getByRole('button', { name: 'Add item' }).first().click();
  await page.getByRole('button', { name: 'Save navigation' }).click();
  await expect(page).toHaveURL(/saved=1/);
  await page.waitForLoadState('networkidle');

  // The second save redirects to the URL the page is already on, so only a real document load
  // clears the marker; a client-side navigation to the same URL would leave it in place.
  await markWindow(page);
  await Promise.all([
    page.waitForEvent('domcontentloaded'),
    page.getByRole('button', { name: 'Save navigation' }).click(),
  ]);
  expect(await markerSurvived(page)).toBe(false);
  await expect(page.getByRole('status')).toHaveText('Navigation saved.');
});
