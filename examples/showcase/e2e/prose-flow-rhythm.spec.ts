import { test, expect, type Locator } from '@playwright/test';

// The owl-selector specificity regression (aea6625). `.prose > * + * { margin-top: var(--flow-space) }`
// sits at specificity (0,1,0); an unwrapped `.prose p { margin-block: 0 }` sits at (0,1,1) and always
// outranks it regardless of source order, so every paragraph's margin-top stayed 0 no matter what the
// owl selector set. The fix wraps the reset in `:where(p)` to tie its specificity with the owl rule and
// keeps it first in source, so the owl rule wins the tie. This spec asserts the computed margin, not the
// stylesheet text, so a future edit that reintroduces an unwrapped type selector on the reset (or on any
// rule the owl selector must lose a tie to) fails here instead of shipping a flat, rhythmless post.
//
// The assertion compares the element's computed margin-top against `1.35 * its own font-size` (the
// literal `--flow-space: 1.35em` from theme.css resolved against the element the margin applies to,
// which is how em-valued custom properties resolve): a loose `> 0` check would also pass a reset margin
// that leaked in from the browser's UA stylesheet.
async function expectFlowSpaceMarginTop(element: Locator) {
  const { marginTop, fontSize } = await element.evaluate((el) => {
    const style = getComputedStyle(el);
    return { marginTop: parseFloat(style.marginTop), fontSize: parseFloat(style.fontSize) };
  });
  expect(marginTop).toBeCloseTo(1.35 * fontSize, 0);
}

test('two consecutive paragraphs with no heading between them keep the owl selector rhythm', async ({
  page,
}) => {
  await page.goto('/posts/the-reading-surface');

  const first = page.locator('.prose > p', { hasText: 'Inside a paragraph you can make a word' });
  const second = page.locator('.prose > p', { hasText: 'To link to another post or page' });
  await expect(first).toBeVisible();
  await expect(second).toBeVisible();

  await expectFlowSpaceMarginTop(second);
});

test('a paragraph following a blockquote keeps the owl selector rhythm', async ({ page }) => {
  await page.goto('/posts/the-reading-surface');

  const blockquote = page.locator('.prose > blockquote');
  const following = page.locator('.prose > p', { hasText: 'When you want a single line' });
  await expect(blockquote).toBeVisible();
  await expect(following).toBeVisible();

  await expectFlowSpaceMarginTop(following);
});

test('a paragraph following a fenced code block keeps the owl selector rhythm', async ({ page }) => {
  await page.goto('/posts/the-reading-surface');

  const codeBlock = page.locator('.prose > pre').first();
  const following = page.locator('.prose > p', { hasText: 'The highlighting colors come from' });
  await expect(codeBlock).toBeVisible();
  await expect(following).toBeVisible();

  await expectFlowSpaceMarginTop(following);
});
