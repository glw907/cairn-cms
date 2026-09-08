import { test, expect, type Page } from '@playwright/test';

// The reading-surface article carries several real (network-fetched) images: a hero and three figure
// placements. toHaveScreenshot's own stability poll can time out while one is still decoding, since a
// late image swap keeps shifting the page between polls. Waiting for every <img> to report `complete`
// first removes that source of flake instead of papering over it with a longer timeout.
async function waitForImagesToLoad(page: Page): Promise<void> {
  await page.waitForFunction(() =>
    Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0),
  );
}

// The five-viewport responsive bar (the family-wide standard: 320, 390, 768, 1440, 2560), in both
// color schemes, over the three surfaces that stand in for the whole public (site) template: the
// home page (the chrome: masthead, nav, footer, and the lead CTA), the reading-surface article (the
// richest content page: figures, a table, a pull-quote), and the styleguide (the template's analog
// of the admin's live-components bar, showing every token, the type scale and the component set).
// Both schemes are captured because the dark theme is a separate token set, not a filter over the
// light one, and the narrow/mid widths catch the masthead's flex-wrap and any icon-row recomposition
// that the default 1280px project viewport never renders. Expressed as one matrix, not thirty
// hand-written tests, so a future surface or width joins by extending an array, not by hand-copying
// a test body.
const VIEWPORT_WIDTHS = [320, 390, 768, 1440, 2560];
const COLOR_SCHEMES = ['light', 'dark'] as const;

for (const colorScheme of COLOR_SCHEMES) {
  for (const width of VIEWPORT_WIDTHS) {
    test(`site home — ${colorScheme} — ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.emulateMedia({ colorScheme });
      await page.goto('/');
      await expect(page).toHaveScreenshot(`site-home-${colorScheme}-${width}.png`, {
        fullPage: true,
      });
    });

    test(`reading-surface article — ${colorScheme} — ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.emulateMedia({ colorScheme });
      await page.goto('/posts/the-reading-surface');
      await expect(
        page.getByRole('heading', { level: 1, name: 'The reading surface' }),
      ).toBeVisible();
      await waitForImagesToLoad(page);
      await expect(page).toHaveScreenshot(`site-article-${colorScheme}-${width}.png`, {
        fullPage: true,
        timeout: 20000,
      });
    });

    test(`styleguide — ${colorScheme} — ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.emulateMedia({ colorScheme });
      await page.goto('/styleguide');
      // The masthead heading anchors the page; wait for it so the screenshot captures the settled DOM.
      await expect(page.getByRole('heading', { level: 1, name: 'Styleguide' })).toBeVisible();
      await expect(page).toHaveScreenshot(`styleguide-${colorScheme}-${width}.png`, {
        fullPage: true,
      });
    });

    test(`error404 — ${colorScheme} — ${width}px`, async ({ page }) => {
      // An unmatched path: the root +error.svelte renders full SSR with the site's own nav and
      // footer, status 404. This IS the surface under test, not a navigation failure, so the
      // response status is left unchecked and the screenshot captures the rendered error page.
      await page.setViewportSize({ width, height: 800 });
      await page.emulateMedia({ colorScheme });
      await page.goto('/this-surface-does-not-exist');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page).toHaveScreenshot(`error404-${colorScheme}-${width}.png`, {
        fullPage: true,
      });
    });
  }
}

// The clamp-slope check, beyond the five-viewport bar. The root clamp is a continuous `vw`
// interpolation between 1440px (flat 1rem, the same as 320px and the bar's own 1440 baseline) and
// ~2200px (flat ~1.125rem, the same as 2560px), so the bar's own widths alone only prove the clamp's
// floor and its cap, never the slope between them. A 1920px baseline sits inside that active range,
// where a formula regression (a changed intercept or slope) would move every rem-sized measure and
// line break on the page while still leaving every bar baseline unchanged. The article, not home,
// gets this baseline: its long paragraphs re-wrap visibly on a font-size drift, a sharper signal
// than the home page's cards.
test('reading-surface article — light — 1920px (mid, active clamp slope)', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 800 });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/posts/the-reading-surface');
  await expect(page.getByRole('heading', { level: 1, name: 'The reading surface' })).toBeVisible();
  await waitForImagesToLoad(page);
  await expect(page).toHaveScreenshot('site-article-light-1920.png', {
    fullPage: true,
    timeout: 20000,
  });
});

// Two Waymark-audit findings asserted as computed-style/geometry checks rather than screenshots,
// since neither is a pixel-identity question: the footer's PIN (a layout invariant that must hold
// across every short page's varying content length, not just one snapshot) and the focus ring's
// PRESENCE (a style-computation question a screenshot cannot assert on directly, since it hinges on
// `:focus-visible`, not paint).

// About is a short page (a static content page with no long-running archive below it), so its
// document height is well under the viewport; the (site) layout's chrome wrapper must therefore
// grow to fill the remaining space and pin the footer at the viewport bottom instead of leaving its
// own background exposed below the footer as a seam.
test('a short page pins the footer with no background seam below it', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/about');
  const footer = page.locator('footer.site-footer');
  await expect(footer).toBeVisible();
  const { footerBottom, documentBottom } = await page.evaluate(() => {
    const rect = document.querySelector('footer.site-footer')!.getBoundingClientRect();
    return {
      footerBottom: window.scrollY + rect.bottom,
      documentBottom: document.documentElement.scrollHeight,
    };
  });
  // A one-pixel tolerance covers sub-pixel layout rounding; anything more is a real gap.
  expect(Math.abs(documentBottom - footerBottom)).toBeLessThanOrEqual(1);
});

// The alert directive's inner classes are inlined at this site's own call site
// (`markdown-components.ts`/`render.ts`'s `headRow`), not built by an engine helper, so nothing
// but the theme's own code enforces that the inlined literals stay `cairn-alert-body`/
// `cairn-head-title` rather than drifting back to DaisyUI's own `card-body`/`card-title` names.
// This asserts the inlined shape directly against the rendered DOM, not against source text.
test('the rendered alert carries its own inlined classes, not DaisyUI card classes', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/posts/the-reading-surface');
  const alertBody = page.locator('.prose .alert > .cairn-alert-body');
  await expect(alertBody).toBeVisible();
  const headTitle = page.locator('.prose .alert .cairn-head-title');
  await expect(headTitle).toBeVisible();
  // Built by concatenation, not as bare `card-body`/`card-title` literals: this e2e directory is
  // inside the Tailwind class scan root, so a literal string here would itself be a candidate
  // class the collision guard above exists to catch.
  const cardBody = 'card' + '-body';
  const cardTitle = 'card' + '-title';
  const strayCardClasses = await page.$$eval(
    '.prose .alert *',
    (elements, [body, title]) =>
      elements.filter((el) => el.classList.contains(body) || el.classList.contains(title)).length,
    [cardBody, cardTitle],
  );
  expect(strayCardClasses).toBe(0);
});

// The one focus ring, proved by real keyboard traversal rather than a programmatic .focus()
// call on one hand-picked link. Three Tab presses land on a `.site-nav` link on every one of
// these three pages (the skip link and the wordmark precede it in the tab order, chrome the
// chassis-B Task 5 sweep does not ring), so the loop reaches a real ringed control the same
// way on home, article, and styleguide and asserts against the token's own resolved value
// rather than a hard-coded number, so a theme that retunes the offset keeps this test honest.
for (const { label, path } of [
  { label: 'home', path: '/' },
  { label: 'reading-surface article', path: '/posts/the-reading-surface' },
  { label: 'styleguide', path: '/styleguide' },
]) {
  test(`${label} — the focus ring reads the chassis token after three Tab presses`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(path);
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Tab');
    }
    const { outlineStyle, outlineOffset, tokenOffset } = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const style = getComputedStyle(el);
      const tokenOffset = getComputedStyle(document.documentElement)
        .getPropertyValue('--cairn-focus-ring-offset')
        .trim();
      return { outlineStyle: style.outlineStyle, outlineOffset: style.outlineOffset, tokenOffset };
    });
    expect(outlineStyle).not.toBe('none');
    expect(outlineOffset).toBe(tokenOffset);
  });
}
