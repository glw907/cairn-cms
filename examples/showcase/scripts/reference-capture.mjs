// One-off driver for the 2026-08-15 writer-facing reference capture pass. Not part of the
// package or the e2e suite; deleted after the pass. Drives the real showcase preview server
// (VITE_CAIRN_E2E=1 build, CAIRN_DEV_BACKEND=1) with playwright-core, reusing the same
// selectors and dev-backend seed facts the e2e specs use.
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = 'http://localhost:4173';
const OUT = path.resolve(
  import.meta.dirname,
  '../../../docs/internal/reference-captures/2026-08-15-admin-screens',
);

const results = [];
const gaps = [];

function record(file, contract, state, width) {
  results.push({ file, contract, state, width });
  console.log(`OK  ${file}`);
}
function gap(state, why, fixture) {
  gaps.push({ state, why, fixture });
  console.log(`GAP ${state}: ${why}`);
}

async function newPage(browser, { width, height = 900, theme = 'light' }) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    baseURL: BASE,
  });
  const themeCookie = theme === 'dark' ? 'cairn-admin-dark' : 'cairn-admin';
  await context.addCookies([{ name: 'cairn-admin-theme', value: themeCookie, url: BASE }]);
  const page = await context.newPage();
  await page.emulateMedia({ colorScheme: theme });
  return { context, page };
}

async function shot(page, file, { fullPage = false } = {}) {
  await mkdir(OUT, { recursive: true });
  await page.screenshot({ path: path.join(OUT, file), fullPage });
}

/** DaisyUI's modal entrance runs a `@starting-style` transition, so a `<dialog>` can already
 *  read as "visible" to Playwright (open, non-zero box) a frame before it finishes painting.
 *  A short settle avoids catching that half-open frame. */
async function settle(page, ms = 500) {
  await page.waitForTimeout(ms);
}

/** Switch the editor's Write/Preview mode: a visible tab at sm (640px) and up, folded into the
 *  toolbar's "More formatting" overflow below it. */
async function switchMode(page, width, mode) {
  if (width >= 640) {
    await page.getByRole('tab', { name: mode }).click();
  } else {
    await page.getByRole('button', { name: 'More formatting' }).click();
    await page.getByRole('button', { name: mode, exact: true }).click();
  }
}

const PNG_A =
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAEklEQVR4nGM4UWHzHx9mGBkKANOnnsGxplPJAAAAAElFTkSuQmCC';
const PNG_B =
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAALElEQVR4AX3BAQ2AABADsZK8kJOKc3Cw9uH9QgghhHAynUwn08l0Mp1MJ9MP3/oDXdZ7DJMAAAAASUVORK5CYII=';
const PNG_C =
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAHElEQVR4nGPQmtv//2K+1X9cNAM+SRDNMCxMAAAgSZnBatc95QAAAABJRU5ErkJggg==';

/** Open the entry Details slide-over: a standalone header button at sm (640px) and up, folded
 *  into the "More actions" overflow below it. */
async function openDetails(page, width) {
  if (width >= 640) {
    await page.getByRole('button', { name: 'Details', exact: true }).click();
  } else {
    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('button', { name: 'Details', exact: true }).click();
  }
}

async function createPost(page, title, slug) {
  await page.goto('/admin/posts');
  await page.locator('header').getByRole('button', { name: 'New post' }).click();
  const createDialog = page.locator('dialog[aria-labelledby="cairn-create-dialog-title"]');
  await createDialog.waitFor({ state: 'visible' });
  await createDialog.locator('input[name="title"]').fill(title);
  await createDialog.locator('input[name="slug"]').fill(slug);
  await createDialog.getByRole('button', { name: 'Create' }).click();
  await page.waitForURL(/new=1/, { timeout: 10_000 });
  return new URL(page.url()).pathname.split('/').pop() ?? '';
}

async function main() {
  const browser = await chromium.launch();

  // ---- 1/2: welcome (sign-in, confirm) ----
  for (const width of [1440, 390]) {
    const { context, page } = await newPage(browser, { width });
    await page.goto('/admin/login');
    await page.getByRole('button', { name: 'Send sign-in link' }).waitFor();
    await shot(page, `welcome--sign-in--${width}.png`);
    record(`welcome--sign-in--${width}.png`, 'welcome.md step 1', 'the /admin/login form', width);
    await context.close();
  }
  for (const width of [1440, 390]) {
    const { context, page } = await newPage(browser, { width });
    await page.goto('/admin/auth/confirm?token=preview-token');
    await page.getByRole('button', { name: 'Confirm sign-in' }).waitFor();
    await shot(page, `welcome--confirm--${width}.png`);
    record(`welcome--confirm--${width}.png`, 'welcome.md step 3', 'the /admin/auth/confirm page (any token)', width);
    await context.close();
  }

  // ---- 3: write-in-the-editor entry screen (+ dark) ----
  for (const width of [1440, 390]) {
    const { context, page } = await newPage(browser, { width });
    await page.goto('/admin/posts/2026-06-hello');
    await page.locator('.cm-content').waitFor({ state: 'visible', timeout: 10_000 });
    await shot(page, `write-in-the-editor--entry-screen--${width}.png`);
    record(`write-in-the-editor--entry-screen--${width}.png`, 'write-in-the-editor.md "## The screen"', 'the seeded post open on Write', width);
    await context.close();
  }
  {
    const { context, page } = await newPage(browser, { width: 1440, theme: 'dark' });
    await page.goto('/admin/posts/2026-06-hello');
    await page.locator('.cm-content').waitFor({ state: 'visible', timeout: 10_000 });
    await shot(page, 'write-in-the-editor--entry-screen--1440--dark.png');
    record('write-in-the-editor--entry-screen--1440--dark.png', 'write-in-the-editor.md "## The screen" (dark)', 'the seeded post open on Write, dark theme', 1440);
    await context.close();
  }

  // ---- 4: sidebar + list view ----
  for (const width of [1440, 390]) {
    const { context, page } = await newPage(browser, { width });
    await page.goto('/admin/posts');
    await page.locator('header').getByRole('button', { name: 'New post' }).waitFor();
    await shot(page, `write-in-the-editor--sidebar-list--${width}.png`);
    record(`write-in-the-editor--sidebar-list--${width}.png`, 'write-in-the-editor.md "## Opening or starting a draft"', 'the Posts list, office view', width);
    await context.close();
  }

  // ---- 5: preview tab + width control ----
  for (const width of [1440, 390]) {
    const { context, page } = await newPage(browser, { width });
    await page.goto('/admin/posts/2026-06-hello');
    await page.locator('.cm-content').waitFor({ state: 'visible', timeout: 10_000 });
    await switchMode(page, width, 'Preview');
    await page.locator('#cairn-pane-preview').waitFor({ state: 'visible', timeout: 5000 });
    // The preview frame posts its render async; wait for real body text rather than the pane's
    // own visibility, which flips true before the iframe has anything to show.
    const previewFrame = page.frameLocator('#cairn-pane-preview iframe[title="Page preview"]');
    await previewFrame.locator('body').getByText('The original body.').waitFor({ timeout: 10_000 });
    await shot(page, `write-in-the-editor--preview-width--${width}.png`);
    record(`write-in-the-editor--preview-width--${width}.png`, 'write-in-the-editor.md preview width control', 'Preview tab active, width menu visible', width);
    await context.close();
  }

  // ---- 6: details panel ----
  for (const width of [1440, 390]) {
    const { context, page } = await newPage(browser, { width, height: 1300 });
    await page.goto('/admin/posts/2026-06-hello');
    await openDetails(page, width);
    await page.getByRole('region', { name: 'Entry details' }).waitFor({ timeout: 5000 });
    await shot(page, `write-in-the-editor--details-panel--${width}.png`, { fullPage: true });
    record(`write-in-the-editor--details-panel--${width}.png`, 'write-in-the-editor.md "## The details panel"', 'Details slide-over open on the seeded post', width);
    await context.close();
  }

  // ---- 7: figure dialog ----
  for (const [width, png, name] of [[1440, PNG_A, 'shore.png'], [390, PNG_B, 'shore2.png']]) {
    const { context, page } = await newPage(browser, { width, height: 1100 });
    const id = await createPost(page, 'Figure Capture', `figure-capture-${width}-${Date.now()}`);
    await page.getByRole('button', { name: 'Insert image' }).click();
    const popover = page.getByRole('dialog', { name: 'Insert image' });
    await popover.waitFor({ state: 'visible' });
    await popover.getByRole('button', { name: 'Upload an image' }).click();
    await popover.locator('input[type="file"]').setInputFiles({
      name,
      mimeType: 'image/png',
      buffer: Buffer.from(png, 'base64'),
    });
    await popover.getByText('Write a description').click();
    await popover.getByLabel('Alt text description').fill('A quiet shore');
    await popover.getByRole('button', { name: 'Insert image' }).click();
    const chip = page.locator('.cm-cairn-media-chip');
    await chip.waitFor({ state: 'visible', timeout: 15_000 });
    // A content-hash dedup reuse (the same fixture bytes as another capture) keeps the popover
    // open with a "reused" note; its backdrop then intercepts the chip click. Dismiss it through
    // the light-dismiss backdrop when present, mirroring media-figure.spec.ts.
    const backdrop = page.locator('.cairn-media-popover-backdrop');
    if (await backdrop.isVisible().catch(() => false)) {
      await backdrop.click();
    }
    await popover.waitFor({ state: 'hidden' }).catch(() => {});
    await chip.click();
    const wrapButton = page.getByRole('button', { name: 'Wrap the image at the cursor in a figure' });
    await wrapButton.waitFor({ state: 'visible', timeout: 10_000 });
    await wrapButton.click();
    const figureDialog = page.getByRole('dialog', { name: 'Wrap in a figure' });
    await figureDialog.waitFor({ state: 'visible' });
    await figureDialog.getByLabel('Caption').fill('A quiet shore at dusk.');
    await settle(page);
    await shot(page, `write-in-the-editor--figure-dialog--${width}.png`);
    record(`write-in-the-editor--figure-dialog--${width}.png`, 'write-in-the-editor.md "## Images"', `figure dialog open on entry ${id}, caption filled`, width);
    await context.close();
  }

  // ---- 8: tidy review ----
  for (const width of [1440, 390]) {
    const { context, page } = await newPage(browser, { width, height: 1100 });
    await page.goto('/admin/posts/2026-06-copyedit');
    await page.locator('.cm-content').waitFor({ state: 'visible', timeout: 10_000 });
    try {
      await page.getByRole('button', { name: 'Tidy', exact: true }).click();
      const review = page.getByTestId('tidy-review');
      await review.getByText('Review tidy').waitFor({ state: 'visible', timeout: 15_000 });
      await settle(page);
      await shot(page, `write-in-the-editor--tidy-review--${width}.png`);
      record(`write-in-the-editor--tidy-review--${width}.png`, 'write-in-the-editor.md "## Spelling and style"', 'a live tidy review over the seeded copyedit post', width);
    } catch (e) {
      gap('write-in-the-editor--tidy-review', `Tidy did not open a review in time: ${e.message.split('\n')[0]}`, 'a reachable Anthropic client (real or stubbed) plus tidy.enabled in site.config.yaml');
    }
    await context.close();
  }

  // ---- 9: collapsed layout block, showing its margin (gutter) control ----
  for (const width of [1440, 390]) {
    const { context, page } = await newPage(browser, { width, height: 900 });
    const id = await createPost(page, 'Fold Capture', `fold-capture-${width}-${Date.now()}`);
    const editor = page.locator('.cm-content');
    await editor.click();
    await page.keyboard.type('Intro line.\n\n:::note\nHidden detail one.\nHidden detail two.\n:::');
    await page.locator('input[name="body"]').waitFor({ state: 'attached' });
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForURL(/saved=1/, { timeout: 10_000 });
    await page.goto(`/admin/posts/${id}`);
    await editor.waitFor({ state: 'visible', timeout: 10_000 });
    const pill = editor.locator('.cm-cairn-fold-pill');
    await pill.waitFor({ state: 'visible', timeout: 10_000 });
    await shot(page, `write-in-the-editor--collapsed-block--${width}.png`);
    record(`write-in-the-editor--collapsed-block--${width}.png`, 'write-in-the-editor.md collapsed-block paragraph', `entry ${id}, fold-on-open with the gutter fold control visible`, width);
    await context.close();
  }

  // ---- 10: header band, overflow menu open (History, Discard changes, Delete). 1440 only. ----
  {
    const width = 1440;
    const { context, page } = await newPage(browser, { width });
    const id = await createPost(page, 'Band Capture', `band-capture-${Date.now()}`);
    const editor = page.locator('.cm-content');
    await editor.click();
    await page.keyboard.type('A body so this entry has a pending draft.');
    await page.locator('input[name="body"]').waitFor({ state: 'attached' });
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForURL(/saved=1/, { timeout: 10_000 });
    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('link', { name: 'History' }).waitFor({ state: 'visible', timeout: 5000 });
    await settle(page, 300);
    await shot(page, `publish-and-history--header-band--${width}.png`);
    record(`publish-and-history--header-band--${width}.png`, 'publish-and-history.md header band', `entry ${id} (pending), overflow menu open`, width);
    await context.close();
  }

  // ---- 11: phone bottom-fixed bar. 390 only. ----
  {
    const width = 390;
    const { context, page } = await newPage(browser, { width });
    await page.goto('/admin/posts/2026-06-hello');
    await page.locator('.cm-content').waitFor({ state: 'visible', timeout: 10_000 });
    await shot(page, `publish-and-history--bottom-bar--${width}.png`);
    record(`publish-and-history--bottom-bar--${width}.png`, 'publish-and-history.md header band (phone)', 'the seeded post, phone bottom-fixed Save/Publish bar', width);
    await context.close();
  }

  // ---- 12: history list (posed with two real publishes and a trailing unpublished draft) ----
  {
    const width = 1440;
    const { context, page } = await newPage(browser, { width, height: 1100 });
    const id = await createPost(page, 'History Capture', `history-capture-${Date.now()}`);
    const editor = page.locator('.cm-content');
    const body = page.locator('input[name="body"]');
    await editor.click();
    await page.keyboard.type('Version one.');
    await body.waitFor({ state: 'attached' });
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForURL(/saved=1/, { timeout: 10_000 });
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await page.waitForURL(/published=1/, { timeout: 10_000 });

    await editor.click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type('Version two.');
    await body.waitFor({ state: 'attached' });
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForURL(/saved=1/, { timeout: 10_000 });
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await page.waitForURL(/published=1/, { timeout: 10_000 });

    await editor.click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type('A pending third version, never published.');
    await body.waitFor({ state: 'attached' });
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForURL(/saved=1/, { timeout: 10_000 });

    await page.goto(`/admin/posts/${id}/history`);
    await page.getByRole('heading', { name: 'Recent versions' }).waitFor({ timeout: 5000 });
    await shot(page, `publish-and-history--history-list--${width}.png`, { fullPage: true });
    record(`publish-and-history--history-list--${width}.png`, 'publish-and-history.md "## History"', `entry ${id}: two real publishes plus a trailing unpublished draft`, width);
    await context.close();
  }

  // ---- 13: the Publish site pending list (button + count, grouped pending entries, no entry open) ----
  {
    const width = 1440;
    const { context, page } = await newPage(browser, { width, height: 900 });
    await createPost(page, 'Pending Capture', `pending-capture-${Date.now()}`);
    const editor = page.locator('.cm-content');
    await editor.click();
    await page.keyboard.type('A saved, unpublished body.');
    await page.locator('input[name="body"]').waitFor({ state: 'attached' });
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForURL(/saved=1/, { timeout: 10_000 });
    await page.goto('/admin/posts');
    const publishSiteButton = page.getByRole('button', { name: /^Publish site/ });
    await publishSiteButton.waitFor({ timeout: 10_000 });
    await publishSiteButton.click();
    await page.getByText('Publish the whole site?').waitFor({ timeout: 5000 });
    await settle(page, 300);
    await shot(page, `publish-and-history--pending-list--${width}.png`);
    record(`publish-and-history--pending-list--${width}.png`, 'publish-and-history.md "## Publishing everything at once"', 'office view, Publish site dialog open over the grouped pending entries', width);
    await context.close();
  }

  // ---- 14: a real refusal banner (a rename refused for carrying a date in the address) ----
  for (const [width, state] of [
    [1440, 'a real rename refusal ("Leave the date out of the address.") reached by renaming the seed post onto a date-prefixed slug'],
    [390, 'the same refusal at phone width'],
  ]) {
    const { context, page } = await newPage(browser, { width });
    await page.goto('/admin/posts/2026-06-hello');
    await openDetails(page, width);
    await page.getByRole('button', { name: 'Change URL' }).click();
    const renameDialog = page.locator('dialog[aria-labelledby="cairn-rename-dialog-title"]');
    await renameDialog.waitFor({ state: 'visible' });
    await renameDialog.locator('input[name="slug"]').fill('2026-06-hello-again');
    await renameDialog.getByRole('button', { name: 'Change URL', exact: true }).click();
    await page.locator('.alert-error', { hasText: 'Leave the date out of the address.' }).waitFor({ timeout: 10_000 });
    await shot(page, `when-something-goes-wrong--refusal-banner--${width}.png`);
    record(`when-something-goes-wrong--refusal-banner--${width}.png`, 'when-something-goes-wrong.md', state, width);
    await context.close();
  }

  // ---- 15/16: add-an-image insert panel + upload form ----
  for (const [width, png, name] of [[1440, PNG_C, 'insert-panel.png'], [390, PNG_A, 'insert-panel2.png']]) {
    const { context, page } = await newPage(browser, { width, height: 900 });
    await createPost(page, 'Insert Panel Capture', `insert-panel-capture-${width}-${Date.now()}`);
    await page.getByRole('button', { name: 'Insert image' }).click();
    const popover = page.getByRole('dialog', { name: 'Insert image' });
    await popover.waitFor({ state: 'visible' });
    await settle(page, 300);
    await shot(page, `add-an-image--insert-panel--${width}.png`);
    record(`add-an-image--insert-panel--${width}.png`, 'add-an-image.md "## Inserting an image"', 'the Insert image popover, chooser view (upload + reuse search)', width);

    await popover.getByRole('button', { name: 'Upload an image' }).click();
    await popover.locator('input[type="file"]').setInputFiles({
      name,
      mimeType: 'image/png',
      buffer: Buffer.from(png, 'base64'),
    });
    await popover.getByText('Write a description').waitFor({ timeout: 10_000 });
    await settle(page, 300);
    await shot(page, `add-an-image--upload-form--${width}.png`);
    record(`add-an-image--upload-form--${width}.png`, 'add-an-image.md "## Naming it, and adding alt text"', 'the capture card: the Name field with its Suggested mark, the alt-or-decorative choice', width);
    await context.close();
  }

  // ---- 17: the lead-picture (hero) dialog with its social-crop preview ----
  for (const [width, png, name] of [[1440, PNG_B, 'hero1.png'], [390, PNG_C, 'hero2.png']]) {
    const { context, page } = await newPage(browser, { width, height: 1000 });
    await createPost(page, 'Hero Capture', `hero-capture-${width}-${Date.now()}`);
    await openDetails(page, width);
    const details = page.getByRole('region', { name: 'Entry details' });
    await details.getByRole('button', { name: 'Add hero image' }).click();
    const dialog = page.locator('dialog[aria-labelledby^="cairn-hero-title"]');
    await dialog.waitFor({ state: 'visible' });
    await dialog.locator('input[type="file"]').setInputFiles({
      name,
      mimeType: 'image/png',
      buffer: Buffer.from(png, 'base64'),
    });
    await dialog.getByText('Describe it').waitFor({ timeout: 15_000 });
    await settle(page, 300);
    await shot(page, `add-an-image--lead-picture-dialog--${width}.png`);
    record(`add-an-image--lead-picture-dialog--${width}.png`, 'add-an-image.md "## The lead picture"', 'the hero field dialog, placement view with the social-crop preview', width);
    await context.close();
  }

  // ---- 18: media library screen (+ dark at 1440) ----
  for (const width of [1440, 390]) {
    const { context, page } = await newPage(browser, { width });
    await page.goto('/admin/media');
    await page.getByRole('heading', { name: 'Media library' }).waitFor({ timeout: 10_000 });
    await shot(page, `manage-the-media-library--library-screen--${width}.png`, { fullPage: true });
    record(`manage-the-media-library--library-screen--${width}.png`, 'manage-the-media-library.md "## The library"', 'the seeded media library, grid view', width);
    await context.close();
  }
  {
    const { context, page } = await newPage(browser, { width: 1440, theme: 'dark' });
    await page.goto('/admin/media');
    await page.getByRole('heading', { name: 'Media library' }).waitFor({ timeout: 10_000 });
    await shot(page, 'manage-the-media-library--library-screen--1440--dark.png', { fullPage: true });
    record('manage-the-media-library--library-screen--1440--dark.png', 'manage-the-media-library.md "## The library" (dark)', 'the seeded media library, grid view, dark theme', 1440);
    await context.close();
  }

  // ---- 19: media details panel ----
  {
    const width = 1440;
    const { context, page } = await newPage(browser, { width, height: 1100 });
    await page.goto('/admin/media');
    const grid = page.getByRole('listbox', { name: 'Media library' });
    await grid.waitFor({ timeout: 10_000 });
    await grid.getByText('Mountain pass', { exact: true }).click();
    await page.getByRole('region', { name: 'Mountain pass details' }).waitFor({ timeout: 5000 });
    await settle(page, 300);
    await shot(page, `manage-the-media-library--details-panel--${width}.png`, { fullPage: true });
    record(`manage-the-media-library--details-panel--${width}.png`, 'manage-the-media-library.md "## Selecting an image"', 'the used seeded asset (Mountain pass) detail slide-over', width);
    await context.close();
  }

  // ---- 20: bulk selection in grid view ----
  {
    const width = 1440;
    const { context, page } = await newPage(browser, { width, height: 900 });
    await page.goto('/admin/media');
    const grid = page.getByRole('listbox', { name: 'Media library' });
    await grid.waitFor({ timeout: 10_000 });
    await grid.getByRole('checkbox', { name: 'Select Mountain pass' }).check();
    await grid.getByRole('checkbox', { name: 'Select Sunset orphan' }).check();
    await page.getByRole('region', { name: 'Selection actions' }).waitFor({ timeout: 5000 });
    await settle(page, 300);
    await shot(page, `manage-the-media-library--bulk-selection--${width}.png`);
    record(`manage-the-media-library--bulk-selection--${width}.png`, 'manage-the-media-library.md "## Selecting several at once"', 'two thumbnails checked, the sticky selection bar (count, Select all, Delete)', width);
    await context.close();
  }

  // ---- 21: the delete-in-use confirmation ----
  {
    const width = 1440;
    const { context, page } = await newPage(browser, { width, height: 900 });
    await page.goto('/admin/media');
    const grid = page.getByRole('listbox', { name: 'Media library' });
    await grid.waitFor({ timeout: 10_000 });
    await grid.getByText('Mountain pass', { exact: true }).click();
    const panel = page.getByRole('region', { name: 'Mountain pass details' });
    await panel.waitFor({ timeout: 5000 });
    await panel.getByRole('button', { name: 'Delete' }).click();
    const dialog = page.getByRole('alertdialog');
    await dialog.getByText('These would break').waitFor({ timeout: 5000 });
    await settle(page, 300);
    await shot(page, `manage-the-media-library--delete-in-use--${width}.png`);
    record(`manage-the-media-library--delete-in-use--${width}.png`, 'manage-the-media-library.md "## Deleting an image"', 'the in-use delete confirmation for Mountain pass: the what-would-break list, the typed-address confirm', width);
    await context.close();
  }

  // ---- 22: the full Tags screen ----
  for (const width of [1440, 390]) {
    const { context, page } = await newPage(browser, { width });
    await page.goto('/admin/vocabulary');
    await page.getByRole('heading', { name: 'Tags', level: 1 }).waitFor({ timeout: 10_000 });
    await shot(page, `manage-your-tag-vocabulary--tags-screen--${width}.png`, { fullPage: true });
    record(`manage-your-tag-vocabulary--tags-screen--${width}.png`, 'manage-your-tag-vocabulary.md', 'the full Tags screen, seeded vocabulary (listed, in-use, and unlisted-candidate tags)', width);
    await context.close();
  }

  // ---- 23: the editors roster ----
  for (const width of [1440, 390]) {
    const { context, page } = await newPage(browser, { width });
    await page.goto('/admin/editors');
    await page.getByRole('heading', { level: 1, name: 'Editors' }).waitFor({ timeout: 10_000 });
    await shot(page, `invite-editors--roster--${width}.png`, { fullPage: true });
    record(`invite-editors--roster--${width}.png`, 'invite-editors.md', 'the Editors roster: the add form, the seeded rows, the signed-in owner row with disabled self-controls', width);
    await context.close();
  }

  // ---- 24: the showcase's own custom admin screen (Signups), the worked exemplar ----
  {
    const width = 1440;
    const { context, page } = await newPage(browser, { width });
    await page.goto('/admin/signups');
    await page.getByRole('heading', { name: 'Signups' }).waitFor({ timeout: 10_000 });
    await page.fill('input[name="name"]', 'Ada Reference');
    await page.fill('input[name="email"]', 'ada@example.test');
    await page.getByRole('button', { name: 'Add' }).click();
    await page.getByRole('cell', { name: 'Ada Reference' }).waitFor({ timeout: 5000 });
    await shot(page, `add-a-custom-admin-screen--signups--${width}.png`, { fullPage: true });
    record(`add-a-custom-admin-screen--signups--${width}.png`, 'add-a-custom-admin-screen.md', 'the showcase’s own /admin/signups screen, a custom screen inside CairnAdminShell, with one posed row', width);
    await context.close();
  }

  // ---- 25: the admin sidebar as rendered (the showcase's declared navLayout) ----
  {
    const width = 1440;
    const { context, page } = await newPage(browser, { width });
    await page.goto('/admin/posts');
    await page.getByRole('navigation', { name: 'Site content' }).waitFor({ timeout: 10_000 });
    await shot(page, `organize-your-admin-nav--sidebar--${width}.png`);
    record(`organize-your-admin-nav--sidebar--${width}.png`, 'organize-your-admin-nav.md', 'the persistent sidebar; the showcase DECLARES a navLayout (cairn.config.ts editor block: Content/Site sections, a relabel, a fallback foot), not the engine default', width);
    await context.close();
  }
  {
    const width = 390;
    const { context, page } = await newPage(browser, { width });
    await page.goto('/admin/posts');
    await page.locator('label[for="cairn-shell-drawer"][aria-label="Open menu"]').click();
    await page.locator('.drawer-side').waitFor({ state: 'visible', timeout: 10_000 });
    await settle(page, 300);
    await shot(page, `organize-your-admin-nav--sidebar--${width}.png`);
    record(`organize-your-admin-nav--sidebar--${width}.png`, 'organize-your-admin-nav.md', 'the sidebar drawer opened at phone width via the hamburger; same declared navLayout', width);
    await context.close();
  }

  await writeFile(path.join(OUT, '.capture-state.json'), JSON.stringify({ results, gaps }, null, 2));
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
