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

  // The toolbar's Preview tab swaps the editing surface for the rendered preview; switch back to
  // Write before editing, since the editor pane hides (but stays mounted) while Preview shows.
  await page.getByRole('tab', { name: 'Preview' }).click();
  await expect(page.locator('#cairn-pane-preview')).toBeVisible({ timeout: 2000 });
  await page.getByRole('tab', { name: 'Write' }).click();

  // The body editor is CodeMirror. It mounts client-side into a contenteditable .cm-content and
  // removes the SSR textarea. Focus it, select all, and type to replace the seeded body.
  const editor = page.locator('.cm-content');
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('An edited body line.');

  // The hidden input[name="body"] tracks the editor through the updateListener -> bind:value chain.
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

test('the redesigned editor: hoisted title, toolbar bold, preview round-trip, sticky save', async ({ page }) => {
  // Open the seeded entry from the list, the same path the golden-path test takes.
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/posts$/);
  await page.locator('a[href="/admin/posts/2026-06-hello"]').click();
  await expect(page).toHaveURL(/\/admin\/posts\/2026-06-hello$/);

  // The hoisted document title sits on the editor card and still submits as name="title".
  await expect(page.locator('input.cairn-doc-title')).toHaveValue('Hello');

  // Replace the body (an earlier test may have left a pending edit on this entry), then select it
  // all and bold it from the toolbar. CodeMirror keeps its selection while the button takes the
  // click, so the wrap lands around the selected text.
  const editor = page.locator('.cm-content');
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('A line to embolden.');
  const hiddenBody = page.locator('input[name="body"]');
  await expect(hiddenBody).toHaveValue('A line to embolden.', { timeout: 2000 });
  await page.keyboard.press('ControlOrMeta+A');
  await page.getByRole('button', { name: 'Bold (Ctrl+B)' }).click();
  await expect(hiddenBody).toHaveValue('**A line to embolden.**', { timeout: 2000 });

  // The header's save-state indicator notices the edit.
  await expect(page.locator('.cairn-save-state')).toContainText('Unsaved changes');

  // Preview renders the bold wrap as real markup; switching back keeps the editor text.
  await page.getByRole('tab', { name: 'Preview' }).click();
  await expect(page.locator('#cairn-pane-preview')).toBeVisible({ timeout: 2000 });
  await expect(page.locator('#cairn-pane-preview strong')).toHaveText('A line to embolden.');
  await page.getByRole('tab', { name: 'Write' }).click();
  await expect(editor).toContainText('**A line to embolden.**');

  // The header is sticky: after scrolling to the bottom, Save is still in the viewport.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const save = page.getByRole('button', { name: 'Save', exact: true });
  await expect(save).toBeInViewport();

  // Save from the header. The redirect carries saved=1, the flash explains the publish model, and
  // the indicator settles to Saved. The flash also lands in the sr-only live region, so target
  // the visible alert.
  await save.click();
  await expect(page).toHaveURL(/saved=1/, { timeout: 10_000 });
  await expect(
    page.locator('.alert', { hasText: 'Saved. Your site keeps showing the published version until you publish.' }),
  ).toBeVisible();
  await expect(page.locator('.cairn-save-state')).toHaveText('Saved');
});

test('the publish workflow round-trips: create, save, New, publish, edit, Edited, discard', async ({ page, request }) => {
  // A unique slug per run: the fake repo lives in the server process, and a local run may reuse
  // an existing server (reuseExistingServer), so a fixed slug would collide on the second run.
  const slug = `race-report-${Date.now()}`;

  await page.goto('/admin/posts');

  // Create the entry through the header dialog. The date defaults to today; the create action
  // composes the dated id and redirects to the editor with ?new=1.
  await page.locator('header').getByRole('button', { name: 'New Posts' }).click();
  const createDialog = page.locator('dialog[aria-labelledby="cairn-create-dialog-title"]');
  await expect(createDialog).toBeVisible();
  await createDialog.locator('input[name="title"]').fill('Race Report');
  await createDialog.locator('input[name="slug"]').fill(slug);
  await createDialog.getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/new=1/, { timeout: 10_000 });
  const id = new URL(page.url()).pathname.split('/').pop() ?? '';
  expect(id).toContain(slug);

  // First save: fill the required title, type a body, save. The commit lands on the entry's
  // pending branch, not main.
  await page.locator('input[name="title"]').fill('Race Report');
  const editor = page.locator('.cm-content');
  await editor.click();
  await page.keyboard.type('The first body.');
  await expect(page.locator('input[name="body"]')).toHaveValue('The first body.', { timeout: 2000 });
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(/saved=1/, { timeout: 10_000 });
  const savedCommit = await (await request.get('/test/last-commit')).json();
  expect(savedCommit.branch).toBe(`cairn/posts/${id}`);

  // The list shows the never-published entry with the New badge.
  await page.goto('/admin/posts');
  const row = page.locator('tr', { has: page.locator(`a[href="/admin/posts/${id}"]`) });
  await expect(row.getByText('New', { exact: true })).toBeVisible();

  // Publish from the edit page: the header's status badge names the never-published state (the
  // redesign replaced the standing banner), the publish flash confirms, and the fake repo's main
  // now holds the file (the recorded commit landed on main).
  await row.locator(`a[href="/admin/posts/${id}"]`).click();
  await expect(page.locator('header').getByText('New', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page).toHaveURL(/published=1/, { timeout: 10_000 });
  // The flash text also lands in the sr-only live region, so target the visible alert.
  await expect(page.locator('.alert', { hasText: 'Published. The live site is rebuilding.' })).toBeVisible();
  const publishCommit = await (await request.get('/test/last-commit')).json();
  expect(publishCommit.branch).toBe('main');
  expect(publishCommit.path).toBe(`src/content/posts/${id}.md`);
  expect(publishCommit.content).toContain('The first body.');

  // The badge flips to Published.
  await page.goto('/admin/posts');
  await expect(row.getByText('Published', { exact: true })).toBeVisible();

  // Edit again and save: the list shows Edited.
  await row.locator(`a[href="/admin/posts/${id}"]`).click();
  await editor.click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('A second body line.');
  await expect(page.locator('input[name="body"]')).toHaveValue('A second body line.', { timeout: 2000 });
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(/saved=1/, { timeout: 10_000 });
  await page.goto('/admin/posts');
  await expect(row.getByText('Edited', { exact: true })).toBeVisible();

  // Discard the pending edits: the action lives in the header's More actions menu since the
  // redesign, then the confirm dialog, the flash, and the editor shows the published body again
  // (main's copy, the branch is gone).
  await row.locator(`a[href="/admin/posts/${id}"]`).click();
  await page.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('button', { name: 'Discard changes' }).click();
  const discardDialog = page.locator('dialog[aria-labelledby="cairn-discard-dialog-title"]');
  await expect(discardDialog).toBeVisible();
  await discardDialog.getByRole('button', { name: 'Discard', exact: true }).click();
  await expect(page).toHaveURL(/discarded=1/, { timeout: 10_000 });
  await expect(page.locator('.alert', { hasText: 'Changes discarded.' })).toBeVisible();
  await expect(page.locator('.cm-content')).toContainText('The first body.');
  await page.goto('/admin/posts');
  await expect(row.getByText('Published', { exact: true })).toBeVisible();
});

test('the editors view runs against the dev AUTH_DB double: list the seeds, add one', async ({ page }) => {
  await page.goto('/admin/editors');

  // The fake-auth-db seeds: the fixture session's owner plus one plain editor. A reused local
  // server may carry editors a prior run added, so the count assertion is relative.
  const rows = page.locator('tbody tr');
  await expect(rows.filter({ hasText: 'editor@showcase.test' })).toBeVisible();
  await expect(rows.filter({ hasText: 'writer@showcase.test' })).toBeVisible();
  const before = await rows.count();
  expect(before).toBeGreaterThanOrEqual(2);

  // Add an editor through the form; the action round-trips through the double and the reloaded
  // list shows the new row. The email is unique per run (reuseExistingServer keeps state).
  const email = `added-${Date.now()}@showcase.test`;
  const addForm = page.locator('form[action="?/addEditor"]');
  await addForm.getByLabel('Name').fill('Added Editor');
  await addForm.getByLabel('Email').fill(email);
  await addForm.getByRole('button', { name: 'Add editor' }).click();
  await expect(rows.filter({ hasText: email })).toBeVisible();
  await expect(rows).toHaveCount(before + 1);
});

test('a non-cairn feature coexists with the admin (Mode 1)', async ({ page }) => {
  await page.goto('/calendar');
  await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Events' })).toContainText('Season opener');
});
