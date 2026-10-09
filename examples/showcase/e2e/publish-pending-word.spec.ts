import { test, expect } from '@playwright/test';
import { fillTitleWhenHydrated } from './editor-helpers';

// A publish submitted from the edit page while a personal-dictionary word is still pending. The
// page commits the word to main first and only then posts the publish, and publish reads the
// default branch's head before it reads the snapshots it commits, so the dictionary commit has
// moved the head before that read. The publish must land without a conflict and the word must
// be on main afterwards.
//
// hooks.server.ts seeds the editor session, so there is no login step. The entry and the word are
// both unique to the run, so the spec leaves the seed entries and their flagged words untouched.

const DICTIONARY_PATH = 'src/content/.cairn/dictionary.txt';

/** A letters-only token no dictionary knows, unique per run: digits of the clock map to letters. */
function uniqueWord(): string {
  const letters = Date.now()
    .toString()
    .replace(/\d/g, (d) => 'qzxvkwjbmp'[Number(d)]);
  return `zq${letters}`;
}

test('a publish with a pending dictionary word lands without a conflict and commits the word', async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const word = uniqueWord();
  const slug = `pending-word-${Date.now()}`;

  await page.goto('/admin/posts');
  await page.locator('header').getByRole('button', { name: 'New post' }).click();
  const createDialog = page.locator('dialog[aria-labelledby="cairn-create-dialog-title"]');
  await expect(createDialog).toBeVisible();
  await createDialog.locator('input[name="title"]').fill('Pending Word');
  await createDialog.locator('input[name="slug"]').fill(slug);
  await createDialog.getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/new=1/, { timeout: 10_000 });

  await fillTitleWhenHydrated(page, 'Pending Word');
  await page.locator('.cm-content').click();
  await page.keyboard.type(`The ${word} stays.`);
  await expect(page.locator('input[name="body"]')).toHaveValue(`The ${word} stays.`, {
    timeout: 2000,
  });

  // The worker streams the dictionary on first lint, so allow time for the underline to paint.
  const underlines = page.locator('.cm-lintRange-info');
  await expect(async () => {
    await expect(underlines).toHaveCount(1);
  }).toPass({ timeout: 60_000 });
  await underlines.filter({ hasText: word }).click();
  const popover = page.locator('.cairn-cm-suggest');
  await expect(popover).toBeVisible({ timeout: 10_000 });
  await popover.getByRole('button', { name: 'Add to dictionary' }).click();
  await expect(underlines).toHaveCount(0, { timeout: 10_000 });

  // The word is pending, uncommitted. Publish straight from the page's own submit.
  await page.locator('.navbar').getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page).toHaveURL(/published=1/, { timeout: 10_000 });
  await expect(
    page.locator('.alert', { hasText: 'Published. The live site is rebuilding.' }),
  ).toBeVisible();
  await expect(page.locator('.alert', { hasText: 'Publish again' })).toHaveCount(0);

  // The pending word reached main in its own commit.
  const dictionary = await request.get(
    `/test/branch-file?branch=main&path=${encodeURIComponent(DICTIONARY_PATH)}`,
  );
  expect(dictionary.ok()).toBeTruthy();
  const { content } = (await dictionary.json()) as { content: string };
  expect(content.split('\n')).toContain(word);
});
