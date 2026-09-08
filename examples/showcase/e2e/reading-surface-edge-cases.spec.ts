import { test, expect } from '@playwright/test';

// Five edge cases on the reading-surface article and the styleguide's banner demo, each
// reproducible without any special setup:
//   1. a standalone `:::icon` directive must size at a modest, text-height scale rather than the
//      browser's default replaced-element SVG box, since prose.css sizes `.cairn-glyph` only inside
//      a nested component (alert, video-facade, cta-link, faq-marker) unless the article also
//      styles the bare top-level case.
//   2. the inline CTA's background must read distinct from the page background in both themes,
//      since the panel-button token pair (`--cairn-cta-btn-*`) it reuses can resolve to the page's
//      own paper color in one theme and the accent in the other.
//   3. a hero/wide/full figure image must carry a height cap, so an extreme-ratio photo cannot blow
//      the column height out.
//   4. `.prose` must wrap a long unbroken token (a bare URL) inside the column rather than
//      overflowing it, since the body's `overflow-x: clip` (the full-bleed-figure guard) would
//      otherwise hide the overflow instead of showing a scrollbar, silently swallowing the token.
//   5. an expired banner's hydrate island must not serialize its message or expiry into
//      `data-cairn-props`, even though `build()` already decided the banner is permanently expired.
test.describe('Reading surface edge cases', () => {
  test('a standalone icon directive renders at a modest, text-height scale', async ({ page }) => {
    await page.goto('/posts/the-reading-surface');
    // The direct-child selector matches only the standalone `:::icon{name="flag"}` in this article,
    // not the alert's, the video facade's, the cta's, or the faq's own nested glyph.
    const glyph = page.locator('.prose > .cairn-icon > .cairn-glyph');
    await expect(glyph).toBeVisible();
    const box = await glyph.boundingBox();
    expect(box).not.toBeNull();
    // A browser-default replaced-element box for this SVG renders on the order of 150-300px; a
    // modest inline glyph at 1.75em reads well under 60px at the article's body size.
    expect(box!.height).toBeLessThan(60);
    expect(box!.height).toBeGreaterThan(16);
  });

  test('the inline primary CTA has a visible background distinct from the page in both themes', async ({
    page,
  }) => {
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme });
      await page.goto('/posts/the-reading-surface');
      const cta = page.getByRole('link', { name: 'Read the getting-started guide' });
      await expect(cta).toBeVisible();
      const [ctaBg, pageBg] = await Promise.all([
        cta.evaluate((el) => getComputedStyle(el).backgroundColor),
        page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor),
      ]);
      expect(ctaBg).not.toBe('rgba(0, 0, 0, 0)');
      expect(ctaBg).not.toBe(pageBg);
    }
  });

  test('wide and full figure images carry a height cap that crops rather than distorts', async ({
    page,
  }) => {
    await page.goto('/posts/the-reading-surface');
    for (const selector of ['.cairn-place-wide img', '.cairn-place-full img']) {
      const img = page.locator(selector);
      await expect(img).toBeVisible();
      const [maxHeight, objectFit] = await img.evaluate((el) => {
        const style = getComputedStyle(el);
        return [style.maxHeight, style.objectFit];
      });
      expect(maxHeight).not.toBe('none');
      // cover crops to fit the box; it never stretches the image, so the cap cannot distort it.
      expect(objectFit).toBe('cover');
    }
    // The centered figure stays exempt: it is already bounded to a small width for a portrait or a
    // detail shot, and a forced landscape crop there would defeat that shape.
    const centerImg = page.locator('.cairn-place-center img');
    await expect(centerImg).toBeVisible();
    const centerMaxHeight = await centerImg.evaluate((el) => getComputedStyle(el).maxHeight);
    expect(centerMaxHeight).toBe('none');
  });

  test('a long unbroken token wraps inside the prose column instead of vanishing off the edge', async ({
    page,
  }) => {
    await page.goto('/posts/the-reading-surface');
    const prose = page.locator('article.prose');
    await expect(prose).toBeVisible();
    await expect(prose).toHaveCSS('overflow-wrap', 'anywhere');
    // Inject a genuinely long unbroken token, the shape of a long URL a real post might paste in, and
    // confirm the rendered element stays inside the column instead of overflowing past the page's
    // clipped edge (site.css's body { overflow-x: clip }, the full-bleed-figure guard, would
    // otherwise hide any part that overflows).
    const overflowed = await page.evaluate(() => {
      const article = document.querySelector('article.prose')!;
      const p = document.createElement('p');
      p.textContent = 'https://example.com/' + 'a'.repeat(300);
      article.appendChild(p);
      const tokenWidth = p.getBoundingClientRect().width;
      const columnWidth = article.getBoundingClientRect().width;
      p.remove();
      return tokenWidth > columnWidth + 1;
    });
    expect(overflowed).toBe(false);
  });

  test('an expired banner does not serialize its message or expiry into the page markup', async ({
    page,
  }) => {
    await page.goto('/styleguide');
    const html = await page.content();
    // The styleguide's second `:::banner` directive (see +page.server.ts) expired in 2020; its
    // message and date must not reach the DOM in any form, not even an inert data attribute.
    expect(html).not.toContain('Early registration for the spring clinic has closed.');
    expect(html).not.toContain('2020-01-01');
    // The island still mounts, with empty props: hydration still runs Banner.svelte's own re-check,
    // which treats a missing `expires` as expired, so the swap-on-mount behavior is unchanged.
    const islands = page.locator('[data-cairn-island="banner"]');
    await expect(islands).toHaveCount(2);
    await expect(islands.nth(1)).toHaveAttribute('data-cairn-props', '{}');
  });
});
