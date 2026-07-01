import { test, expect, type APIRequestContext } from '@playwright/test';

// The media Phase 3c Media Library, end to end against the running showcase behind the fake backend
// (the fake R2 double on platform.env and the fake-github recorder, the same harness the other media
// specs use). It drives the real /admin/media screen over a seeded asset set:
//
//   - a used + described asset (mountain-pass), referenced by the seed post on main, so its
//     where-used reads "Published on the site"
//   - an orphan + described asset (sunset-orphan), referenced by nothing, so it reads No references
//     found
//   - a needs-alt asset (untagged-shot), empty alt and unreferenced, so it is both Needs alt and No
//     references found
//   - a branch-only asset (draft-banner), living only on the open cairn/posts/2026-05-draft-gallery
//     branch and referenced by that branch's edited entry, so the union shows it and its where-used
//     names the branch
//
// The fixtures live in the in-memory repo (seedMediaLibrary in fake-github.ts) and the fake R2 store
// (seedObject in fake-r2.ts), seeded once at startup from hooks.server.ts. They are static module
// state, so this spec is independent of the per-run posts the other specs create. The seed is
// consistent with the existing specs: the content manifest lists the seed post (2026-06-hello) so
// listLoad keeps showing it, and the branch is a distinct id that never collides.

// The seeded asset facts, mirroring SEED_MEDIA in fake-github.ts.
const USED = { slug: 'mountain-pass', name: 'Mountain pass' };
const ORPHAN = { slug: 'sunset-orphan', name: 'Sunset orphan' };
const NEEDS_ALT = { slug: 'untagged-shot', name: 'Untagged shot', hash: '5555666677778888' };
const BRANCH_ONLY = { slug: 'draft-banner', name: 'Draft banner', hash: '9999aaaabbbbcccc' };
const BRANCH_NAME = 'cairn/posts/2026-05-draft-gallery';

const MEDIA_JSON_PATH = 'src/content/.cairn/media.json';

// The stable hashes (immutable across a rename), used by the delete and refusal assertions.
const USED_HASH = 'aa00bb11cc22dd33';
const ORPHAN_HASH = '1111222233334444';

// A real, decodable 8x8 RGBA PNG for the direct-upload spec, distinct from every other fixture's
// bytes (a new content hash) so it never collides with the seeded assets or the other specs' branch
// uploads on the shared backend. The client ingest runs createImageBitmap, so the bytes must decode;
// a 1x1 PNG is too small for this headless Chromium build's createImageBitmap.
const UPLOAD_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAHElEQVR4nGMQ6Vnw/1mF3H9cNAM+SRDNMCxMAADWK5dBjSjqrgAAAABJRU5ErkJggg==';
const UPLOAD_PNG_BUFFER = Buffer.from(UPLOAD_PNG_BASE64, 'base64');

/** Read main's committed media.json through the fixture endpoint. */
async function readMainMedia(request: APIRequestContext) {
  const res = await request.get(
    `/test/branch-file?branch=main&path=${encodeURIComponent(MEDIA_JSON_PATH)}`,
  );
  expect(res.ok()).toBeTruthy();
  const { content } = (await res.json()) as { content: string };
  return JSON.parse(content) as Record<string, { slug: string; displayName: string }>;
}

test('browse the library: the count line, the triage counts, and the seeded grid tiles', async ({
  page,
}) => {
  await page.goto('/admin/media');
  await expect(page.getByRole('heading', { name: 'Media library' })).toBeVisible();

  // The count line interleaves text nodes with a middot span, so match the containing paragraph by
  // its substrings. The exact totals drift: mediaLibraryLoad unions every open cairn/* branch's
  // media.json, and the other media specs leave branch uploads on the shared single-worker backend.
  // Assert the line carries the seeded set's facts (the shape, not a brittle literal).
  const countLine = page.locator('header p', { hasText: 'used on the site' });
  await expect(countLine).toContainText(/\d+ images/);
  await expect(countLine).toContainText(/\d+ used on the site/);

  // The grid lists the seeded tiles by their display name (the tile footer carries the name).
  const grid = page.getByRole('listbox', { name: 'Media library' });
  await expect(grid).toBeVisible();
  await expect(grid.getByText(USED.name, { exact: true })).toBeVisible();
  await expect(grid.getByText(ORPHAN.name, { exact: true })).toBeVisible();
  await expect(grid.getByText(NEEDS_ALT.name, { exact: true })).toBeVisible();
  await expect(grid.getByText(BRANCH_ONLY.name, { exact: true })).toBeVisible();

  // The triage radiogroup carries the three pick-one filters, each naming a live count (the exact
  // numbers drift with the other specs' branch uploads on the shared backend, so the dedicated
  // triage-filter test asserts the seeded set's membership rather than a global literal here).
  const triage = page.getByRole('radiogroup', { name: 'Filter assets' });
  await expect(triage.getByRole('radio', { name: /^All/ })).toBeVisible();
  await expect(triage.getByRole('radio', { name: /^Needs alt/ })).toBeVisible();
  await expect(triage.getByRole('radio', { name: /^No references found/ })).toBeVisible();
});

test('the list density: the table, the usage pill, the sortable Added header', async ({ page }) => {
  await page.goto('/admin/media');

  // Flip to the list density: a real table appears.
  await page.getByRole('button', { name: 'List view' }).click();
  const table = page.locator('table');
  await expect(table).toBeVisible();

  // The used asset's row carries the usage pill ("found in N"); the orphan reads "no references
  // found".
  const usedRow = table.locator('tr', { hasText: USED.name });
  await expect(usedRow.getByText(/found in 1/)).toBeVisible();
  const orphanRow = table.locator('tr', { hasText: ORPHAN.name });
  await expect(orphanRow.getByText('no references found')).toBeVisible();

  // The Added column is a real sortable header with aria-sort; the default is newest-first
  // (descending), and the sort button toggles it.
  const addedHeader = table.locator('th', { hasText: 'Added' });
  await expect(addedHeader).toHaveAttribute('aria-sort', 'descending');
  await addedHeader.getByRole('button', { name: 'Sort by date added' }).click();
  await expect(addedHeader).toHaveAttribute('aria-sort', 'ascending');
});

test('the triage filters: Needs alt isolates the empty-alt asset, No references found isolates the unreferenced', async ({
  page,
}) => {
  await page.goto('/admin/media');
  const grid = page.getByRole('listbox', { name: 'Media library' });
  const triage = page.getByRole('radiogroup', { name: 'Filter assets' });

  // Needs alt: only the empty-alt asset (untagged-shot) shows.
  await triage.getByRole('radio', { name: /Needs alt/ }).click();
  await expect(grid.getByText(NEEDS_ALT.name, { exact: true })).toBeVisible();
  await expect(grid.getByText(USED.name, { exact: true })).toHaveCount(0);
  await expect(grid.getByText(ORPHAN.name, { exact: true })).toHaveCount(0);

  // No references found: the orphan and the needs-alt one (both unreferenced); the used and
  // branch-referenced assets drop out.
  await triage.getByRole('radio', { name: /No references found/ }).click();
  await expect(grid.getByText(ORPHAN.name, { exact: true })).toBeVisible();
  await expect(grid.getByText(NEEDS_ALT.name, { exact: true })).toBeVisible();
  await expect(grid.getByText(USED.name, { exact: true })).toHaveCount(0);
  await expect(grid.getByText(BRANCH_ONLY.name, { exact: true })).toHaveCount(0);
});

test('the detail slide-over: the grouped where-used reads published for the used asset and names the branch for the branch-only one', async ({
  page,
}) => {
  await page.goto('/admin/media');
  const grid = page.getByRole('listbox', { name: 'Media library' });

  // Open the used asset's detail. The slide-over is a labelled region.
  await grid.getByText(USED.name, { exact: true }).click();
  const usedPanel = page.getByRole('region', { name: `${USED.name} details` });
  await expect(usedPanel).toBeVisible();
  // Where-used groups it under "Published on the site" with a link to the seed post's editor.
  await expect(usedPanel.getByText('Published on the site')).toBeVisible();
  await expect(
    usedPanel.locator('a[href="/admin/posts/2026-06-hello"]'),
  ).toBeVisible();
  // Close the panel before opening the next (Escape closes the non-modal region).
  await page.keyboard.press('Escape');
  await expect(usedPanel).toBeHidden();

  // Open the branch-only asset's detail. Its where-used names the open edit branch.
  await grid.getByText(BRANCH_ONLY.name, { exact: true }).click();
  const branchPanel = page.getByRole('region', { name: `${BRANCH_ONLY.name} details` });
  await expect(branchPanel).toBeVisible();
  await expect(branchPanel.getByText('In an unpublished edit')).toBeVisible();
  await expect(branchPanel.getByText(BRANCH_NAME)).toBeVisible();
});

test('edit the default alt and the name: the mediaUpdate commit lands the new slug and name on main', async ({
  page,
  request,
}) => {
  await page.goto('/admin/media');
  const grid = page.getByRole('listbox', { name: 'Media library' });

  // Open the orphan's detail and edit its name and slug, then Save. The orphan is unreferenced, so
  // editing it never risks another spec's fixtures.
  await grid.getByText(ORPHAN.name, { exact: true }).click();
  const panel = page.getByRole('region', { name: `${ORPHAN.name} details` });
  await expect(panel).toBeVisible();

  const newName = 'Sunset reworked';
  const newSlug = 'sunset-reworked';
  await panel.locator('input[name="displayName"]').fill(newName);
  await panel.locator('input[name="slug"]').fill(newSlug);
  // Set a described default alt through the radiogroup plus the alt field.
  await panel.getByText('Describe it').click();
  await panel.getByLabel('Alt text description').fill('A reworked sunset');
  await panel.getByRole('button', { name: 'Save', exact: true }).click();

  // The action commits the merged media.json on main; the orphan's row now carries the new slug and
  // name. The fake-github recorder keys media.json by hash, and the hash is immutable across a
  // rename, so read the row back by its original hash through the main media.json.
  await expect(async () => {
    const media = await readMainMedia(request);
    const row = media[ORPHAN_HASH];
    expect(row).toBeTruthy();
    expect(row.slug).toBe(newSlug);
    expect(row.displayName).toBe(newName);
  }).toPass({ timeout: 15_000 });
});

test('safe-delete the orphan: the calm face confirms, the row leaves main, and the R2 object is gone', async ({
  page,
  request,
}) => {
  await page.goto('/admin/media');
  const grid = page.getByRole('listbox', { name: 'Media library' });

  // The orphan may have been renamed by the prior test, so read its current name and slug back from
  // main's media.json by its stable hash. Narrow the grid to No references found, where the orphan
  // lives, then drive the delete from its detail slide-over.
  const triage = page.getByRole('radiogroup', { name: 'Filter assets' });
  await triage.getByRole('radio', { name: /No references found/ }).click();

  // The orphan delivery path before the delete: a GET returns the seeded bytes (200).
  const beforeMedia = await readMainMedia(request);
  const orphanRow = beforeMedia[ORPHAN_HASH];
  expect(orphanRow).toBeTruthy();
  const deliveryPath = `/media/${orphanRow.slug}.${ORPHAN_HASH}.png`;
  expect((await request.get(deliveryPath)).status()).toBe(200);

  // Open the orphan's detail (its name reflects the prior rename) and Delete: the calm orphan face
  // shows (no type-to-confirm), so "Delete it" submits straight away.
  await grid.getByText(orphanRow.displayName, { exact: true }).click();
  const panel = page.getByRole('region', { name: `${orphanRow.displayName} details` });
  await expect(panel).toBeVisible();
  await panel.getByRole('button', { name: 'Delete' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  // The calm face: no references found, and a plain Delete it (no typed-slug gate).
  await expect(dialog.getByText('No references found.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Delete it' }).click();

  // Effect 1: the manifest row is gone from main's media.json.
  await expect(async () => {
    const media = await readMainMedia(request);
    expect(media[ORPHAN_HASH]).toBeUndefined();
  }).toPass({ timeout: 15_000 });

  // Effect 2: the R2 object is gone, so the delivery path 404s. The commit-then-delete order is
  // unit-proven in Task 5; asserting both effects here is sufficient.
  await expect(async () => {
    expect((await request.get(deliveryPath)).status()).toBe(404);
  }).toPass({ timeout: 15_000 });
});

test('the in-use refusal: the dialog lists the breaking entry and gates Delete, and the server blocks a delete without the typed slug', async ({
  page,
  request,
}) => {
  await page.goto('/admin/media');
  const grid = page.getByRole('listbox', { name: 'Media library' });

  // Open the used asset and request a delete: the in-use face names the breaking entry and gates the
  // submit behind a typed slug.
  await grid.getByText(USED.name, { exact: true }).click();
  const panel = page.getByRole('region', { name: `${USED.name} details` });
  await expect(panel).toBeVisible();
  await panel.getByRole('button', { name: 'Delete' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  // The in-use face names the breaking published entry and disables Delete anyway until the slug is
  // typed.
  await expect(dialog.getByText('These would break')).toBeVisible();
  await expect(dialog.locator('a[href="/admin/posts/2026-06-hello"]')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Delete anyway' })).toBeDisabled();

  // Prove the server gate independently: POST the mediaDelete action for the used asset WITHOUT the
  // matching confirmSlug (the stale-client case). The action refuses with 409 and the row survives.
  const blocked = await page.evaluate(async (hash) => {
    const form = new FormData();
    form.set('hash', hash);
    // No confirmSlug: the server's fresh usage recheck refuses an in-use delete.
    const res = await fetch('/admin/media?/mediaDelete', {
      method: 'POST',
      body: form,
      redirect: 'manual',
    });
    const payload = (await res.json()) as { type: string; status?: number };
    return { type: payload.type, status: payload.status };
  }, USED_HASH);
  expect(blocked.type).toBe('failure');
  expect(blocked.status).toBe(409);

  // The used asset's row still lives in main's media.json: the gate held.
  const media = await readMainMedia(request);
  expect(media[USED_HASH]).toBeTruthy();
  expect(media[USED_HASH].slug).toBe(USED.slug);
});

test('direct upload: the header Upload button opens the capture dialog, and the new asset commits to main and shows in the grid', async ({
  page,
  request,
}) => {
  await page.goto('/admin/media');

  // The header Upload button. A file input carries an implicit ARIA "button" role too (the hidden
  // input behind it, accessible name "Upload an image"), so match the header button's name exactly.
  await page.getByRole('button', { name: 'Upload', exact: true }).click();

  // The click opens the OS file chooser via the hidden input behind both Upload buttons; hand it the
  // fixture directly rather than driving a native file dialog.
  await page
    .locator('input[type="file"][aria-label="Upload an image"]')
    .setInputFiles({ name: 'teal-checker.png', mimeType: 'image/png', buffer: UPLOAD_PNG_BUFFER });

  // The capture dialog opens over the chosen file.
  const dialog = page.getByTestId('cairn-library-upload-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Upload an image' })).toBeVisible();

  // Name it and submit. The Library passes MediaCaptureCard submitLabel="Upload image" (the shared
  // card defaults to "Insert image" for the editor insert flow).
  const displayName = 'Teal checker';
  const slug = 'teal-checker';
  await dialog.locator('input').first().fill(displayName);
  await dialog.getByRole('button', { name: 'Upload image' }).click();

  // The upload commits and redirects to the uploaded flash; the new asset appears in the grid.
  await expect(page).toHaveURL(/\/admin\/media\?uploaded=1/);
  await expect(page.locator('.alert-success')).toHaveText('Asset uploaded.');
  const grid = page.getByRole('listbox', { name: 'Media library' });
  await expect(grid.getByText(displayName, { exact: true })).toBeVisible();

  // The commit landed on main: the new row carries the filename-derived slug and the typed name.
  await expect(async () => {
    const uploadedMedia = await readMainMedia(request);
    const row = Object.values(uploadedMedia).find((r) => r.displayName === displayName);
    expect(row).toBeTruthy();
    expect(row!.slug).toBe(slug);
  }).toPass({ timeout: 15_000 });
});
