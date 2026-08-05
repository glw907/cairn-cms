import { test, expect } from '@playwright/test';

// The seeded hello post's permalink is the date-stripped slug (the showcase posts scheme):
// /posts/hello, so its raw-markdown twin is /posts/hello.md.

test('the markdown twin serves the stored markdown, unrendered', async ({ request }) => {
  const res = await request.get('/posts/hello.md');
  expect(res.status()).toBe(200);
  const body = await res.text();
  // A renderer would have turned this into <a href="/pages/about">the about page</a>; the raw
  // cairn: link token and the fenced :::alert directive only survive in the unrendered source, so
  // their presence proves this is the stored markdown rather than a reconstruction of the HTML.
  expect(body).toContain('[about page](cairn:pages/about)');
  expect(body).toContain(':::alert{role=caution}');
  expect(body).not.toContain('<article');
  expect(body).not.toContain('<a href=');
});

test('a noindex entry has no markdown twin', async ({ request }) => {
  // src/content/pages/about.md declares `robots: noindex`; markdownEntries excludes it from the
  // prerendered build, so the twin path 404s rather than serving anything.
  const res = await request.get('/pages/about.md');
  expect(res.status()).toBe(404);
});

test('the rendered head advertises the twin, and the twin it points at exists', async ({ page, request }) => {
  await page.goto('/posts/hello');
  const link = page.locator('link[rel="alternate"][type="text/markdown"]');
  await expect(link).toHaveAttribute('href', /\/posts\/hello\.md$/);
  const href = await link.getAttribute('href');
  // canonicalUrl is anchored to the fixture's fake ORIGIN (https://showcase.test), not the preview
  // server's own host, so fetch the twin by its path against the running server rather than the
  // absolute href.
  const res = await request.get(new URL(href!).pathname);
  expect(res.status()).toBe(200);
});

test('a noindex entry emits no alternate markdown link', async ({ page }) => {
  await page.goto('/pages/about');
  await expect(page.locator('link[rel="alternate"][type="text/markdown"]')).toHaveCount(0);
});
