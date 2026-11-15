import { test, expect } from '@playwright/test';

// The cards block on /styleguide at the five-viewport bar, in both color schemes. The styleguide
// carries two blocks: the SAMPLE's three-item `columns="3"` block and the registry preview's
// four-item `columns="4"` block. Columns are counted as the distinct `offsetLeft` values of a
// block's items, so the count holds however the grid is written.
const WIDTH_BAR = [320, 390, 768, 1440, 2560];
const SCHEMES = ['light', 'dark'] as const;

for (const colorScheme of SCHEMES) {
  for (const width of WIDTH_BAR) {
    test(`cards lay out cleanly at ${width}px (${colorScheme})`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme });
      await page.goto('/styleguide');

      const three = page.locator('.cards.cards-cols-3');
      const four = page.locator('.cards.cards-cols-4');
      await expect(three).toHaveCount(1);
      await expect(four).toHaveCount(1);
      await expect(three.locator('.cards-item')).toHaveCount(3);
      await expect(four.locator('.cards-item')).toHaveCount(4);

      const noOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      );
      expect(noOverflow).toBe(true);

      const srcs = await page
        .locator('.cards img')
        .evaluateAll((imgs) => imgs.map((img) => img.getAttribute('src') ?? ''));
      expect(srcs.length).toBeGreaterThan(0);
      for (const src of srcs) expect(src).not.toBe('');

      const columns = (block: typeof three) =>
        block
          .locator('.cards-item')
          .evaluateAll((items) => new Set(items.map((el) => (el as HTMLElement).offsetLeft)).size);
      if (width === 768 || width === 2560) {
        expect(await columns(three)).toBe(3);
        expect(await columns(four)).toBe(2);
      }
      if (width === 1440) {
        expect(await columns(three)).toBe(3);
        // The reading measure fits two 13rem cards across, so the four-column block lays out as two.
        expect(await columns(four)).toBe(2);
      }
      if (width === 320) {
        expect(await columns(three)).toBe(1);
        expect(await columns(four)).toBe(1);
      }
    });
  }
}
