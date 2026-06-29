import { test, expect } from '@playwright/test';

// The taxonomy read path end to end. The Posts concept marks `topics` as its taxonomy, so the engine
// routes the values under /topics: a tag index at the base and a per-tag archive under it. Two seed
// posts (2026-01-15-hello and 2026-02-20-second) both carry the "Svelte" topic, which slugifies to
// "svelte", so /topics/svelte is the archive the resolver enumerates and answers.
//
// This visits the archive URL directly (the prerender enumerates it, so it resolves like any entry
// permalink) and asserts the archive lists both tagged posts, scoped to the archive's own testid list.

test('a tag archive lists the posts carrying that tag', async ({ page }) => {
  await page.goto('/topics/svelte');

  // The archive heading names the canonical tag value the slug resolved back to.
  await expect(page.getByRole('heading', { level: 1, name: 'Posts tagged Svelte' })).toBeVisible();

  // The archive list (scoped by its testid) carries both seeded posts, each linked to its permalink.
  const archive = page.getByTestId('tag-archive');
  await expect(archive.getByRole('link', { name: 'Hello, cairn' })).toHaveAttribute('href', '/posts/hello');
  await expect(archive.getByRole('link', { name: 'A second post' })).toHaveAttribute('href', '/posts/second');
});

test('the tag index links each topic to its archive', async ({ page }) => {
  await page.goto('/topics');

  await expect(page.getByRole('heading', { level: 1, name: 'Topics' })).toBeVisible();

  // The index lists the pooled topics, each linking to its archive through the engine codec. Svelte is
  // shared by both seed posts, so its link points at /topics/svelte, the route the archive test visits.
  const index = page.getByTestId('tag-index');
  await expect(index.getByRole('link', { name: 'Svelte' })).toHaveAttribute('href', '/topics/svelte');
});
