import { test, expect } from '@playwright/test';

// The table-scroll a11y fix (WCAG 1.3.1). The prior CSS-only fix put `display: block; overflow-x:
// auto` directly on the `<table>`, which fixed the 320px squeeze-wrap defect but stripped the
// table's row/cell display roles from the accessibility tree. The fix is now a wrapper: the
// showcase's own rehype step (table-scroll.ts, run from cairn.config.ts's rendering.render) wraps
// every rendered `<table>` in a `.table-scroll` region, and the table itself stays `display: table`.
// This spec proves the markup shape and the scroll behavior it exists to keep, not a screenshot.
test('a rendered table sits in a labeled, focusable scroll region and keeps its own display: table', async ({
  page,
}) => {
  await page.goto('/posts/the-reading-surface');

  const table = page.locator('.prose table');
  await expect(table).toBeVisible();

  // The table keeps its real table display: the accessibility-tree fix is the wrapper, not the
  // table itself.
  expect(await table.evaluate((el) => getComputedStyle(el).display)).toBe('table');

  // The wrapper is the table's direct parent: a region, reachable by keyboard, named after the
  // table's header row.
  const wrapper = table.locator('xpath=..');
  expect(await wrapper.evaluate((el) => el.className)).toContain('table-scroll');
  expect(await wrapper.getAttribute('role')).toBe('region');
  expect(await wrapper.getAttribute('tabindex')).toBe('0');
  const label = await wrapper.getAttribute('aria-label');
  expect(label).toBeTruthy();
  expect(label).toContain('Element');
  expect(await wrapper.evaluate((el) => getComputedStyle(el).display)).toBe('block');
});

test('at 320px the table scrolls its wrapper instead of wrapping its cells mid-token', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/posts/the-reading-surface');

  const table = page.locator('.prose table');
  await expect(table).toBeVisible();
  const wrapper = table.locator('xpath=..');

  // The scroll-not-shatter proof: the wrapper's content overflows its own box (a real horizontal
  // scroll available), not a visual-only screenshot check.
  const overflows = await wrapper.evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(overflows).toBe(true);

  // A cell holding an unbroken inline-code token (`[text](address)`, from the writing-guide sample
  // table) never breaks mid-token: `nowrap` is the mechanism that forces the table past its own
  // 100% width, which is what makes the wrapper's overflow real instead of merely available.
  const codeCell = page.locator('.prose table td', { hasText: '[text](address)' });
  expect(await codeCell.evaluate((el) => getComputedStyle(el).whiteSpace)).toBe('nowrap');
});
