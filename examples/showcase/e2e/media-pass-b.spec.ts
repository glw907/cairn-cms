import { test, expect, type APIRequestContext } from '@playwright/test';

// The media Pass B bulk-rewrite round-trips, end to end against the running showcase behind the fake
// backend (the fake R2 double on platform.env and the fake-github recorder, the same harness the other
// media specs use). It proves the two cross-corpus operations the Library's Replace and Push-alt
// dialogs (Tasks 7/8) drive, each as a real browser round-trip that commits to main and is read back
// from the committed markdown:
//
//   1. Alt propagation: push the asset's default alt into the published placements that lack it, with
//      the customized placements left alone (the overwrite opt-in unchecked). The will-fill entry gains
//      the alt; the custom-alt entry is byte-unchanged.
//   2. Replace: upload a new file for the asset (a new content hash) and repoint every published
//      reference to it in one commit, keeping the old asset's row. Both referencing entries are
//      repointed; main's media.json gains the new row and keeps the old.
//
// The fixture is a DEDICATED asset (first-light) referenced by two main entries whose MARKDOWN carries
// the real `media:` token, seeded once at startup (PASS_B_MEDIA / PASS_B_ENTRIES in fake-github.ts). It
// is isolated from the four Library assets, so this spec never perturbs media-library.spec.ts. The two
// tests run in order: alt first (it fills the empty placement), then replace (it repoints both tokens
// regardless of their alt). The webServer runs one worker, so the order holds.
//
// Fixture facts, mirroring PASS_B_MEDIA / PASS_B_ENTRIES in fake-github.ts.
const ASSET = {
  hash: 'cccc4444dddd5555',
  slug: 'first-light',
  name: 'First light',
  alt: 'Dawn light over the tracks',
};
const EMPTY_ENTRY = {
  name: 'Light on the early track',
  path: 'src/content/posts/2026-06-first-empty.md',
};
const CUSTOM_ENTRY = {
  name: 'A later pass',
  path: 'src/content/posts/2026-06-first-custom.md',
  customAlt: "A skier's own words",
};

const MEDIA_JSON_PATH = 'src/content/.cairn/media.json';

// A small but real PNG, distinct from every other fixture's bytes, so the replace upload hashes to a
// NEW value (a genuine new content hash, neither first-light's nor the insert spec's). It is a
// decodable 8x8 RGBA image: the client ingest runs createImageBitmap, so the bytes must decode, and a
// 1x1 PNG is too small for this headless Chromium's createImageBitmap. Buffer for setInputFiles.
const REPLACE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAgUlEQVR4nBXOQREAQAjDQKQgBSlIqRSkIAUnvdxzZ/JIRMgZcoXcIQsPXnw4IuVMuVLulIUHL778QclZcpXcJQsPXnz1g5az5Wq5WxYevPj6B+JBPIgH8YAHLz79YHgYHoaH4QEPXnzzg+VheVgelgc8ePHtD46H4+F4OB7w4MWHH/qRl8FweERHAAAAAElFTkSuQmCC';
const REPLACE_PNG_BUFFER = Buffer.from(REPLACE_PNG_BASE64, 'base64');

/** Read one committed file's content off a branch through the fixture endpoint, or null on a 404. */
async function readBranchFile(
  request: APIRequestContext,
  branch: string,
  path: string,
): Promise<string | null> {
  const res = await request.get(
    `/test/branch-file?branch=${encodeURIComponent(branch)}&path=${encodeURIComponent(path)}`,
  );
  if (!res.ok()) return null;
  const { content } = (await res.json()) as { content: string };
  return content;
}

/** Read main's committed media.json through the fixture endpoint. */
async function readMainMedia(
  request: APIRequestContext,
): Promise<Record<string, { slug: string; displayName: string }>> {
  const content = await readBranchFile(request, 'main', MEDIA_JSON_PATH);
  expect(content).not.toBeNull();
  return JSON.parse(content!) as Record<string, { slug: string; displayName: string }>;
}

/** Open the first-light asset's detail slide-over from the grid. The Library may union extra branch
 *  assets from the other specs, so target the asset by its display name (stable). */
async function openAsset(page: import('@playwright/test').Page) {
  await page.goto('/admin/media');
  const grid = page.getByRole('listbox', { name: 'Media library' });
  await expect(grid).toBeVisible();
  await grid.getByText(ASSET.name, { exact: true }).click();
  const panel = page.getByRole('region', { name: `${ASSET.name} details` });
  await expect(panel).toBeVisible();
  return panel;
}

test('alt-propagation round-trip: push the default alt fills the empty placement and leaves the custom one untouched', async ({
  page,
  request,
}) => {
  const panel = await openAsset(page);

  // Open the Push-alt dialog from the slide-over. It is the everyday register: no explicit role,
  // relying on the native <dialog> default (unlike the alertdialog register Replace uses).
  await panel.locator('[data-cairn-pushalt-open]').click();
  const dialog = page.getByTestId('cairn-alt-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).not.toHaveAttribute('role');

  // The will-fill bucket names the empty-alt entry; the customized bucket names the custom-alt entry.
  const fillBucket = dialog.locator('#cairn-ml-alt-fill');
  await expect(fillBucket).toContainText(EMPTY_ENTRY.name);
  const customBucket = dialog.locator('[data-cairn-alt-custom]');
  await expect(customBucket).toContainText(CUSTOM_ENTRY.name);

  // The alt being pushed is the asset's stored default alt.
  await expect(dialog).toContainText(`“${ASSET.alt}”`);

  // The opt-in stays UNCHECKED: the custom alt is left alone, only the gap is filled.
  await expect(dialog.locator('[data-cairn-alt-optin]')).not.toBeChecked();

  // Apply. The form posts ?/mediaAltPropagate and the action redirects to ?altPropagated=1.
  await dialog.locator('form[action="?/mediaAltPropagate"] button[type="submit"]').click();

  // The redirect lands on the Media library with the success flash. The flash text renders twice (a
  // polite sr-only live region plus the visible alert), so scope to the visible success alert.
  await expect(page).toHaveURL(/\/admin\/media\?altPropagated=1/);
  await expect(page.locator('.alert-success')).toHaveText('Alt text applied.');

  // The empty-alt entry's committed markdown now carries the default alt; the custom-alt entry is
  // byte-unchanged. Read both back through the branch-file fixture (the commit lands on main).
  await expect(async () => {
    const emptyMd = await readBranchFile(request, 'main', EMPTY_ENTRY.path);
    expect(emptyMd).toContain(`![${ASSET.alt}](media:${ASSET.slug}.${ASSET.hash})`);
  }).toPass({ timeout: 15_000 });

  const customMd = await readBranchFile(request, 'main', CUSTOM_ENTRY.path);
  expect(customMd).toContain(`![${CUSTOM_ENTRY.customAlt}](media:${ASSET.slug}.${ASSET.hash})`);
});

test('replace round-trip: a new file repoints both references and keeps the old asset row', async ({
  page,
  request,
}) => {
  // The old hash is still referenced by both entries (the alt round-trip changed only alt text).
  const beforeEmpty = await readBranchFile(request, 'main', EMPTY_ENTRY.path);
  const beforeCustom = await readBranchFile(request, 'main', CUSTOM_ENTRY.path);
  expect(beforeEmpty).toContain(ASSET.hash);
  expect(beforeCustom).toContain(ASSET.hash);

  const panel = await openAsset(page);

  // Open the Replace dialog. It is the danger register: role="alertdialog".
  await panel.locator('[data-cairn-replace-open]').click();
  const dialog = page.getByTestId('cairn-replace-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('role', 'alertdialog');

  // Choose a new file. setInputFiles drives the component's client ingest + ?/mediaUpload, then the
  // ?/mediaReplacePreview fetch. The file input is the hidden one inside the upload step. The new
  // asset's slug is derived from the filename stem (slugifyFilename, no collision suffix), so naming
  // the file first-light.png keeps the repointed token's slug stable while the content hash changes.
  await dialog
    .locator('input[type="file"]')
    .setInputFiles({ name: 'first-light.png', mimeType: 'image/png', buffer: REPLACE_PNG_BUFFER });

  // The impact review resolves: it names both affected entries and the affected count (2). The upload
  // and preview are async, so retry until the review names an entry (the dialog advanced past upload).
  await expect(dialog).toContainText(EMPTY_ENTRY.name, { timeout: 15_000 });
  await expect(dialog).toContainText(CUSTOM_ENTRY.name);
  // The content-addressed copy: the name stays, only the hash changes.
  await expect(dialog).toContainText('Only the content hash changes');
  // The from-strip shows the old hash struck through; the affected count reads 2 in the apply button.
  await expect(dialog).toContainText(`.${ASSET.hash}`);
  const applyButton = dialog.locator('form[action="?/mediaReplace"] button[type="submit"]');
  await expect(applyButton).toContainText('Replace in 2 entries');

  // The apply is gated behind the typed slug; it is disabled until the slug is typed.
  await expect(applyButton).toBeDisabled();
  await dialog.locator('[data-cairn-replace-confirm]').fill(ASSET.slug);
  await expect(applyButton).toBeEnabled();

  // Read the new hash off the to-strip (the new file's content hash, surfaced as `.<hash>`). It must
  // differ from the old hash, proving a genuine new content-addressed asset.
  const newFileHashText = await dialog
    .locator('input[name="newHash"]')
    .inputValue();
  expect(newFileHashText).toMatch(/^[0-9a-f]{16}$/);
  expect(newFileHashText).not.toBe(ASSET.hash);

  // Apply. The form posts ?/mediaReplace and the action redirects to ?replaced=1.
  await applyButton.click();
  await expect(page).toHaveURL(/\/admin\/media\?replaced=1/);
  // The flash text renders twice (sr-only live region + visible alert); scope to the visible alert.
  await expect(page.locator('.alert-success')).toHaveText('Asset replaced.');

  // Both entries' committed markdown now reference the NEW hash, no longer the old one.
  await expect(async () => {
    const emptyMd = await readBranchFile(request, 'main', EMPTY_ENTRY.path);
    expect(emptyMd).toContain(`media:${ASSET.slug}.${newFileHashText}`);
    expect(emptyMd).not.toContain(ASSET.hash);
  }).toPass({ timeout: 15_000 });

  const customMd = await readBranchFile(request, 'main', CUSTOM_ENTRY.path);
  expect(customMd).toContain(`media:${ASSET.slug}.${newFileHashText}`);
  expect(customMd).not.toContain(ASSET.hash);
  // The custom alt survives the repoint (replace leaves alt text exactly as it is).
  expect(customMd).toContain(`![${CUSTOM_ENTRY.customAlt}]`);

  // Main's media.json now carries the NEW row (the uploaded asset) and STILL carries the old
  // first-light row: replace keeps the old bytes, so a developer can recover the prior asset.
  const media = await readMainMedia(request);
  expect(media[newFileHashText]).toBeTruthy();
  expect(media[newFileHashText].slug).toBe(ASSET.slug);
  expect(media[ASSET.hash]).toBeTruthy();
  expect(media[ASSET.hash].slug).toBe(ASSET.slug);
});
