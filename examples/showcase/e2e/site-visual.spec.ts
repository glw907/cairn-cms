import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';
import {
  buildHomeCopy,
  HOME_GOLDEN_FILE,
  HOME_TITLE,
  normalizeBuildNoise,
  removeCopy,
} from './home-fixture.js';

// The reading-surface article carries several real (network-fetched) images: a hero and three figure
// placements. toHaveScreenshot's stability poll can time out while one is still decoding, since a
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

    test(`archive page 2 — ${colorScheme} — ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.emulateMedia({ colorScheme });
      await page.goto('/archive/2');
      await expect(page.getByRole('heading', { level: 2, name: '2025' })).toBeVisible();
      await expect(page).toHaveScreenshot(`archive2-${colorScheme}-${width}.png`, {
        fullPage: true,
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
      // An unmatched path: the root +error.svelte renders full SSR with the site's nav and
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
// interpolation between 1440px (flat 1rem, the same as 320px and the bar's 1440 baseline) and
// ~2200px (flat ~1.125rem, the same as 2560px), so the bar's widths alone only prove the clamp's
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
// background exposed below the footer as a seam.
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

// The alert directive's inner classes are inlined at this site's call site
// (`chassis/directives/vocabulary.ts`, `render.ts`'s `headRow`), not built by an engine helper, so nothing
// but the theme's code enforces that the inlined literals stay `cairn-alert-body`/
// `cairn-head-title` rather than drifting back to DaisyUI's `card-body`/`card-title` names.
// This asserts the inlined shape directly against the rendered DOM, not against source text.
test('the rendered alert carries its inlined classes, not DaisyUI card classes', async ({
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
// way on home, article, and styleguide and asserts against the token's resolved value
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

// A page whose id is `home` turns `/` into that page. These tests build template copies with the
// content each one needs and read the prerendered output, so the showcase's own content and its
// baselines never change. The golden is the base's `/` with no `home` page, captured before the
// home routes existed, so a site without that page keeps the post list it had.
test.describe('home page copies', () => {
  test.describe.configure({ mode: 'serial' });
  const OPENING = 'Opening part.';
  const CLOSING = 'Closing part.';
  const NO_RULE = 'A body with no rule line.';
  const ORIGIN = 'https://showcase.test';
  let noHome: string | undefined;
  let withRule: string | undefined;
  let noRuleNoPosts: string | undefined;
  let noRule: string | undefined;
  let baseRoutes: string | undefined;

  // Copies share the showcase's `node_modules`, so they build one after another.
  test.beforeAll(async () => {
    test.setTimeout(300_000);
    noHome = await buildHomeCopy();
    withRule = await buildHomeCopy({ home: `${OPENING}\n\n---\n\n${CLOSING}` });
    noRuleNoPosts = await buildHomeCopy({ home: NO_RULE, posts: false });
    noRule = await buildHomeCopy({ home: NO_RULE });
    baseRoutes = await buildHomeCopy({ baseRoutes: true });
  });

  test.afterAll(async () => {
    for (const output of [noHome, withRule, noRuleNoPosts, noRule, baseRoutes]) {
      if (output) await removeCopy(output);
    }
  });

  /** Loads a built page into the test page, without its scripts and stylesheets. */
  async function load(page: Page, output: string | undefined, file: string): Promise<void> {
    const html = await readFile(path.join(output!, file), 'utf8');
    await page.setContent(
      html
        .replace(/<script[\s\S]*?<\/script>/g, '')
        .replace(/<link [^>]*rel="stylesheet"[^>]*>/g, ''),
    );
  }

  /** Reads the `<loc>` addresses of a built sitemap, as paths. */
  async function sitemapPaths(output: string | undefined): Promise<string[]> {
    const xml = await readFile(path.join(output!, 'sitemap.xml'), 'utf8');
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  }

  /** Lists the body's top-level parts in order: each paragraph's text, and `list` for the news list. */
  function bodyOrder(page: Page): Promise<string[]> {
    return page
      .locator('article.prose > p, article.prose > section.news')
      .evaluateAll((els) =>
        els.map((el) => (el.tagName === 'SECTION' ? 'list' : (el.textContent ?? '').trim())),
      );
  }

  test('with no home page, `/` matches the golden and no `archive/1.html` is built', async () => {
    const built = normalizeBuildNoise(await readFile(path.join(noHome!, 'index.html'), 'utf8'));
    // The one named difference: `/` now imports the theme's article view for home mode, so the
    // page links that component's stylesheet, whose rules are scoped to classes `/` never uses.
    const lines = built.split('\n');
    const articleViewCss = lines.filter((line) =>
      /<link href="[^"]*\/ArticleView\.HASH\.css" rel="stylesheet">/.test(line),
    );
    expect(articleViewCss).toHaveLength(1);
    const withoutCss = lines.filter((line) => line !== articleViewCss[0]).join('\n');
    expect(withoutCss).toBe(await readFile(HOME_GOLDEN_FILE, 'utf8'));
    expect(existsSync(path.join(noHome!, 'archive', '1.html'))).toBe(false);
  });

  test('a home page is the `h1` of `/`, and `/archive/1` lists every post newest first', async ({
    page,
  }) => {
    await load(page, withRule, 'index.html');
    await expect(page.locator('h1')).toHaveText(HOME_TITLE);

    expect(existsSync(path.join(withRule!, 'archive', '1.html'))).toBe(true);
    await load(page, withRule, path.join('archive', '1.html'));
    await expect(page.locator('.site-entry__title a')).toHaveText([
      'The fourth report',
      'The third report',
      'The second report',
      'The first report',
    ]);
  });

  test('the home list shows the newest three published posts with dates and the archive link', async ({
    page,
  }) => {
    await load(page, withRule, 'index.html');
    const news = page.locator('section.news');
    await expect(news.getByRole('heading', { level: 2 })).toHaveText('Latest news');
    await expect(news.locator('.site-entry__title a')).toHaveText([
      'The fourth report',
      'The third report',
      'The second report',
    ]);
    await expect(news.locator('.site-entry__date')).toHaveText([
      '4 Oct 2026',
      '3 Oct 2026',
      '2 Oct 2026',
    ]);
    await expect(news.locator('a[href="/archive/1"]')).toHaveCount(1);
    await expect(page.getByText('The unfinished draft')).toHaveCount(0);
    await expect(page.getByText('The first report')).toHaveCount(0);
  });

  test('the home list sits between the two parts of a body with a rule line', async ({ page }) => {
    await load(page, withRule, 'index.html');
    expect(await bodyOrder(page)).toEqual([OPENING, 'list', CLOSING]);
    await expect(page.locator('article.prose hr')).toHaveCount(0);
  });

  test('a body with no rule line has the home list after it', async ({ page }) => {
    await load(page, noRule, 'index.html');
    expect(await bodyOrder(page)).toEqual([NO_RULE, 'list']);
  });

  test('with no posts the home page shows no list, no heading for it, and no archive', async ({
    page,
  }) => {
    await load(page, noRuleNoPosts, 'index.html');
    await expect(page.locator('h1')).toHaveText(HOME_TITLE);
    await expect(page.locator('section.news')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(0);
    await expect(page.locator('a[href="/archive/1"]')).toHaveCount(0);
    expect(await bodyOrder(page)).toEqual([NO_RULE]);
    expect(existsSync(path.join(noRuleNoPosts!, 'archive', '1.html'))).toBe(false);
    expect(await sitemapPaths(noRuleNoPosts)).not.toContain('/archive/1');
  });

  test('`/home` redirects to `/`, `/home.md` is absent, and the sitemap lists `/` once', async ({
    page,
  }) => {
    const redirects = await readFile(path.join(withRule!, '_redirects'), 'utf8');
    expect(redirects.split('\n')).toContain('/home / 308');
    expect(existsSync(path.join(withRule!, 'home.md'))).toBe(false);

    const paths = await sitemapPaths(withRule);
    expect(paths.filter((p) => p === '/')).toHaveLength(1);
    expect(paths.filter((p) => p === '/archive/1')).toHaveLength(1);
    expect(paths).not.toContain('/home');
    expect(paths).not.toContain('/home.md');

    await load(page, withRule, 'index.html');
    const hrefs = await page
      .locator('[href]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('href') ?? ''));
    expect(
      hrefs.filter((href) => /^\/home(\.md|\/)?$/.test(new URL(href, ORIGIN).pathname)),
    ).toEqual([]);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${ORIGIN}/`);
  });

  test('a site on the frozen base routes with Waymark 1.2.0 renders `/` as before', async () => {
    const root = path.resolve(baseRoutes!, '..', '..');
    const theme = JSON.parse(
      await readFile(path.join(root, 'src', 'theme', 'cairn-theme.json'), 'utf8'),
    );
    expect(theme.version).toBe('1.2.0');
    expect(existsSync(path.join(baseRoutes!, 'home.html'))).toBe(false);
    expect(existsSync(path.join(baseRoutes!, 'archive', '1.html'))).toBe(false);
    // Build noise only: the frozen routes import nothing new, so no named difference applies.
    const built = normalizeBuildNoise(await readFile(path.join(baseRoutes!, 'index.html'), 'utf8'));
    expect(built).toBe(await readFile(HOME_GOLDEN_FILE, 'utf8'));
  });
});
