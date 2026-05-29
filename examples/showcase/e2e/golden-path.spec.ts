import { test, expect } from '@playwright/test';

// The seeded post is 2026-06-hello in src/content/posts/.
// The edit page lives at /admin/edit/[type]/[id] (the showcase's route structure).
// hooks.server.ts injects: { email: 'editor@showcase.test', displayName: 'Demo Editor', role: 'owner' }
// After save, content-routes.ts redirects to /admin/${concept.id}/${id}?saved=1.
// The fake-github.ts double records the last commit and serves it from /test/last-commit.

test('an editor edits a post, saves, and the commit carries the right author', async ({ page, request }) => {
  await page.goto('/admin/edit/posts/2026-06-hello');

  // The preview toggle button starts with text "Show preview".
  const previewBtn = page.getByRole('button', { name: 'Show preview' });
  await expect(previewBtn).toBeVisible();
  await previewBtn.click();
  // The preview section renders once renderPreview fires (debounced 150 ms).
  const previewSection = page.locator('section[aria-label="Preview"]');
  await expect(previewSection).toBeVisible({ timeout: 2000 });

  // The body editor: Carta mounts client-side and replaces the SSR textarea with its own
  // textarea (class carta-font-code). Wait for it; fall back to the SSR aria-label textarea
  // if Carta has not mounted yet.
  const cartaTextarea = page.locator('textarea.carta-font-code');
  const ssrTextarea = page.locator('textarea[aria-label="Markdown source"]');

  // Prefer the Carta textarea; it is present once Carta mounts in the browser.
  const editorTextarea = (await cartaTextarea.isVisible()) ? cartaTextarea : ssrTextarea;

  // Clear and fill the editing surface with new content.
  await editorTextarea.fill('An edited body line.');

  // After filling the Carta textarea, the hidden input[name="body"] is updated via the
  // carta -> bind:value -> hidden input reactive chain. Ensure the hidden field reflects
  // the new value before submitting, so the server receives the correct body.
  const hiddenBody = page.locator('input[name="body"]');
  await expect(hiddenBody).toHaveValue('An edited body line.', { timeout: 2000 });

  // Submit the form.
  await page.getByRole('button', { name: 'Save' }).click();

  // The save action redirects to /admin/posts/2026-06-hello?saved=1.
  await expect(page).toHaveURL(/saved=1/, { timeout: 10_000 });

  // Verify the commit the fake-github double recorded.
  const commit = await (await request.get('/test/last-commit')).json();
  expect(commit.path).toContain('posts/2026-06-hello');
  expect(commit.author).toEqual({ name: 'Demo Editor', email: 'editor@showcase.test' });
  // cairn does not send a committer field; GitHub attributes it to cairn-cms[bot].
  expect(commit.committer).toBeNull();
  expect(commit.content).toContain('An edited body line.');
});

test('a non-cairn feature coexists with the admin (Mode 1)', async ({ page }) => {
  await page.goto('/calendar');
  await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Events' })).toContainText('Season opener');
});
