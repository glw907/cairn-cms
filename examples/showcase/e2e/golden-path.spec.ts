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
  // Open the seed entry directly. The list paginates at ten rows newest-first, and prior specs in
  // the run accumulate enough newer entries to push the June seed off page one, so a page-one link
  // click races the entry count. Navigating straight to the edit URL is order-independent.
  await page.goto('/admin/posts/2026-06-hello');
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

  // The band's save-state indicator notices the edit.
  await expect(page.locator('.navbar .cairn-save-state')).toContainText('Unsaved changes');

  // Preview renders the bold wrap as real markup inside the sandboxed iframe (the frame's own
  // document carries the site styling); switching back keeps the editor text.
  await page.getByRole('tab', { name: 'Preview' }).click();
  await expect(page.locator('#cairn-pane-preview')).toBeVisible({ timeout: 2000 });
  const frame = page.frameLocator('#cairn-pane-preview iframe[title="Page preview"]');
  await expect(frame.locator('strong')).toHaveText('A line to embolden.');

  // The adapter's preview knob is wired: the frame document links both public stylesheets (the theme
  // sheet and the site sheet, the preview parity the reading surface needs; the build names each
  // emitted asset after its importing chunk, so pin only the .css extension), the content sits inside
  // the site's own container at its real measure (site.css caps .site-main at var(--cairn-measure),
  // 44rem = 704px), and the no-knob hint never renders.
  const previewSheets = frame.locator('link[rel="stylesheet"]');
  await expect(previewSheets).toHaveCount(2);
  await expect(previewSheets.first()).toHaveAttribute('href', /\.css/);
  await expect(previewSheets.last()).toHaveAttribute('href', /\.css/);
  await expect(frame.locator('.site-main')).toHaveCSS('max-width', '704px');
  // The wrapper also carries .prose (adapter's containerClass: 'site-main prose'), so the reading
  // surface's typography applies too, not just the measure column. overflow-wrap: anywhere is a
  // prose.css-only rule (site.css's own .site-main sets no such property), so it pins the class is
  // really there rather than merely present in the attribute.
  await expect(frame.locator('.site-main')).toHaveClass(/\bprose\b/);
  await expect(frame.locator('.site-main')).toHaveCSS('overflow-wrap', 'anywhere');
  await expect(page.getByText('Preview shows unstyled markup')).toHaveCount(0);

  // The width menu sizes the frame: pick Phone (each item names its width for assistive tech)
  // and the frame column narrows to its 390px.
  await page.getByRole('button', { name: /Preview width/ }).click();
  await page.getByRole('button', { name: 'Phone · 390 px', exact: true }).click();
  await expect(page.locator('.cairn-preview-frame')).toHaveCSS('width', '390px');

  await page.getByRole('tab', { name: 'Write' }).click();
  await expect(editor).toContainText('**A line to embolden.**');

  // The band is sticky: after scrolling to the bottom, Save (now in the topbar) is still in the viewport.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const save = page.locator('.navbar').getByRole('button', { name: 'Save', exact: true });
  await expect(save).toBeInViewport();

  // Save from the band. The redirect carries saved=1, the flash explains the publish model, and
  // the indicator settles to Saved. The flash also lands in the sr-only live region, so target
  // the visible alert.
  await save.click();
  await expect(page).toHaveURL(/saved=1/, { timeout: 10_000 });
  await expect(
    page.locator('.alert', { hasText: 'Saved. Your site keeps showing the published version until you publish.' }),
  ).toBeVisible();
  await expect(page.locator('.navbar .cairn-save-state')).toHaveText('Saved');
});

test('a link inside the preview frame never navigates the admin away from the edits', async ({ page }) => {
  // Open the seed entry directly. The list paginates at ten rows newest-first, and prior specs in
  // the run accumulate enough newer entries to push the June seed off page one, so a page-one link
  // click races the entry count. Navigating straight to the edit URL is order-independent.
  await page.goto('/admin/posts/2026-06-hello');
  await expect(page).toHaveURL(/\/admin\/posts\/2026-06-hello$/);

  // Replace the body with prose carrying a root-relative link, the kind that would resolve
  // against the admin origin inside the srcdoc frame.
  const editor = page.locator('.cm-content');
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('Visit the [home page](/) for more.');
  await expect(page.locator('input[name="body"]')).toHaveValue('Visit the [home page](/) for more.', {
    timeout: 2000,
  });

  await page.getByRole('tab', { name: 'Preview' }).click();
  const frame = page.frameLocator('#cairn-pane-preview iframe[title="Page preview"]');
  const link = frame.locator('a', { hasText: 'home page' });
  await expect(link).toBeVisible();

  // The frame document's base tag turns the click into a popup, which the empty sandbox blocks:
  // the admin URL holds, and the frame still shows the preview (it did not navigate itself to
  // the site, let alone render the admin login inside the frame).
  await link.click();
  await expect(page).toHaveURL(/\/admin\/posts\/2026-06-hello$/);
  await expect(link).toBeVisible();
  await expect(page.locator('.cairn-preview-frame')).toBeVisible();
});

test('the publish workflow round-trips: create, save, New, publish, edit, Edited, discard', async ({ page, request }) => {
  // A unique slug per run: the fake repo lives in the server process, and a local run may reuse
  // an existing server (reuseExistingServer), so a fixed slug would collide on the second run.
  const slug = `race-report-${Date.now()}`;

  await page.goto('/admin/posts');

  // Create the entry through the header dialog. The date defaults to today; the create action
  // composes the dated id and redirects to the editor with ?new=1.
  await page.locator('header').getByRole('button', { name: 'New post' }).click();
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
  await page.locator('.navbar').getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(/saved=1/, { timeout: 10_000 });
  const savedCommit = await (await request.get('/test/last-commit')).json();
  expect(savedCommit.branch).toBe(`cairn/posts/${id}`);

  // The list shows the never-published entry with the New badge.
  await page.goto('/admin/posts');
  const row = page.locator('tr', { has: page.locator(`a[href="/admin/posts/${id}"]`) });
  await expect(row.getByText('New', { exact: true })).toBeVisible();

  // Publish from the edit page: the band's status badge names the never-published state (the
  // redesign replaced the standing banner), the publish flash confirms, and the fake repo's main
  // now holds the file (the recorded commit landed on main).
  await row.locator(`a[href="/admin/posts/${id}"]`).click();
  await expect(page.locator('.navbar').getByText('New', { exact: true })).toBeVisible();
  await page.locator('.navbar').getByRole('button', { name: 'Publish', exact: true }).click();
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
  await page.locator('.navbar').getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(/saved=1/, { timeout: 10_000 });
  await page.goto('/admin/posts');
  await expect(row.getByText('Edited', { exact: true })).toBeVisible();

  // Discard the pending edits: the action lives in the band's More actions menu since the
  // redesign, then the confirm dialog, the flash, and the editor shows the published body again
  // (main's copy, the branch is gone).
  await row.locator(`a[href="/admin/posts/${id}"]`).click();
  await page.locator('.navbar').getByRole('button', { name: 'More actions' }).click();
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

test('the office triage: the publish-state filters carry counts, Pending edits narrows, and a row shows its summary', async ({ page }) => {
  // The list reads through the GitHub double's main tree. The seeded post (2026-06-hello) is on
  // main and carries a body, so deriveExcerpt fills its row summary line. A prior test may have
  // left it on a pending branch (status edited), so this test keeps its assertions partition-
  // agnostic for the seed and self-contained around its own freshly created entry.
  await page.goto('/admin/posts');
  await expect(page).toHaveURL(/\/admin\/posts$/);

  // The triage control is present: the three publish-state filters, each with its live count (the
  // admin toolkit's ListToolbar segmented filter, an ARIA radiogroup).
  const triage = page.getByRole('radiogroup', { name: 'Filter by publish state' });
  await expect(triage).toBeVisible();
  const allFilter = triage.getByRole('radio', { name: /^All/ });
  const pendingFilter = triage.getByRole('radio', { name: /^Pending edits/ });
  const publishedFilter = triage.getByRole('radio', { name: /^Published/ });
  // Each filter names a numeric count (the exact totals shift with prior tests, so match the shape,
  // not a brittle literal). All defaults checked.
  await expect(allFilter).toHaveText(/All\s*\d+/);
  await expect(pendingFilter).toHaveText(/Pending edits\s*\d+/);
  await expect(publishedFilter).toHaveText(/Published\s*\d+/);
  await expect(allFilter).toHaveAttribute('aria-checked', 'true');

  // The list's rows are one line (the density ruling, design arc 2026-07-15): the summary stays
  // off the office list even for an entry that carries one, so the seeded row renders its title
  // with no [data-summary] node at all.
  const seedRow = page.locator('tr', { has: page.locator('a[href="/admin/posts/2026-06-hello"]') });
  await expect(seedRow.locator('a[href="/admin/posts/2026-06-hello"]')).toBeVisible();
  await expect(seedRow.locator('[data-summary]')).toHaveCount(0);

  // Create a fresh, never-published entry so the pending partition has a stable member to assert.
  const slug = `triage-draft-${Date.now()}`;
  await page.locator('header').getByRole('button', { name: 'New post' }).click();
  const createDialog = page.locator('dialog[aria-labelledby="cairn-create-dialog-title"]');
  await expect(createDialog).toBeVisible();
  await createDialog.locator('input[name="title"]').fill('Triage Draft');
  await createDialog.locator('input[name="slug"]').fill(slug);
  await createDialog.getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/new=1/, { timeout: 10_000 });
  const id = new URL(page.url()).pathname.split('/').pop() ?? '';

  // Save a body so the entry's pending row derives a summary, and the save lands the branch.
  await page.locator('input[name="title"]').fill('Triage Draft');
  const editor = page.locator('.cm-content');
  await editor.click();
  await page.keyboard.type('A pending draft body for the triage.');
  await expect(page.locator('input[name="body"]')).toHaveValue('A pending draft body for the triage.', { timeout: 2000 });
  await page.locator('.navbar').getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(/saved=1/, { timeout: 10_000 });

  // Back on the list, Pending edits narrows to the unpublished entries: the new draft shows, and
  // its New badge confirms it sits in the pending partition.
  await page.goto('/admin/posts');
  const draftRow = page.locator('tr', { has: page.locator(`a[href="/admin/posts/${id}"]`) });
  await page.getByRole('radio', { name: /^Pending edits/ }).click();
  await expect(draftRow).toBeVisible();
  await expect(draftRow.getByText('New', { exact: true })).toBeVisible();
  // One-line rows (the density ruling): no summary node renders on the list.
  await expect(draftRow.locator('[data-summary]')).toHaveCount(0);

  // Switching to Published drops the never-published draft (it is not on main), proving the
  // partition narrows rather than just toggling chrome.
  await page.getByRole('radio', { name: /^Published/ }).click();
  await expect(draftRow).toHaveCount(0);
});

test('zen round trip: the footer toggle hides the band, the chip carries the way out, Escape restores', async ({ page }) => {
  // Open the seed entry directly. The list paginates at ten rows newest-first, and prior specs in
  // the run accumulate enough newer entries to push the June seed off page one, so a page-one link
  // click races the entry count. Navigating straight to the edit URL is order-independent.
  await page.goto('/admin/posts/2026-06-hello');
  await expect(page).toHaveURL(/\/admin\/posts\/2026-06-hello$/);

  // The band is present before zen, with its Save control. The persistent sidebar is also up: this
  // is a desk route at the default (desktop) project width, which sits at the xl persist breakpoint.
  const band = page.locator('.navbar');
  await expect(band.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
  const sidebar = page.locator('nav[aria-label="Site content"]');
  await expect(sidebar).toBeVisible();

  // Enter zen from the footer "Zen" toggle. AdminLayout reads the zen flag through the topbar
  // context holder and drops the whole band element; the document title, the toolbar strip, and
  // the footer go with it. The floating chip is the one affordance that stays. The persistent
  // sidebar recedes too (plan-locked call 1): zen is an explicit, reversible editor choice, so it
  // steps back at every width, not just below its route's usual persist breakpoint.
  await page.getByRole('button', { name: 'Zen' }).click();
  await expect(page.locator('.navbar')).toHaveCount(0);
  await expect(sidebar).toBeHidden();

  // The chip carries the two things the WordPress/Ghost rule keeps under zen: the live save state
  // and the way out.
  const chip = page.locator('.cairn-zen-chip');
  await expect(chip).toBeVisible();
  await expect(chip.locator('.cairn-save-state')).toContainText('Saved');
  await expect(chip.getByRole('button', { name: /Exit zen/ })).toBeVisible();

  // The manuscript stays: typing into the editor still flows through to the hidden body input, and
  // the chip's save state flips live as the edit lands.
  const editor = page.locator('.cm-content');
  await editor.click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('A line written under zen.');
  await expect(page.locator('input[name="body"]')).toHaveValue('A line written under zen.', { timeout: 2000 });
  await expect(chip.locator('.cairn-save-state')).toContainText('Unsaved changes');

  // Escape exits zen and the band returns, with the persistent sidebar beside it.
  await page.keyboard.press('Escape');
  await expect(page.locator('.cairn-zen-chip')).toHaveCount(0);
  await expect(page.locator('.navbar')).toBeVisible();
  await expect(sidebar).toBeVisible();

  // Save from the restored band; the edit written under zen commits.
  await page.locator('.navbar').getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(/saved=1/, { timeout: 10_000 });
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

test('the component picker groups the catalog, opens the callout two-pane with its live preview, and inserts the directive', async ({ page }) => {
  // Open the seed entry directly. The list paginates at ten rows newest-first, and prior specs in
  // the run accumulate enough newer entries to push the June seed off page one, so a page-one link
  // click races the entry count. Navigating straight to the edit URL is order-independent.
  await page.goto('/admin/posts/2026-06-hello');
  await expect(page).toHaveURL(/\/admin\/posts\/2026-06-hello$/);

  // Open the Insert-component picker from the editor toolbar.
  const editor = page.locator('.cm-content');
  await expect(editor).toBeVisible();
  await page.getByRole('button', { name: 'Insert block' }).click();
  const dialog = page.locator('dialog[aria-labelledby="cairn-insert-dialog-title"]');
  await expect(dialog).toBeVisible();

  // The catalog groups by the config's `group` headings, in declaration order. The registry keeps
  // growing (Media, Quotes, Actions, and Structure have since joined Callouts and Notices), so assert
  // the two groups this test exercises by name and relative order rather than the full list, so a
  // newly registered component group elsewhere in the catalog does not break this test.
  const headingTexts = await dialog.locator('[data-testid="cairn-pk-group-heading"]').allTextContents();
  expect(headingTexts).toContain('Callouts');
  expect(headingTexts).toContain('Notices');
  expect(headingTexts.indexOf('Callouts')).toBeLessThan(headingTexts.indexOf('Notices'));

  // Pick the callout. It declares a `preview`, so the configure step opens two-pane: the form on
  // the left and the live preview frame on the right.
  await dialog.locator('[data-testid="cairn-pk-row"]', { hasText: 'Callout' }).click();
  await expect(dialog.locator('h2#cairn-insert-dialog-title')).toHaveText('Callout');
  await expect(dialog.locator('[data-testid="cairn-pk-preview"]')).toBeVisible();
  const previewFrame = page.frameLocator('[data-testid="cairn-pk-preview"] iframe[title="Component preview"]');
  // The preview seeds from the sample, so the rendered frame carries the sample title through the
  // site's own render() path.
  await expect(previewFrame.locator('.callout-title')).toContainText('A worked example', { timeout: 5000 });

  // Insert. The serialized directive lands at the editor cursor (callout has a nested slot, so the
  // grammar opens it with a four-colon fence).
  await dialog.getByRole('button', { name: 'Insert', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(editor).toContainText('::::callout[A worked example]');
});

test('the component round-trips: place a callout, the caret enables Edit block, Update rewrites the same block in place', async ({ page }) => {
  // Open the seed entry directly. The list paginates at ten rows newest-first, and prior specs in
  // the run accumulate enough newer entries to push the June seed off page one, so a page-one link
  // click races the entry count. Navigating straight to the edit URL is order-independent.
  await page.goto('/admin/posts/2026-06-hello');
  await expect(page).toHaveURL(/\/admin\/posts\/2026-06-hello$/);

  // Author a deterministic body: a known prose line followed by a blank line, so a later click can
  // land the caret on plain text (proving the disabled state) before it moves onto the component.
  const editor = page.locator('.cm-content');
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('A plain prose line.\n\n');

  // Reuse the insert flow to place a real callout below the prose. The directive lands at the
  // caret, which sits on the trailing blank line.
  await page.getByRole('button', { name: 'Insert block' }).click();
  const insertDialog = page.locator('dialog[aria-labelledby="cairn-insert-dialog-title"]');
  await expect(insertDialog).toBeVisible();
  await insertDialog.locator('[data-testid="cairn-pk-row"]', { hasText: 'Callout' }).click();
  await expect(insertDialog.locator('[data-testid="cairn-pk-preview"]')).toBeVisible();
  await insertDialog.getByRole('button', { name: 'Insert', exact: true }).click();
  await expect(insertDialog).not.toBeVisible();
  // The placed block carries the sample title; the nested points slot opens a four-colon fence.
  await expect(editor).toContainText('::::callout[A worked example]');

  // With the caret on the plain prose line (not on any component), the Edit-block control carries
  // its disabled label and is disabled.
  await editor.locator('.cm-line', { hasText: 'A plain prose line.' }).click();
  await expect(page.getByRole('button', { name: 'Place the cursor in a component to edit it' })).toBeDisabled();

  // Put the text cursor inside the callout block by clicking its opener line.
  await editor.locator('.cm-line', { hasText: '::::callout[A worked example]' }).click();

  // The caret-on-component gate flips the control to enabled, with the active-state label.
  const editEnabled = page.getByRole('button', { name: 'Edit the component at the cursor' });
  await expect(editEnabled).toBeEnabled({ timeout: 5000 });

  // Activate Edit block: the dialog opens straight into the configure step in edit mode. The header
  // eyebrow reads Edit (not Insert), the primary button reads Update, and the form is pre-filled
  // with the callout's current title.
  await editEnabled.click();
  const editDialog = page.locator('dialog[aria-labelledby="cairn-insert-dialog-title"]');
  await expect(editDialog).toBeVisible();
  // The header eyebrow breadcrumb reads "Edit > <group>" in edit mode (it reads "Insert" while
  // browsing the catalog), proving the dialog opened in edit mode rather than the insert path.
  await expect(editDialog.getByText(/^Edit\s*›\s*Callouts$/)).toBeVisible();
  await expect(editDialog.getByRole('button', { name: 'Update', exact: true })).toBeVisible();
  const titleField = editDialog.getByLabel('Title');
  await expect(titleField).toHaveValue('A worked example');

  // Change the title and Update. The dialog replaces the stored source range rather than inserting
  // a second block.
  await titleField.fill('A revised heading');
  await editDialog.getByRole('button', { name: 'Update', exact: true }).click();
  await expect(editDialog).not.toBeVisible();

  // The editor source now carries the callout with the NEW title, and the old title is gone: one
  // block, rewritten in place.
  await expect(editor).toContainText('::::callout[A revised heading]');
  await expect(editor).not.toContainText('A worked example');
  await expect(editor.locator('.cm-line', { hasText: '::::callout[' })).toHaveCount(1);
});

test('an entry opens with its component blocks folded, and the safety invariant still unfolds one on touch', async ({
  page,
}) => {
  // A fresh, self-contained post (the fresh-post isolation container-fields.spec.ts uses): the
  // seeded 2026-06-hello entry is a shared fixture other tests in this file overwrite and save, so
  // this proves fold-on-open against a body only this test ever wrote.
  const slug = `fold-on-open-${Date.now()}`;
  await page.goto('/admin/posts');
  await page.locator('header').getByRole('button', { name: 'New post' }).click();
  const createDialog = page.locator('dialog[aria-labelledby="cairn-create-dialog-title"]');
  await expect(createDialog).toBeVisible();
  await createDialog.locator('input[name="title"]').fill('Fold On Open');
  await createDialog.locator('input[name="slug"]').fill(slug);
  await createDialog.getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/new=1/, { timeout: 10_000 });
  const id = new URL(page.url()).pathname.split('/').pop() ?? '';

  await page.locator('input[name="title"]').fill('Fold On Open');
  const editor = page.locator('.cm-content');
  await editor.click();
  await page.keyboard.type('Intro line.\n\n:::note\nHidden detail one.\nHidden detail two.\n:::');
  await expect(page.locator('input[name="body"]')).toHaveValue(/Hidden detail two\./, { timeout: 2000 });
  await page.locator('.navbar').getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(/saved=1/, { timeout: 10_000 });

  // Reload the editor from scratch: a fresh mount, the moment EditPage turns foldOnMount on. The
  // CodeMirror bundle mounts through a chain of dynamic imports (MarkdownEditor's onMount), which
  // can run past Playwright's default 5s expect timeout under system load; the fold pill and the
  // hidden-text assertion get the same generous, explicit timeout the rest of this file gives a
  // slow round trip, so the wait polls the real fold state instead of assuming a fixed budget.
  await page.goto(`/admin/posts/${id}`);
  await expect(editor).toBeVisible({ timeout: 10_000 });
  const pill = editor.locator('.cm-cairn-fold-pill');
  await expect(pill).toBeVisible({ timeout: 10_000 });
  await expect(editor).not.toContainText('Hidden detail one.', { timeout: 10_000 });
  // The block's own hidden text never left the doc; only the view collapses it.
  await expect(page.locator('input[name="body"]')).toHaveValue(/Hidden detail two\./);

  // Clicking the pill springs it open, the same unfold path a manual fold takes.
  await pill.click();
  await expect(editor).toContainText('Hidden detail one.');
});

test('the v2 status select round-trips: set it, save, reload, the value persists', async ({ page }) => {
  // A unique slug per run so a reused local server (reuseExistingServer) does not collide.
  const slug = `status-roundtrip-${Date.now()}`;

  await page.goto('/admin/posts');

  // Create the entry. The status field declares default: 'draft', so the editor opens prefilled.
  await page.locator('header').getByRole('button', { name: 'New post' }).click();
  const createDialog = page.locator('dialog[aria-labelledby="cairn-create-dialog-title"]');
  await expect(createDialog).toBeVisible();
  await createDialog.locator('input[name="title"]').fill('Status Roundtrip');
  await createDialog.locator('input[name="slug"]').fill(slug);
  await createDialog.getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/new=1/, { timeout: 10_000 });
  const id = new URL(page.url()).pathname.split('/').pop() ?? '';

  // Every field but the title lives behind the Details slide-over (closed by default), so open it.
  await page.getByRole('button', { name: 'Details' }).click();

  // The status select renders from the v2 fields.select arm, labelled by its field label, and the
  // default seeds it to draft on a fresh entry.
  const statusSelect = page.getByRole('combobox', { name: 'Status' });
  await expect(statusSelect).toBeVisible();
  await expect(statusSelect).toHaveValue('draft');

  // Required title plus a body so the save validates and commits the branch.
  await page.locator('input[name="title"]').fill('Status Roundtrip');
  const editor = page.locator('.cm-content');
  await editor.click();
  await page.keyboard.type('A body for the status round-trip.');
  await expect(page.locator('input[name="body"]')).toHaveValue('A body for the status round-trip.', {
    timeout: 2000,
  });

  // Change the select to published and save. The frontmatter encode (frontmatterFromForm) writes
  // the chosen value, and the commit carries it.
  await statusSelect.selectOption('published');
  await page.locator('.navbar').getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(/saved=1/, { timeout: 10_000 });

  // Reload the editor from the list. The load reads the committed frontmatter back through
  // formValues, and the select renders its persisted value: the new arm round-tripped end to end.
  await page.goto(`/admin/posts/${id}`);
  await page.getByRole('button', { name: 'Details' }).click();
  const reloadedSelect = page.getByRole('combobox', { name: 'Status' });
  await expect(reloadedSelect).toBeVisible();
  await expect(reloadedSelect).toHaveValue('published');
});

test('reference fields round-trip through the editor, commit their edges, and resolve on the public route', async ({
  page,
  request,
}) => {
  // The reference fields (posts.author -> pages, posts.related -> posts) live behind the Details
  // slide-over. The seed manifest carries the About page (the author target) and a second post
  // ("A later pass") for the related edge. A fresh entry per run keeps this self-contained under
  // the reused local server (reuseExistingServer keeps the in-memory repo across runs).
  const slug = `references-${Date.now()}`;

  await page.goto('/admin/posts');

  // Create the entry through the header dialog.
  await page.locator('header').getByRole('button', { name: 'New post' }).click();
  const createDialog = page.locator('dialog[aria-labelledby="cairn-create-dialog-title"]');
  await expect(createDialog).toBeVisible();
  await createDialog.locator('input[name="title"]').fill('References');
  await createDialog.locator('input[name="slug"]').fill(slug);
  await createDialog.getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/new=1/, { timeout: 10_000 });
  const id = new URL(page.url()).pathname.split('/').pop() ?? '';

  // Required title plus a body so the save validates and commits the branch.
  await page.locator('input[name="title"]').fill('References');
  const editor = page.locator('.cm-content');
  await editor.click();
  await page.keyboard.type('A body for the reference round-trip.');
  await expect(page.locator('input[name="body"]')).toHaveValue('A body for the reference round-trip.', {
    timeout: 2000,
  });

  // Every field but the title lives behind the Details slide-over (closed by default), so open it.
  await page.getByRole('button', { name: 'Details' }).click();

  // Pick the author: the single reference renders a combobox-style trigger labelled by its field
  // label, opening the EntryPicker scoped to the pages concept. The About page is the one target.
  // The edit page mounts several EntryPickers (the body link picker, the fragment picker, and one
  // per reference field), so select this one by its accessible name, which is the thing that tells
  // them apart for an assistive-technology user too.
  await page.getByRole('button', { name: 'Author', exact: true }).click();
  const authorPicker = page.getByRole('dialog', { name: 'Choose Author' });
  await expect(authorPicker).toBeVisible();
  await authorPicker.getByRole('button', { name: 'About' }).click();
  // The trigger now shows the resolved target title, so the pick landed in the hidden input.
  await expect(page.getByRole('button', { name: 'Author', exact: true })).toContainText('About');

  // Add a related post: the array(reference) renders a chip list plus an "Add" trigger; pick a
  // distinct seeded post so the edge is unambiguous.
  await page.getByRole('button', { name: 'Add Related posts' }).click();
  const relatedPicker = page.getByRole('dialog', { name: 'Choose Related posts' });
  await expect(relatedPicker).toBeVisible();
  await relatedPicker.getByRole('button', { name: 'A later pass' }).click();
  // The chip carries the resolved title and its remove control.
  await expect(page.getByRole('button', { name: 'Remove A later pass' })).toBeVisible();

  // Save. frontmatterFromForm encodes the single id and the array's getAll list; the commit lands
  // the entry markdown on the entry's pending branch (the manifest upsert rides the publish).
  await page.locator('.navbar').getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(/saved=1/, { timeout: 10_000 });

  // The committed entry markdown on the branch carries the reference frontmatter: the single author
  // id and the related sequence, serialized from the picked targets.
  const branch = `cairn/posts/${id}`;
  const branchMd = await request.get(
    `/test/branch-file?branch=${encodeURIComponent(branch)}&path=${encodeURIComponent(`src/content/posts/${id}.md`)}`,
  );
  expect(branchMd.ok()).toBe(true);
  const md = (await branchMd.json()).content as string;
  expect(md).toContain('author: about');
  expect(md).toContain('2026-06-first-custom');

  // Reload the editor from the list. The load reads the committed frontmatter back through
  // formValues, and both reference arms render their persisted targets: the round-trip holds.
  await page.goto(`/admin/posts/${id}`);
  await page.getByRole('button', { name: 'Details' }).click();
  await expect(page.getByRole('button', { name: 'Author', exact: true })).toContainText('About');
  await expect(page.getByRole('button', { name: 'Remove A later pass' })).toBeVisible();

  // Publish: the publish commit lands the body and the regenerated content manifest on main. The
  // manifest entry carries the extracted reference edges (the extractor paired each id with its
  // descriptor concept), so the committed manifest is the durable reference graph (a resolution bug
  // that dropped or mis-typed an edge cannot pass CI).
  await page.locator('.navbar').getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page).toHaveURL(/published=1/, { timeout: 10_000 });
  const mainManifest = await request.get(
    `/test/branch-file?branch=main&path=${encodeURIComponent('src/content/.cairn/index.json')}`,
  );
  expect(mainManifest.ok()).toBe(true);
  const manifest = JSON.parse((await mainManifest.json()).content) as {
    entries: { id: string; references?: { field: string; concept: string; id: string }[] }[];
  };
  const entry = manifest.entries.find((e) => e.id === id);
  expect(entry?.references).toEqual([
    { field: 'author', concept: 'pages', id: 'about' },
    { field: 'related', concept: 'posts', id: '2026-06-first-custom' },
  ]);

  // The public route resolves a reference to its target identity at the site-resolver layer. The
  // seeded disk post /posts/hello sets `author: about` and `related: [2026-02-20-second]`, so the
  // rendered page links the resolved author title to its permalink (the resolved render, not the
  // raw id). This proves the delivery-side resolution, independent of the admin's in-repo edits.
  await page.goto('/posts/hello');
  const byline = page.getByTestId('post-author');
  await expect(byline).toContainText('By');
  const authorLink = byline.getByRole('link', { name: 'About' });
  await expect(authorLink).toHaveAttribute('href', '/about');
  // The related edge resolves to its target post's title, linked to its permalink.
  const relatedNav = page.getByTestId('post-related');
  await expect(relatedNav.getByRole('link', { name: 'A second post' })).toHaveAttribute('href', '/posts/second');
});

// The Mode 1 coexistence proof this spec used to run against the template's own /calendar stub
// (cut per the Waymark final design review's verdict 4: the calendar route existed only to prove
// a non-cairn feature survives alongside the admin, and it undercut every page that linked it) now
// lives in custom-screen.spec.ts's Signups test, which proves the stronger case: a custom admin
// screen reading identity and writing its own D1 binding, registered through the same adminNav seam.
