import { test, expect } from '@playwright/test';

// The v2 container fields (posts.faq = array(object), posts.gallery = array(image)) end to end against
// the running showcase behind the fake backend (the fake-github recorder plus the fake R2 double on
// platform.env, the same harness the reference and media specs use). The container fields live behind
// the Details slide-over (carry-forward #4a: a field e2e must open Details before the field is in the
// DOM), so each part opens it first.
//
// Part A drives the repeatable-row editor in a fresh, self-contained post: add an FAQ row, fill its
// question and answer, add a SECOND row, reorder the two, remove one, save, reload, and assert the
// surviving row persists in order. This exercises the keyed-row envelope's B1 path (a remove and a
// reorder must not lose a typed value) end to end, not only in the unit round-trip.
//
// Part B drives the leaf-array image editor: add a gallery image through the row's hero field, Save,
// and assert the structured value round-trips through reload.
//
// The fresh-post isolation mirrors the reference and media specs: a save persists the entry's pending
// branch on the one-worker shared backend, so each part creates its own post and never touches a seed
// branch another spec depends on.

// A real, decodable 8x8 RGBA PNG (the same proven bytes the media-hero spec uploads). A content-hash
// collision with another spec only triggers a dedup reuse, which still returns a valid media: ref;
// this spec captures the actual ref and asserts that it round-trips, so a reuse is harmless here.
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAHElEQVR4nGPQmtv//2K+1X9cNAM+SRDNMCxMAAAgSZnBatc95QAAAABJRU5ErkJggg==';
const PNG_BUFFER = Buffer.from(PNG_BASE64, 'base64');
const GALLERY_ALT = 'A trail marker at the first switchback';

test('the FAQ array(object) round-trips: add two rows, reorder, remove one, save, reload, order and content persist', async ({
  page,
}) => {
  // A unique slug per run so a reused local server (reuseExistingServer) does not collide.
  const slug = `faq-roundtrip-${Date.now()}`;

  await page.goto('/admin/posts');

  // Create the entry through the header dialog.
  await page.locator('header').getByRole('button', { name: 'New Posts' }).click();
  const createDialog = page.locator('dialog[aria-labelledby="cairn-create-dialog-title"]');
  await expect(createDialog).toBeVisible();
  await createDialog.locator('input[name="title"]').fill('FAQ Roundtrip');
  await createDialog.locator('input[name="slug"]').fill(slug);
  await createDialog.getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/new=1/, { timeout: 10_000 });
  const id = new URL(page.url()).pathname.split('/').pop() ?? '';

  // Required title plus a body so the save validates and commits the branch.
  await page.locator('input[name="title"]').fill('FAQ Roundtrip');
  const editor = page.locator('.cm-content');
  await editor.click();
  await page.keyboard.type('A body for the FAQ round-trip.');
  await expect(page.locator('input[name="body"]')).toHaveValue('A body for the FAQ round-trip.', {
    timeout: 2000,
  });

  // Open the Details slide-over FIRST: the FAQ container is not in the DOM until the panel opens.
  await page.getByRole('button', { name: 'Details', exact: true }).click();

  // The FAQ list renders its labeled Add control. Add the first row; the row auto-expands and the
  // question input takes focus. Fill the question and the answer (named faq.0.question / faq.0.answer).
  await page.getByRole('button', { name: 'Add FAQ' }).click();
  await page.locator('input[name="faq.0.question"]').fill('What is cairn?');
  await page.locator('textarea[name="faq.0.answer"]').fill('A markdown-first CMS.');

  // Add a second row and fill it (faq.1.*). Two rows now stand in order: row 0 "What is cairn?",
  // row 1 "Who is it for?".
  await page.getByRole('button', { name: 'Add FAQ' }).click();
  await page.locator('input[name="faq.1.question"]').fill('Who is it for?');
  await page.locator('textarea[name="faq.1.answer"]').fill('Small calm sites.');

  // Reorder: move the second row up. The keyed-row envelope keeps each typed value with its row, so
  // after the move the rows read "Who is it for?" then "What is cairn?". The names re-derive from the
  // new positions, so faq.0 now carries the formerly-second row.
  const moveSecondUp = page.locator('[data-cairn-row]').nth(1).locator('[data-cairn-row-up]');
  await moveSecondUp.click();
  await expect(page.locator('input[name="faq.0.question"]')).toHaveValue('Who is it for?');
  await expect(page.locator('input[name="faq.1.question"]')).toHaveValue('What is cairn?');

  // Remove the now-second row ("What is cairn?"). One row survives: "Who is it for?". The B1 path:
  // the survivor keeps its typed value across the remove rather than inheriting the removed row's.
  await page.locator('[data-cairn-row]').nth(1).locator('[data-cairn-row-remove]').click();
  await expect(page.locator('[data-cairn-row]')).toHaveCount(1);
  await expect(page.locator('input[name="faq.0.question"]')).toHaveValue('Who is it for?');
  await expect(page.locator('textarea[name="faq.0.answer"]')).toHaveValue('Small calm sites.');

  // Save. frontmatterFromForm decodes the one surviving row; the commit lands the branch.
  await page.locator('.navbar').getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(/saved=1/, { timeout: 10_000 });

  // Reload the editor from scratch. The load reads the committed frontmatter back through formValues,
  // and the FAQ row renders its persisted question and answer in order: the container round-tripped.
  await page.goto(`/admin/posts/${id}`);
  await page.getByRole('button', { name: 'Details', exact: true }).click();
  // The surviving row collapses to its itemLabel summary; expand it to read the leaf inputs.
  await page.locator('[data-cairn-row]').first().locator('[data-cairn-row-toggle]').click();
  await expect(page.locator('input[name="faq.0.question"]')).toHaveValue('Who is it for?');
  await expect(page.locator('textarea[name="faq.0.answer"]')).toHaveValue('Small calm sites.');
  // Exactly one row persisted: the removed row did not survive the save.
  await expect(page.locator('[data-cairn-row]')).toHaveCount(1);
});

test('the gallery array(image) round-trips: add an image row, save, reload, the structured value persists', async ({
  page,
}) => {
  const slug = `gallery-roundtrip-${Date.now()}`;

  await page.goto('/admin/posts');
  await page.locator('header').getByRole('button', { name: 'New Posts' }).click();
  const createDialog = page.locator('dialog[aria-labelledby="cairn-create-dialog-title"]');
  await expect(createDialog).toBeVisible();
  await createDialog.locator('input[name="title"]').fill('Gallery Roundtrip');
  await createDialog.locator('input[name="slug"]').fill(slug);
  await createDialog.getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/new=1/, { timeout: 10_000 });
  const id = new URL(page.url()).pathname.split('/').pop() ?? '';

  await page.locator('input[name="title"]').fill('Gallery Roundtrip');
  const editor = page.locator('.cm-content');
  await editor.click();
  await page.keyboard.type('A body for the gallery round-trip.');
  await expect(page.locator('input[name="body"]')).toHaveValue('A body for the gallery round-trip.', {
    timeout: 2000,
  });

  // Open Details, then add a gallery row. The row auto-expands to its image field, whose empty state
  // is a dropzone CTA derived from the field label ("Add image" for the gallery item).
  await page.getByRole('button', { name: 'Details', exact: true }).click();
  await page.getByRole('button', { name: 'Add Gallery' }).click();

  // The row's image field dialog: upload a real PNG, describe it, and confirm. The CTA derives from
  // the field label, so the gallery item reads "Add image" (the top-level hero reads "Add hero
  // image"); scope to the gallery row anyway. The dialog's labelledby id prefix is stable.
  const galleryRow = page.locator('[data-cairn-row]').first();
  await galleryRow.getByRole('button', { name: 'Add image' }).click();
  // Two hero dialogs share the labelledby prefix (the top-level hero plus this row's); the one we
  // opened carries the [open] attribute.
  const dialog = page.locator('dialog[aria-labelledby^="cairn-hero-title"][open]');
  await expect(dialog).toBeVisible();
  await dialog
    .locator('input[type="file"]')
    .setInputFiles({ name: 'switchback.png', mimeType: 'image/png', buffer: PNG_BUFFER });
  await expect(dialog.getByText('Describe it')).toBeVisible({ timeout: 15_000 });
  await dialog.getByText('Describe it').click();
  await dialog.getByLabel('Alt text description').fill(GALLERY_ALT);
  await dialog.getByRole('button', { name: 'Use this image' }).click();
  await expect(dialog).toBeHidden();

  // The row's hidden inputs carry the structured value at the prefixed name (gallery.0.*). A dedup
  // reuse of another spec's identical bytes can name the slug after the first uploader, so assert the
  // media: shape rather than a fixed slug.
  const srcInput = page.locator('input[name="gallery.0.src"]');
  await expect(srcInput).toHaveValue(/^media:[a-z0-9-]+\.[0-9a-f]{16}$/);
  await expect(page.locator('input[name="gallery.0.alt"]')).toHaveValue(GALLERY_ALT);
  const reference = await srcInput.inputValue();

  // Save. frontmatterFromForm decodes the one image row; the commit lands the branch.
  await page.locator('.navbar').getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(/saved=1/, { timeout: 10_000 });

  // Reload from scratch. formValues reads the committed gallery back, and the row's hidden inputs
  // carry the same structured value: the leaf-array image round-tripped end to end.
  await page.goto(`/admin/posts/${id}`);
  await page.getByRole('button', { name: 'Details', exact: true }).click();
  await page.locator('[data-cairn-row]').first().locator('[data-cairn-row-toggle]').click();
  await expect(page.locator('input[name="gallery.0.src"]')).toHaveValue(reference);
  await expect(page.locator('input[name="gallery.0.alt"]')).toHaveValue(GALLERY_ALT);
});
