import { test, expect } from '@playwright/test';

// The media Phase 3a inline figure, end to end against the running showcase. It builds on the 2b
// insert flow (open the popover, upload, alt, Insert), then drives the figure control: wrap the
// inserted image in a `:::figure{.wide}` with a caption distinct from the alt, confirm the source
// transform left the atomic media token byte-intact, render the figure in the preview iframe, and
// save. The fake R2 double on platform.env (hooks.server.ts) and the fake-github recorder back the
// upload, the preview resolve, and the commit, the same harness media-insert.spec.ts uses.
//
// Deviation from the plan's "use the seeded post" note: the fake-github recorder is module-level
// singleton state shared across specs on the one worker, and a save persists the entry's pending
// branch for the rest of the run. Wrapping the seed post's inserted image in a figure and saving
// would leave a committed image chip on the seed branch, which media-insert.spec.ts then loads,
// breaking its single-chip assertion. This spec creates its own post (golden-path's self-contained
// pattern) so it never pollutes the seed branch, keeping media-insert untouched and green.

// A real, decodable 8x8 RGBA PNG. The client ingestFile runs createImageBitmap in the browser, so
// the bytes must decode; a 1x1 PNG fails in this headless Chromium build, an 8x8 decodes cleanly.
// These bytes are DISTINCT from media-insert/media-slice's "seaside" PNG (a gradient, not a solid
// fill), so they hash to a different content-addressed key. The 2a upload action dedups by content
// hash and a reuse keeps the popover open (the "reused an existing image" path); uploading the same
// bytes the other specs use would turn their fresh upload into a reuse and break their popover-close
// flow on the shared single-worker backend. A distinct image keeps this spec independent.
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAALElEQVR4AX3BAQ2AABADsZK8kJOKc3Cw9uH9QgghhHAynUwn08l0Mp1MJ9MP3/oDXdZ7DJMAAAAASUVORK5CYII=';
const PNG_BUFFER = Buffer.from(PNG_BASE64, 'base64');

// The alt and the caption are deliberately distinct so the figure block proves they ride separate
// fields: the alt rides the inner `![alt](media:ref)` token, the caption is the figure body line.
const ALT = 'A quiet shore';
const CAPTION = 'A quiet shore at dusk.';

test('the figure flow: wrap an inserted image in a wide figure, render the figcaption in the preview, and commit the figure block', async ({
  page,
  request,
}) => {
  // A unique slug per run (the fake repo lives in the server process, and a local run may reuse the
  // server), and a fresh entry so this spec never touches the shared seed branch.
  const slug = `figure-post-${Date.now()}`;
  await page.goto('/admin/posts');
  await page.locator('header').getByRole('button', { name: 'New Posts' }).click();
  const createDialog = page.locator('dialog[aria-labelledby="cairn-create-dialog-title"]');
  await expect(createDialog).toBeVisible();
  await createDialog.locator('input[name="title"]').fill('Figure Post');
  await createDialog.locator('input[name="slug"]').fill(slug);
  await createDialog.getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/new=1/, { timeout: 10_000 });
  const id = new URL(page.url()).pathname.split('/').pop() ?? '';
  expect(id).toContain(slug);
  await page.locator('input[name="title"]').fill('Figure Post');

  // 1. The 2b insert flow, mirrored from media-insert.spec.ts: open the popover, upload the PNG,
  //    write the alt, Insert. The optimistic placeholder resolves to a committed media: reference.
  await page.getByRole('button', { name: 'Insert image' }).click();
  const popover = page.getByRole('dialog', { name: 'Insert image' });
  await expect(popover).toBeVisible();

  await popover.getByRole('button', { name: 'Upload an image' }).click();
  // Scope the file input to the popover: the hero field (3b) also renders a hidden file input in its
  // always-mounted dialog, so a page-wide `input[type="file"]` now matches two elements.
  await popover
    .locator('input[type="file"]')
    .setInputFiles({ name: 'harbor.png', mimeType: 'image/png', buffer: PNG_BUFFER });
  await expect(popover.locator('input').first()).toHaveValue('harbor');

  await popover.getByText('Write a description').click();
  await popover.getByLabel('Alt text description').fill(ALT);
  await popover.getByRole('button', { name: 'Insert image' }).click();

  // The source chip appears once the placeholder resolves to the committed reference.
  const chip = page.locator('.cm-cairn-media-chip');
  await expect(chip).toBeVisible({ timeout: 15_000 });
  await expect(chip).toContainText('harbor');

  // Make sure the popover is closed before reaching for the chip. A fresh upload closes the popover
  // on success, but a content-hash dedup reuse keeps it open with a "reused" note (the 2b decision),
  // and a rerun against a warm fake R2 (reuseExistingServer, or --repeat-each) takes that reuse path.
  // Its backdrop would intercept the chip click. Dismiss it through the light-dismiss backdrop when it
  // is still open; a fresh run finds it already gone.
  const backdrop = page.locator('.cairn-media-popover-backdrop');
  if (await backdrop.isVisible()) {
    await backdrop.click();
  }
  await expect(popover).toBeHidden();

  // Read the committed reference from the editor's hidden body field (the canonical source text; the
  // visible CodeMirror DOM shows the chip widget, not the hex). Capture the hash to assert byte
  // identity after the figure wrap and to match the delivery path in the preview.
  const bodyBefore = await page.locator('input[name="body"]').inputValue();
  const refMatch = bodyBefore.match(/media:harbor\.[0-9a-f]{16}/);
  expect(refMatch, 'the editor source carries a committed media: reference').not.toBeNull();
  const reference = refMatch![0];
  const hash = reference.split('.')[1];

  // 2. Put the caret on the inserted image so the Figure control enables. The chip is an atomic
  //    widget over the media: token (ignoreEvent is false), so a click lands the caret inside the
  //    `![alt](media:ref)` image token, which figureAtImage detects. The toolbar Figure button uses
  //    aria-disabled (not the native disabled attribute) and renames itself by state, so its enabled
  //    "Wrap the image at the cursor in a figure" label appears only once the caret sits on a bare
  //    image. Wait for that named button rather than a disabled-attribute toggle.
  await chip.click();
  const wrapButton = page.getByRole('button', {
    name: 'Wrap the image at the cursor in a figure',
  });
  await expect(wrapButton).toBeVisible({ timeout: 10_000 });
  await wrapButton.click();

  // 3. The figure dialog opens. Fill a caption distinct from the alt, pick the Wide placement, and
  //    wrap.
  const figureDialog = page.getByRole('dialog', { name: 'Wrap in a figure' });
  await expect(figureDialog).toBeVisible();
  await figureDialog.getByLabel('Caption').fill(CAPTION);
  await figureDialog.getByRole('radio', { name: 'Wide' }).click();
  await figureDialog.getByRole('button', { name: 'Wrap in figure' }).click();

  // 4. The source now carries the figure block. The transform must leave the atomic media token
  //    byte-intact (the same reference), wrap it in `:::figure{.wide}`, and write the caption as the
  //    body line. Assert the order: opener, then the image reference, then the caption, then the
  //    fence close.
  const figureOrder = new RegExp(
    `:::figure\\{\\.wide\\}[\\s\\S]*${reference.replace('.', '\\.')}[\\s\\S]*${CAPTION.replace(
      '.',
      '\\.',
    )}[\\s\\S]*:::`,
  );
  await expect(async () => {
    const body = await page.locator('input[name="body"]').inputValue();
    expect(body).toContain(':::figure{.wide}');
    expect(body).toContain(reference);
    expect(body).toContain(CAPTION);
    expect(body).toMatch(figureOrder);
  }).toPass({ timeout: 10_000 });

  // 5. Switch to Preview and assert the rendered figure inside the iframe: the placement class
  //    (remarkFigure stamped it), the resolved child img (the resolver ran over the figure's image),
  //    and the figcaption text (the caption rendered, distinct from the alt).
  await page.getByRole('tab', { name: 'Preview' }).click();
  const preview = page.frameLocator('iframe[title="Page preview"]');
  const figure = preview.locator('figure.cairn-place-wide');
  await expect(figure).toBeVisible({ timeout: 15_000 });
  await expect(figure.locator('img')).toHaveAttribute('src', `/media/harbor.${hash}.png`, {
    timeout: 15_000,
  });
  await expect(figure.locator('figcaption')).toHaveText(CAPTION);

  // 6. Save. The Save control submits the edit form, committing the body (with the figure block) and
  //    media.json.
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  // The fake-github double records the .md commit on the entry's pending branch, carrying the figure
  // block and the reference.
  await expect(async () => {
    const commit = await (await request.get('/test/last-commit')).json();
    expect(commit.branch).toBe(`cairn/posts/${id}`);
    expect(commit.path).toBe(`src/content/posts/${id}.md`);
    expect(commit.content).toContain(':::figure{.wide}');
    expect(commit.content).toContain(reference);
  }).toPass({ timeout: 15_000 });

  // The media.json committed in the same commit still carries the uploaded row keyed by its hash: the
  // figure wrap is a pure source transform and does not touch the manifest merge.
  const mediaFile = await request.get(
    `/test/branch-file?branch=${encodeURIComponent(`cairn/posts/${id}`)}&path=${encodeURIComponent('src/content/.cairn/media.json')}`,
  );
  expect(mediaFile.ok()).toBeTruthy();
  const { content } = (await mediaFile.json()) as { content: string };
  const manifest = JSON.parse(content) as Record<string, { slug: string; ext: string }>;
  expect(manifest[hash]).toBeTruthy();
  expect(manifest[hash].slug).toBe('harbor');
  expect(manifest[hash].ext).toBe('png');
});
