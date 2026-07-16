import { test, expect } from '@playwright/test';

// Task 8: the fragments (reusable-content) feature, proven end to end against the real showcase
// build. The public half and the editor half exercise two separate content universes on purpose:
//
//   - The public assertions read the disk corpus under src/content/, which the [...path] route
//     prerenders at build time (createSiteIndexes over import.meta.glob). The seeded fragment
//     (src/content/fragments/trail-safety-notice.md) is included from a post
//     (2026-03-10-callout.md) and a page (about.md), and its manifest row was regenerated with
//     `cairn:manifest` so the prerendered build and the committed manifest agree.
//
//   - The editor assertions run against the dev-backend double (fake-github.ts), an in-memory
//     GitHub stand-in with its own seed data, entirely separate from the disk corpus above. That
//     double starts with no fragments of its own, so this half authors, saves, and publishes a
//     fragment through the real admin UI before it can appear as a fragmentTargets candidate.

const FRAGMENT_TEXT = 'Check current avalanche and trail conditions before you set out';

test.describe('fragments: reusable content included across entries', () => {
  test('an included fragment renders on the consuming post and the consuming page', async ({ page }) => {
    await page.goto('/posts/callout');
    await expect(page.locator('article.prose')).toContainText(FRAGMENT_TEXT);

    await page.goto('/about');
    await expect(page.locator('article.prose')).toContainText(FRAGMENT_TEXT);
  });

  test("a fragment's own computed permalink is not publicly routable (the Task 1 routable gate, end to end)", async ({
    page,
  }) => {
    // The fragments concept declares routing: 'embedded', so its entries never enter the site
    // resolver's byPath union (site-resolver.ts's routable gate): the default permalink pattern
    // still computes (/fragments/:slug), but nothing ever serves there.
    const response = await page.goto('/fragments/trail-safety-notice');
    expect(response?.status()).toBe(404);
  });

  test('an editor authors and publishes a fragment, then includes it in a post through the picker', async ({
    page,
  }) => {
    const fragmentSlug = `picker-fragment-${Date.now()}`;
    const fragmentTitle = 'Picker fragment';
    const fragmentBody = 'Distinctive content proving the fragment picker inclusion.';

    // Author the fragment through the generic concept-agnostic admin routes (Tasks 1-7 give every
    // declared concept the same list/create/edit/save/publish machinery, with no fragments-specific
    // route in the showcase). Publishing lands it on the dev backend's main, which is what
    // fragmentTargets reads (content-routes-core.ts reads a fragment's body from
    // backend.defaultBranch only, so a pending, unpublished fragment never appears in the picker).
    await page.goto('/admin/fragments');
    await page.locator('header').getByRole('button', { name: 'New fragment' }).click();
    const createDialog = page.locator('dialog[aria-labelledby="cairn-create-dialog-title"]');
    await expect(createDialog).toBeVisible();
    await createDialog.locator('input[name="title"]').fill(fragmentTitle);
    await createDialog.locator('input[name="slug"]').fill(fragmentSlug);
    await createDialog.getByRole('button', { name: 'Create' }).click();
    await expect(page).toHaveURL(/new=1/, { timeout: 10_000 });
    const fragmentId = new URL(page.url()).pathname.split('/').pop() ?? '';
    expect(fragmentId).toContain(fragmentSlug);

    await page.locator('input[name="title"]').fill(fragmentTitle);
    const fragmentEditor = page.locator('.cm-content');
    await fragmentEditor.click();
    await page.keyboard.type(fragmentBody);
    await expect(page.locator('input[name="body"]')).toHaveValue(fragmentBody, { timeout: 2000 });
    await page.locator('.navbar').getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page).toHaveURL(/saved=1/, { timeout: 10_000 });
    await page.locator('.navbar').getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(page).toHaveURL(/published=1/, { timeout: 10_000 });

    // Create a fresh post (self-contained, rather than the shared seed post other specs in this
    // suite mutate). Type a body carrying one hand-typed include, then insert a second one through
    // the picker, so the test proves both the raw directive path and the picker's insertion path
    // render identically.
    const postSlug = `fragment-picker-post-${Date.now()}`;
    await page.goto('/admin/posts');
    await page.locator('header').getByRole('button', { name: 'New post' }).click();
    const createPostDialog = page.locator('dialog[aria-labelledby="cairn-create-dialog-title"]');
    await expect(createPostDialog).toBeVisible();
    await createPostDialog.locator('input[name="title"]').fill('Fragment Picker Post');
    await createPostDialog.locator('input[name="slug"]').fill(postSlug);
    await createPostDialog.getByRole('button', { name: 'Create' }).click();
    await expect(page).toHaveURL(/new=1/, { timeout: 10_000 });

    const editor = page.locator('.cm-content');
    await expect(editor).toBeVisible();
    await editor.click();
    await page.keyboard.type(`An intro line.\n\n::include{fragment="${fragmentId}"}`);
    const hiddenBody = page.locator('input[name="body"]');
    await expect(hiddenBody).toHaveValue(new RegExp(`fragment="${fragmentId}"`), { timeout: 2000 });

    // The toolbar's "Include a fragment" control (Task 7): its dialog lists the published
    // fragments, grouped under a Fragments heading; picking one stamps the directive at the cursor
    // (insertAtCursor prefixes a blank line automatically, so the second include lands on its own
    // line without the test needing to type one).
    await page.getByRole('button', { name: 'Include a fragment' }).click();
    const fragmentDialog = page.locator('dialog[aria-labelledby="cairn-entry-picker-title"][open]');
    await expect(fragmentDialog).toBeVisible();
    await fragmentDialog.getByRole('button', { name: fragmentTitle }).click();
    await expect(fragmentDialog).not.toBeVisible();

    const bodyValue = await hiddenBody.inputValue();
    const includeCount = bodyValue.split(`fragment="${fragmentId}"`).length - 1;
    expect(includeCount).toBe(2);

    // Preview resolves both includes against the fragment's published body (the preview resolver,
    // Task 6), rendering the distinctive fragment text in place of the directive.
    await page.getByRole('tab', { name: 'Preview' }).click();
    await expect(page.locator('#cairn-pane-preview')).toBeVisible({ timeout: 2000 });
    const frame = page.frameLocator('#cairn-pane-preview iframe[title="Page preview"]');
    await expect(frame.locator('.site-main')).toContainText(fragmentBody);
  });
});
