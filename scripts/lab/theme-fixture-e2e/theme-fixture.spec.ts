import { test, expect, type Page } from '@playwright/test';

// The fixture theme's showcase arm. The harness builds a copy of the showcase with the fixture
// stylesheet in place of Waymark's and serves it; these tests then read what Chromium computes.
// The fixture is deliberately unlike Waymark, so each assertion names a value Waymark does not
// hold, or a cascade path only a theme-independent contract can satisfy.
//
// With THEME_FIXTURE_BUILD_ONLY=1 only the smoke loads run: the pages answer and render, and no
// fixture value is asserted. That is the mode a probe's own theme runs under.

const BUILD_ONLY = process.env.THEME_FIXTURE_BUILD_ONLY === '1';

const HOME = '/';
const ARTICLE = '/posts/the-reading-surface';
const STYLEGUIDE = '/styleguide';

/** The faces Waymark loads, which the fixture must not resolve to. */
const WAYMARK_BODY = 'Source Sans 3 Variable';
const WAYMARK_DISPLAY = 'Figtree Variable';

/** The share of a status fill the engine's ink derivation keeps. */
const INK_SHARE = 50;

/** The hand-set error ink in the fixture's dark block, the scheme its pages open in. */
const HAND_SET_ERROR_INK_DARK = 'oklch(78% 0.13 25)';

/** Finds the styleguide's ink sample that paints a named ink token. */
const INK_LINE = (token: string) =>
  `.sg-ink-line[style*="var(${token})"]`;

/** Reads the first entry of a computed `font-family`, unquoted. */
function firstFamily(value: string): string {
  return value.split(',')[0].trim().replace(/^["']|["']$/g, '');
}

/** Loads a page and waits for its main landmark. */
async function open(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await expect(page.locator('main#main')).toBeVisible();
}

for (const [name, path] of [
  ['home', HOME],
  ['an article', ARTICLE],
  ['the styleguide', STYLEGUIDE],
] as const) {
  test(`smoke: ${name} loads and renders`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const response = await page.goto(path);
    expect(response?.ok()).toBe(true);
    await expect(page.locator('main#main')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test.describe('fixture values', () => {
  test.skip(BUILD_ONLY, 'build-only mode asserts no fixture value');

  test('the corner ladder is square in both schemes', async ({ page }) => {
    await open(page, HOME);
    const read = () =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--radius-box').trim(),
      );
    expect(await read()).toBe('0');
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'cairn'));
    expect(await read()).toBe('0');
  });

  test('the faces are the fixture stacks, not Waymark faces', async ({ page }) => {
    await open(page, HOME);
    const faces = await page.evaluate(() => ({
      body: getComputedStyle(document.body.querySelector('.site-shell')!).fontFamily,
      heading: getComputedStyle(document.querySelector('h1')!).fontFamily,
    }));
    expect(firstFamily(faces.body)).toBe('system-ui');
    expect(firstFamily(faces.heading)).toBe('ui-serif');
    expect(faces.body).not.toContain(WAYMARK_BODY);
    expect(faces.heading).not.toContain(WAYMARK_DISPLAY);
  });

  test('a derived ink equals the literal mix Chromium evaluates beside it', async ({ page }) => {
    await open(page, STYLEGUIDE);
    const result = await page.evaluate(({ share, selector }) => {
      const line = document.querySelector<HTMLElement>(selector)!;
      const style = getComputedStyle(line);
      const fill = style.getPropertyValue('--color-success').trim();
      const base = style.getPropertyValue('--color-base-content').trim();
      const reference = document.createElement('p');
      reference.style.color = `color-mix(in oklab, ${fill} ${share}%, ${base})`;
      line.after(reference);
      return { ink: style.color, reference: getComputedStyle(reference).color, fill };
    }, { share: INK_SHARE, selector: INK_LINE('--cairn-success-ink') });
    expect(result.fill).not.toBe('');
    expect(result.ink).toBe(result.reference);
  });

  test('the hand-set ink is the fixture literal, not a derivation', async ({ page }) => {
    await open(page, STYLEGUIDE);
    const result = await page.evaluate(({ literal, selector }) => {
      const line = document.querySelector<HTMLElement>(selector)!;
      const reference = document.createElement('p');
      reference.style.color = literal;
      line.after(reference);
      return { ink: getComputedStyle(line).color, reference: getComputedStyle(reference).color };
    }, { literal: HAND_SET_ERROR_INK_DARK, selector: INK_LINE('--cairn-error-ink') });
    expect(result.ink).toBe(result.reference);
  });

  test('the custom token reaches the element its rule styles', async ({ page }) => {
    await open(page, HOME);
    const read = await page.evaluate(() => ({
      token: getComputedStyle(document.documentElement).getPropertyValue('--fixture-header-rule').trim(),
      width: getComputedStyle(document.querySelector('.site-header')!).borderBottomWidth,
    }));
    expect(read.token).toBe('4px');
    expect(read.width).toBe('4px');
  });

  test('a derived ink recomputes inside a nested data-theme region', async ({ page }) => {
    await open(page, STYLEGUIDE);
    const result = await page.evaluate((selector) => {
      const line = document.querySelector<HTMLElement>(selector)!;
      const outside = getComputedStyle(line).color;
      const region = document.createElement('div');
      region.setAttribute('data-theme', 'cairn');
      const inner = line.cloneNode(true) as HTMLElement;
      region.append(inner);
      document.body.append(region);
      const inside = getComputedStyle(inner).color;
      document.documentElement.setAttribute('data-theme', 'cairn');
      const onRoot = getComputedStyle(line).color;
      return { outside, inside, onRoot };
    }, INK_LINE('--cairn-success-ink'));
    expect(result.inside).not.toBe(result.outside);
    expect(result.inside).toBe(result.onRoot);
  });

  test('the toggle offers light mode under a light OS and its first click flips the scheme', async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(HOME);
    const scheme = () =>
      page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
    await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible();
    const before = await scheme();
    expect(before).toBe('dark');
    await page.getByRole('button', { name: 'Switch to light mode' }).click();
    await expect.poll(scheme).toBe('light');
    await expect(page.getByRole('button', { name: 'Switch to dark mode' })).toBeVisible();
  });

  test('a prose h2, the home lead title, and a styleguide heading are weight 800 and uppercase', async ({
    page,
  }) => {
    const read = (selector: string) =>
      page.evaluate((sel) => {
        const style = getComputedStyle(document.querySelector(sel)!);
        return { weight: style.fontWeight, transform: style.textTransform };
      }, selector);
    await open(page, ARTICLE);
    expect(await read('.prose h2')).toEqual({ weight: '800', transform: 'uppercase' });
    await open(page, HOME);
    expect(await read('.lead__title')).toEqual({ weight: '800', transform: 'uppercase' });
    await open(page, STYLEGUIDE);
    expect(await read('.sg-h2')).toEqual({ weight: '800', transform: 'uppercase' });
  });

  test('the skip link is hidden until focused and fully visible once focused', async ({ page }) => {
    await open(page, STYLEGUIDE);
    const skip = page.locator('a.skip-link');
    const hidden = await skip.boundingBox();
    expect(hidden!.width).toBeLessThanOrEqual(1);
    expect(hidden!.height).toBeLessThanOrEqual(1);
    await page.keyboard.press('Tab');
    await expect(skip).toBeFocused();
    const shown = await skip.boundingBox();
    expect(shown!.width).toBeGreaterThan(40);
    expect(shown!.height).toBeGreaterThan(16);
    await expect(skip).toHaveCSS('position', 'absolute');
  });

  test('a tag pill and a focused entry link compute a square corner', async ({ page }) => {
    await open(page, HOME);
    const pill = page.locator('.tag-filter__option').first();
    await expect(pill).toBeVisible();
    await expect(pill).toHaveCSS('border-radius', '0px');
    await page.keyboard.press('Shift');
    const link = page.locator('.site-entry__title a').first();
    await link.focus();
    await expect(link).toBeFocused();
    await expect(link).toHaveCSS('border-radius', '0px');
  });
});
