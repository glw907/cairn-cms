import { test, expect } from '@playwright/test';

// The media Phase 3b frontmatter hero, end to end against the running showcase behind the fake
// backend (the fake R2 double on platform.env and the fake-github recorder, the same harness
// media-insert/media-figure use). Two parts:
//
// Part A drives the editor's hero field interactively in a fresh, self-contained post: open the
// Details slide-over, add a hero through the field's dialog (upload a real PNG, describe it, caption
// it, Use this image), assert the three hidden inputs carry the structured value, then Save and
// assert the fake-github commit carries the nested `image:` frontmatter and the same-commit
// media.json carries the uploaded row.
//
// Part B reads the seeded hello post's public page: its frontmatter `image` was migrated to a
// structured hero backed by a seeded media.json row, so the read path resolves it into heroImage.
// The template renders the hero <img> and <figcaption>, and the head carries the resolved og:image.
//
// The fresh-post isolation mirrors media-figure's note: a save persists the entry's pending branch
// on the one-worker shared backend, so this spec creates its own post and never touches the seed
// branch media-insert depends on.

// A real, decodable 8x8 RGBA PNG with bytes DISTINCT from media-insert ("seaside") and media-figure
// ("harbor"), so the content hash does not collide on the shared single-worker backend (a dedup
// reuse would change another spec's fresh-upload flow). A solid checker fill, generated to hash to a
// different content-addressed key.
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAHElEQVR4nGPQmtv//2K+1X9cNAM+SRDNMCxMAAAgSZnBatc95QAAAABJRU5ErkJggg==';
const PNG_BUFFER = Buffer.from(PNG_BASE64, 'base64');

// The alt and the caption are deliberately distinct so the structured value proves they ride
// separate sub-fields: the alt is the screen-reader description, the caption is the shown line.
const ALT = 'A lone summit cairn under a clear sky';
const CAPTION = 'The high camp marker.';

// The seeded hello post's migrated hero, asserted on its public page (Part B). The hash and the
// media.json row are fixtures in the repo, so these are stable literals.
const SEED_HERO_URL = '/media/hello-hero.00112233445566aa.png';
const SEED_HERO_ALT = 'A cairn of stacked stones on a misty ridge';
const SEED_HERO_CAPTION = 'A waymark on the route.';

test('Part A: set a hero through the field, the hidden inputs carry the structured value, and Save commits the nested frontmatter plus media.json', async ({
  page,
  request,
}) => {
  // A unique slug per run, and a fresh entry so this spec never touches the shared seed branch.
  const slug = `hero-post-${Date.now()}`;
  await page.goto('/admin/posts');
  await page.locator('header').getByRole('button', { name: 'New Posts' }).click();
  const createDialog = page.locator('dialog[aria-labelledby="cairn-create-dialog-title"]');
  await expect(createDialog).toBeVisible();
  await createDialog.locator('input[name="title"]').fill('Hero Post');
  await createDialog.locator('input[name="slug"]').fill(slug);
  await createDialog.getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/new=1/, { timeout: 10_000 });
  const id = new URL(page.url()).pathname.split('/').pop() ?? '';
  expect(id).toContain(slug);
  await page.locator('input[name="title"]').fill('Hero Post');

  // 1. Open the Details slide-over: the hero field lives in the details field stack. The band's
  //    Details trigger toggles the panel (aria-label "Details").
  await page.getByRole('button', { name: 'Details', exact: true }).click();
  const details = page.getByRole('region', { name: 'Entry details' });
  await expect(details).toBeVisible();

  // 2. The hero field's empty state is a dropzone button whose label derives from the field label
  //    ("Add hero image"). Activate it to open the field dialog. The dialog's accessible name tracks
  //    its current view ("Add hero image" in the chooser, "Hero image" in the placement view), so
  //    locate it by its stable labelledby id prefix rather than a name that changes mid-flow.
  await details.getByRole('button', { name: 'Add hero image' }).click();
  const dialog = page.locator('dialog[aria-labelledby^="cairn-hero-title"]');
  await expect(dialog).toBeVisible();
  // Upload a real PNG through the chooser's file input (set the bytes directly, as media-insert does).
  await dialog
    .locator('input[type="file"]')
    .setInputFiles({ name: 'summit.png', mimeType: 'image/png', buffer: PNG_BUFFER });

  // 3. The upload runs (ingest, store, swap), then the dialog lands on the placement view with the
  //    16:9 preview and the alt radiogroup. Choose "Describe it", fill the alt, and fill the caption.
  await expect(dialog.getByText('Describe it')).toBeVisible({ timeout: 15_000 });
  await dialog.getByText('Describe it').click();
  await dialog.getByLabel('Alt text description').fill(ALT);
  await dialog.getByLabel('Caption').fill(CAPTION);

  // 4. Confirm. "Use this image" copies the working state into the field's three hidden inputs and
  //    closes the dialog.
  await dialog.getByRole('button', { name: 'Use this image' }).click();
  await expect(dialog).toBeHidden();

  // 5. The three hidden inputs carry the structured value: src is a committed media: reference, and
  //    the alt and caption are the strings just written.
  const srcInput = page.locator('input[name="image.src"]');
  await expect(srcInput).toHaveValue(/^media:summit\.[0-9a-f]{16}$/);
  await expect(page.locator('input[name="image.alt"]')).toHaveValue(ALT);
  await expect(page.locator('input[name="image.caption"]')).toHaveValue(CAPTION);
  const reference = await srcInput.inputValue();
  const hash = reference.split('.')[1];

  // 6. Save. The Save control submits the edit form, committing the .md (with the nested image
  //    frontmatter) and media.json on the entry's pending branch.
  await page.locator('.navbar').getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(/saved=1/, { timeout: 10_000 });

  // The fake-github recorder shows the .md commit on the pending branch, its frontmatter carrying the
  // nested image object: gray-matter serializes the structured value, so the committed text holds the
  // media: ref, the alt, and the caption.
  await expect(async () => {
    const commit = await (await request.get('/test/last-commit')).json();
    expect(commit.branch).toBe(`cairn/posts/${id}`);
    expect(commit.path).toBe(`src/content/posts/${id}.md`);
    expect(commit.content).toContain('image:');
    expect(commit.content).toContain(reference);
    expect(commit.content).toContain(ALT);
    expect(commit.content).toContain(CAPTION);
  }).toPass({ timeout: 15_000 });

  // The media.json committed in the same commit carries the uploaded row, keyed by its hash.
  const mediaFile = await request.get(
    `/test/branch-file?branch=${encodeURIComponent(`cairn/posts/${id}`)}&path=${encodeURIComponent('src/content/.cairn/media.json')}`,
  );
  expect(mediaFile.ok()).toBeTruthy();
  const { content } = (await mediaFile.json()) as { content: string };
  const manifest = JSON.parse(content) as Record<string, { slug: string; ext: string }>;
  expect(manifest[hash]).toBeTruthy();
  expect(manifest[hash].slug).toBe('summit');
  expect(manifest[hash].ext).toBe('png');
});

test('Part B: the seeded hello post resolves its frontmatter hero, the template renders it, and the head carries the og:image', async ({
  page,
}) => {
  // The hello post's permalink is the date-stripped slug (the showcase posts scheme): /posts/hello.
  await page.goto('/posts/hello');

  // The template renders the hero figure above the article: the resolved root-relative <img> src,
  // the alt from the structured value, and the caption in a figcaption.
  const hero = page.locator('figure.hero');
  await expect(hero).toBeVisible();
  await expect(hero.locator('img')).toHaveAttribute('src', SEED_HERO_URL);
  await expect(hero.locator('img')).toHaveAttribute('alt', SEED_HERO_ALT);
  await expect(hero.locator('figcaption')).toHaveText(SEED_HERO_CAPTION);

  // The head carries the resolved og:image as the ABSOLUTE URL (origin + the delivery path) and a
  // twitter:image:alt carrying the hero alt. The origin is the showcase's ORIGIN constant.
  const origin = 'https://showcase.test';
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    origin + SEED_HERO_URL,
  );
  await expect(page.locator('meta[name="twitter:image:alt"]')).toHaveAttribute(
    'content',
    SEED_HERO_ALT,
  );
});
