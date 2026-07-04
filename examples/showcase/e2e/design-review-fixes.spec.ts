import { test, expect } from '@playwright/test';

// Five bugs the Wayfinder design review found on the reading-surface article and the styleguide's
// banner demo, each reproducible without any special setup:
//   1. a standalone `:::icon` directive fell back to the browser's default SVG box (about 280px),
//      because prose.css sized `.ec-glyph` only inside a nested component (alert, video-facade,
//      cta-link, faq-marker), never a bare top-level icon.
//   2. the inline CTA's `.cta-primary` reused the panel-button token pair (`--cairn-cta-btn-*`),
//      which resolves to the page's own paper color in the light theme, so the button vanished; it
//      only read fine in dark mode because that pair happens to resolve to the accent there.
//   3. a hero/wide/full figure image carried no height cap, so an extreme-ratio photo could blow the
//      column height out.
//   4. `.prose` had no `overflow-wrap`, so a long unbroken token (a bare URL) overflowed its
//      container; the body's `overflow-x: clip` (the full-bleed-figure guard) then hid the overflow
//      instead of showing a scrollbar, silently swallowing the token.
//   5. a hydrate component always serialized its full attributes into `data-cairn-props`, even once
//      build() had already decided the banner is permanently expired, leaking the message and date
//      into the static markup.
test.describe('Wayfinder design-review fixes', () => {
  test('a standalone icon directive renders at a modest, text-height scale', async ({ page }) => {
    await page.goto('/posts/the-reading-surface');
    // The direct-child selector matches only the standalone `:::icon{name="flag"}` in this article,
    // not the alert's, the video facade's, the cta's, or the faq's own nested glyph.
    const glyph = page.locator('.prose > .ec-icon > .ec-glyph');
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
