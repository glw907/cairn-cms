// Two chassis roles a theme sets through a custom property: the eyebrow's text case and the code
// block's horizontal-scroll cue. Each defaults to today's look and switches off with `none`.
import { test, expect } from '@playwright/test';

test('--cairn-eyebrow-case sets the home eyebrow case, uppercase by default', async ({ page }) => {
  await page.goto('/');
  const eyebrow = page.locator('p.tracking-eyebrow').first();
  await expect(eyebrow).toHaveCSS('text-transform', 'uppercase');
  await page.addStyleTag({ content: ':root { --cairn-eyebrow-case: none; }' });
  await expect(eyebrow).toHaveCSS('text-transform', 'none');
});

test('--cairn-scroll-cue none turns off the code block gradient', async ({ page }) => {
  await page.goto('/posts/the-reading-surface');
  const pre = page.locator('.prose pre').first();
  await expect(pre).toHaveCount(1);
  await expect(pre).toHaveCSS('background-image', /gradient/);
  await page.addStyleTag({ content: ':root { --cairn-scroll-cue: none; }' });
  await expect(pre).toHaveCSS('background-image', 'none');
});
