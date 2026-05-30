import { test, expect } from '@playwright/test';

// The seeded post is 2026-06-hello in src/content/posts/.
// hooks.server.ts injects: { email: 'editor@showcase.test', displayName: 'Demo Editor', role: 'owner' }
// ConceptList links each entry to /admin/[concept]/[id]; the editor lives there (the canonical
// path), and saveAction redirects to /admin/${concept.id}/${id}?saved=1. This test navigates by
// clicking the list entry (not a hard-coded edit URL) so a wrong editor-route path would fail here.
// The fake-github.ts double records the last commit and serves it from /test/last-commit.

test('an editor opens a post from the list, edits, saves, and the commit carries the right author', async ({ page, request }) => {
  // Land on the admin: indexRedirect sends /admin -> /admin/posts (the first concept's list).
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/posts$/);

  // Open the entry from the list. The link target is the canonical editor path.
  await page.locator('a[href="/admin/posts/2026-06-hello"]').click();
  await expect(page).toHaveURL(/\/admin\/posts\/2026-06-hello$/);

  // The preview toggle button starts with text "Show preview".
  const previewBtn = page.getByRole('button', { name: 'Show preview' });
  await expect(previewBtn).toBeVisible();
  await previewBtn.click();
  const previewSection = page.locator('section[aria-label="Preview"]');
  await expect(previewSection).toBeVisible({ timeout: 2000 });

  // The body editor: Carta mounts client-side and replaces the SSR textarea with its own
  // textarea (class carta-font-code). Prefer it; fall back to the SSR aria-label textarea.
  const cartaTextarea = page.locator('textarea.carta-font-code');
  const ssrTextarea = page.locator('textarea[aria-label="Markdown source"]');
  const editorTextarea = (await cartaTextarea.isVisible()) ? cartaTextarea : ssrTextarea;
  await editorTextarea.fill('An edited body line.');

  // The hidden input[name="body"] tracks the editor via the carta -> bind:value chain.
  const hiddenBody = page.locator('input[name="body"]');
  await expect(hiddenBody).toHaveValue('An edited body line.', { timeout: 2000 });

  await page.getByRole('button', { name: 'Save' }).click();
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
