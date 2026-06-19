import { test, expect, type APIRequestContext } from '@playwright/test';

// The media Pass C cross-corpus operations, end to end against the running showcase behind the fake
// backend (the fake R2 double on platform.env and the fake-github recorder, the same harness the
// other media specs use). It proves the two destructive flows the Library drives, each a real browser
// round-trip:
//
//   1. Bulk delete: multi-select two assets (one with no references, one in use), open the
//      skip-and-report alertdialog, apply, and read the result. The no-reference asset's row leaves
//      main's media.json; the in-use one is skipped on the server's strict recheck and survives.
//   2. Orphan purge: scan storage, see the orphaned byte (a stored object with no record) and the
//      read-only broken-reference readout (a record whose file is gone), purge the byte with the
//      typed-count confirm, and re-scan to prove the byte is gone while the broken-reference row is
//      untouched.
//
// The fixtures are DEDICATED, isolated from the four Library assets and the Pass B pair so this spec
// never perturbs their name-based assertions (PASS_C_UNREF / PASS_C_ORPHAN_BYTE / PASS_C_MISSING in
// fake-github.ts, with the orphan byte and the unreferenced asset's bytes seeded in fake-r2). The two
// tests run in order: bulk delete first (it removes the unreferenced row), then the orphan purge. The
// webServer runs one worker, so the order holds.

// Fixture facts, mirroring fake-github.ts.
const UNREF = { hash: 'dddd6666eeee7777', slug: 'pass-c-unused', name: 'Pass C unused' };
const USED = { hash: 'aa00bb11cc22dd33', slug: 'mountain-pass', name: 'Mountain pass' };
const ORPHAN_BYTE = { hash: 'eeee7777ffff8888', key: 'media/ee/eeee7777ffff8888.png' };
const MISSING = { hash: 'ffff8888aaaa9999', slug: 'pass-c-broken' };

const MEDIA_JSON_PATH = 'src/content/.cairn/media.json';

/** Read main's committed media.json through the fixture endpoint. */
async function readMainMedia(request: APIRequestContext) {
  const res = await request.get(
    `/test/branch-file?branch=main&path=${encodeURIComponent(MEDIA_JSON_PATH)}`,
  );
  expect(res.ok()).toBeTruthy();
  const { content } = (await res.json()) as { content: string };
  return JSON.parse(content) as Record<string, { slug: string; displayName: string }>;
}

test('bulk-delete round-trip: the unreferenced asset is deleted, the in-use one is skipped and survives', async ({
  page,
  request,
}) => {
  // Both rows start in main's media.json: the unreferenced one (deletable) and the in-use one (skip).
  const before = await readMainMedia(request);
  expect(before[UNREF.hash]).toBeTruthy();
  expect(before[USED.hash]).toBeTruthy();

  await page.goto('/admin/media');
  const grid = page.getByRole('listbox', { name: 'Media library' });
  await expect(grid).toBeVisible();

  // Select the unreferenced tile and the in-use tile by their per-tile select checkbox.
  await grid.getByRole('checkbox', { name: `Select ${UNREF.name}` }).check();
  await grid.getByRole('checkbox', { name: `Select ${USED.name}` }).check();

  // The sticky selection bar appears; its Delete button opens the skip-and-report alertdialog.
  const bar = page.getByRole('region', { name: 'Selection actions' });
  await expect(bar).toBeVisible();
  await bar.getByRole('button', { name: /^Delete 2/ }).click();

  const dialog = page.getByTestId('cairn-bulk-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('role', 'alertdialog');

  // The dry-run split: the unreferenced asset is named under the will-be-deleted bucket, and the
  // in-use asset is named under the "will be skipped, still in use" section.
  await expect(dialog.getByText(UNREF.name, { exact: true })).toBeVisible();
  await expect(dialog.getByText('will be skipped, still in use', { exact: false })).toBeVisible();
  await expect(dialog.getByText(USED.slug, { exact: true })).toBeVisible();

  // The apply button names the outcome (one deletable, one skipped) and is a plain confirm (no typed
  // gate). Apply.
  const apply = dialog.getByRole('button', { name: 'Delete 1, skip 1' });
  await expect(apply).toBeEnabled();
  await apply.click();

  // The itemized summary: one deleted, one skipped, with the skip reason naming the recheck.
  await expect(dialog.getByRole('heading', { name: /Done\. 1 deleted, 1 skipped/ })).toBeVisible();
  await expect(dialog.getByText(USED.name, { exact: true })).toBeVisible();
  await expect(dialog.getByText(/now found in 1 entry on the recheck/)).toBeVisible();

  // Main's media.json: the unreferenced row is gone, the in-use row remains. The commit is async, so
  // poll the committed read (the Pass B idiom).
  await expect(async () => {
    const media = await readMainMedia(request);
    expect(media[UNREF.hash]).toBeUndefined();
    expect(media[USED.hash]).toBeTruthy();
    expect(media[USED.hash].slug).toBe(USED.slug);
  }).toPass({ timeout: 15_000 });
});

test('orphan round-trip: the orphaned byte purges with the typed confirm, the broken reference is read-only and untouched', async ({
  page,
  request,
}) => {
  // The broken-reference row starts in main's media.json (its bytes were never seeded).
  const before = await readMainMedia(request);
  expect(before[MISSING.hash]).toBeTruthy();

  await page.goto('/admin/media');

  // Open the scan. It resolves to the two-section result (not the fail-closed blocked surface).
  await page.getByRole('button', { name: 'Find orphaned files' }).click();
  const dialog = page.getByTestId('cairn-orphan-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Orphaned files and broken references' })).toBeVisible();

  // The Orphaned files section lists the orphaned byte by its R2 key. Target it specifically rather
  // than asserting a total, since other specs may leave their own byte-rows behind.
  const orphanList = dialog.getByRole('listbox', { name: 'Orphaned files' });
  await expect(orphanList.getByText(ORPHAN_BYTE.key, { exact: true })).toBeVisible();

  // The read-only Broken references section lists the missing-bytes record by its slug, with no
  // checkbox and no purge control of its own.
  const broken = dialog.getByTestId('cairn-broken-refs');
  await expect(broken.getByText(MISSING.slug, { exact: true })).toBeVisible();
  await expect(broken.getByRole('checkbox')).toHaveCount(0);

  // Select the orphaned byte's checkbox, reach the section's solid-danger Purge, then the typed-count
  // confirm. Open the purge over the one selected key.
  await orphanList.getByRole('checkbox', { name: `Select ${ORPHAN_BYTE.key}` }).check();
  await dialog.getByRole('button', { name: /^Purge 1 file/ }).click();

  // The irreversible confirm: the Purge submit is gated until the typed count equals the selection.
  const confirm = dialog.getByRole('textbox', { name: 'Type the file count to confirm the purge' });
  const purge = dialog.getByRole('button', { name: 'Purge 1 file' });
  await expect(purge).toBeDisabled();
  await confirm.fill('1');
  await expect(purge).toBeEnabled();
  await purge.click();

  // The purge summary reports one file gone for good.
  await expect(dialog.getByRole('heading', { name: /Done\. 1 purged/ })).toBeVisible();
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(dialog).toBeHidden();

  // Re-scan: the orphaned byte is gone (its bytes were purged from R2), and the broken-reference row
  // is still listed (the purge is R2-only and read-only on broken refs).
  await page.getByRole('button', { name: 'Find orphaned files' }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Orphaned files and broken references' })).toBeVisible();
  await expect(dialog.getByText(ORPHAN_BYTE.key, { exact: true })).toHaveCount(0);
  const brokenAfter = dialog.getByTestId('cairn-broken-refs');
  await expect(brokenAfter.getByText(MISSING.slug, { exact: true })).toBeVisible();

  // The broken-reference record's media.json row is untouched: the purge never touches the manifest.
  const after = await readMainMedia(request);
  expect(after[MISSING.hash]).toBeTruthy();
});
