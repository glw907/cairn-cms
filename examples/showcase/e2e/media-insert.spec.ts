import { test, expect } from '@playwright/test';

// The media Phase 2b insert UI, end to end against the running showcase with the fake R2 double on
// platform.env (hooks.server.ts) and the fake-github double recording commits. Unlike media-slice
// (which posts bytes by direct fetch to prove the backend legs), this drives the actual UI: the
// toolbar control, the popover chooser, the capture card, the optimistic loop, the source chip, and
// the preview thumbnail. The backend legs it leans on (the upload action, the save, media.json) are
// the same ones media-slice proves; here they ride the real author path.

// The seeded post on main.
const SEED = '2026-06-hello';

// A real, decodable 8x8 RGBA PNG. The 2a slice posted a 12-byte stub because it never decoded; this
// test goes through the client ingestFile, which runs createImageBitmap in the browser, so the bytes
// must be a decodable image or the upload never starts (decode-unsupported). A 1x1 PNG is too small
// for this headless Chromium build's createImageBitmap (it returns InvalidStateError), so the fixture
// is a small but real 8x8 image, which decodes cleanly.
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAEklEQVR4nGM4UWHzHx9mGBkKANOnnsGxplPJAAAAAElFTkSuQmCC';
const PNG_BUFFER = Buffer.from(PNG_BASE64, 'base64');

test('the insert UI: choose an image, the placeholder resolves to a media: reference, the preview shows a thumbnail, and saving commits media.json', async ({
  page,
  request,
}) => {
  // Open the seed entry directly. The list paginates at ten rows newest-first, and prior specs in
  // the run accumulate enough newer entries to push the June seed off page one, so a page-one link
  // click races the entry count. Navigating straight to the edit URL is order-independent.
  await page.goto(`/admin/posts/${SEED}`);
  await expect(page).toHaveURL(new RegExp(`/admin/posts/${SEED}$`));

  // 1. Open the popover from the toolbar Insert image control. The chooser view leads with upload.
  await page.getByRole('button', { name: 'Insert image' }).click();
  const popover = page.getByRole('dialog', { name: 'Insert image' });
  await expect(popover).toBeVisible();

  // 2. Choose a file. "Upload an image" clicks the hidden file input; setInputFiles hands it the real
  //    PNG buffer. The capture card then appears with the name pre-filled from the real stem.
  await popover.getByRole('button', { name: 'Upload an image' }).click();
  // Scope the file input to the popover: the hero field (3b) also renders a hidden file input in its
  // always-mounted dialog, so a page-wide `input[type="file"]` now matches two elements.
  await popover
    .locator('input[type="file"]')
    .setInputFiles({ name: 'seaside.png', mimeType: 'image/png', buffer: PNG_BUFFER });

  // The capture card pre-fills the display name from the real stem.
  await expect(popover.locator('input').first()).toHaveValue('seaside');

  // 3. Write an alt description and insert.
  await popover.getByText('Write a description').click();
  await popover.getByLabel('Alt text description').fill('A quiet shore');
  await popover.getByRole('button', { name: 'Insert image' }).click();

  // 4. The optimistic placeholder lands at the caret, then resolves to the committed reference. The
  //    upload is async (ingest then fetch then swap), so a web-first assertion retries until the
  //    source chip carries the display name (the placeholder gone, the reference written).
  const chip = page.locator('.cm-cairn-media-chip');
  await expect(chip).toBeVisible({ timeout: 15_000 });
  await expect(chip).toContainText('seaside');

  // The source now holds the committed reference. The source token renders as an atomic chip widget,
  // so the visible CodeMirror DOM shows the display name, not the hex; the real document text mirrors
  // into the editor's hidden body field (the form-submit value). Read it for the canonical token over
  // the server-derived slug and content hash.
  const body = await page.locator('input[name="body"]').inputValue();
  const refMatch = body.match(/media:seaside\.[0-9a-f]{16}/);
  expect(refMatch, 'the editor source carries a committed media: reference').not.toBeNull();
  const reference = refMatch![0];
  const hash = reference.split('.')[1];

  // 5. Switch to Preview and assert the thumbnail renders. The preview is a sandboxed iframe, so the
  //    img lives inside the frame; its src is the /media delivery path the resolveMedia step rewrote.
  await page.getByRole('tab', { name: 'Preview' }).click();
  const previewImg = page.frameLocator('iframe[title="Page preview"]').locator('img');
  await expect(previewImg).toHaveAttribute('src', `/media/seaside.${hash}.png`, { timeout: 15_000 });

  // 6. Save. The Save control submits the edit form, committing the body and media.json.
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  // The fake-github double records the .md commit on the entry's pending branch.
  await expect(async () => {
    const commit = await (await request.get('/test/last-commit')).json();
    expect(commit.branch).toBe(`cairn/posts/${SEED}`);
    expect(commit.path).toBe(`src/content/posts/${SEED}.md`);
    expect(commit.content).toContain(reference);
  }).toPass({ timeout: 15_000 });

  // The media.json committed in the same commit carries the uploaded row, keyed by its hash.
  const mediaFile = await request.get(
    `/test/branch-file?branch=${encodeURIComponent(`cairn/posts/${SEED}`)}&path=${encodeURIComponent('src/content/.cairn/media.json')}`,
  );
  expect(mediaFile.ok()).toBeTruthy();
  const { content } = (await mediaFile.json()) as { content: string };
  const manifest = JSON.parse(content) as Record<string, { slug: string; ext: string }>;
  expect(manifest[hash]).toBeTruthy();
  expect(manifest[hash].slug).toBe('seaside');
  expect(manifest[hash].ext).toBe('png');
});
