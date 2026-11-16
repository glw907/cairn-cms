import { expect, test } from '@playwright/test';
import { fillTitleWhenHydrated, openCreateDialog } from './editor-helpers.js';

// The two items hold an image, a link, and text, and avoid `&`, a bare `*`, and brackets inside
// link text, which the markdown serializer rewrites (so the round trip stays byte-identical).
const ITEM_ONE =
  '![A trail map](https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=720) [Junior program](/programs/junior) Ages 10 to 16.';
const ITEM_TWO = '[Map night](/map-night) Second Tuesday.';

test('cards block: insert, edit, and save leave the markdown byte-identical', async ({ page }) => {
  // A fresh post with a unique slug, so this spec never touches the shared seed entry.
  const slug = `cards-post-${Date.now()}`;
  await page.goto('/admin/posts');
  const createDialog = await openCreateDialog(page);
  await createDialog.locator('input[name="title"]').fill('Cards Post');
  await createDialog.locator('input[name="slug"]').fill(slug);
  await createDialog.getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/new=1/, { timeout: 10_000 });
  await fillTitleWhenHydrated(page, 'Cards Post');
  const editUrl = new URL(page.url()).pathname;

  const editor = page.locator('.cm-content');
  await editor.click();

  // Insert block, pick cards. The form seeds from the preview, so trim its items to two.
  await page.getByRole('button', { name: 'Insert block' }).click();
  const dialog = page.locator('dialog[aria-labelledby="cairn-insert-dialog-title"]');
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-testid="cairn-pk-row"]', { hasText: 'Cards' }).click();
  await expect(dialog.locator('h2#cairn-insert-dialog-title')).toHaveText('Cards');

  const removeButtons = dialog.getByRole('button', { name: /^Remove item \d+$/ });
  while ((await removeButtons.count()) > 2) {
    await removeButtons.last().click();
  }
  await expect(removeButtons).toHaveCount(2);
  await dialog.getByLabel('Cards 1', { exact: true }).fill(ITEM_ONE);
  await dialog.getByLabel('Cards 2', { exact: true }).fill(ITEM_TWO);
  await dialog.getByRole('combobox', { name: 'Columns' }).selectOption('2');

  await dialog.getByRole('button', { name: 'Insert', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(editor).toContainText('::::cards');

  const hiddenBody = page.locator('input[name="body"]');
  const inserted = await hiddenBody.inputValue();
  expect(inserted).toContain(ITEM_ONE);
  expect(inserted).toContain(ITEM_TWO);

  // Edit block, then Update with no change: the body must not move.
  await editor.locator('.cm-line', { hasText: '::::cards' }).first().click();
  const editButton = page.getByRole('button', { name: 'Edit block' });
  await expect(editButton).toBeEnabled({ timeout: 5000 });
  await editButton.click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Update', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(await hiddenBody.inputValue()).toBe(inserted);

  // Save, reload, and the persisted body is the same bytes. serializeMarkdown ends every committed
  // file with one newline, so the reloaded body is the edited body plus that single final newline.
  await page.locator('.navbar').getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(/saved=1/, { timeout: 10_000 });
  await page.goto(editUrl);
  await expect(page.locator('.cm-content')).toBeVisible();
  await expect(page.locator('input[name="body"]')).toHaveValue(`${inserted}\n`, { timeout: 5000 });
});
