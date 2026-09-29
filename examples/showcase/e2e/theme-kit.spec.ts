import { test, expect, type Page, type Locator } from '@playwright/test';

// The G1 fixture spec: a custom /admin route written only in plain daisyUI classes and cairn's
// role utilities gets the admin's look with no per-element idiom of its own. Every assertion here
// reads the compiled admin sheet through the fixture at examples/showcase/src/routes/admin/theme-kit,
// by the same cairn-admin-theme cookie admin-visual.spec.ts sets, never a hand-typed serialized
// color: a color-mix(...)/var(...) expression is always resolved by painting it on a throwaway
// probe appended inside the element under test (the same oracle discipline
// starter-outline-pin.spec.ts uses for the starter's own pin), so a probe placed inside an alert or
// a button also inherits any custom property that rule sets locally on that element.

type Theme = 'cairn-admin' | 'cairn-admin-dark';

const THEMES: Theme[] = ['cairn-admin', 'cairn-admin-dark'];

/** Sets the theme cookie and the matching prefers-color-scheme, then loads the fixture. */
async function gotoThemed(
  page: Page,
  context: Parameters<Parameters<typeof test>[1]>[0]['context'],
  baseURL: string,
  theme: Theme,
): Promise<void> {
  await context.addCookies([{ name: 'cairn-admin-theme', value: theme, url: baseURL }]);
  await page.emulateMedia({ colorScheme: theme === 'cairn-admin' ? 'light' : 'dark' });
  await page.goto('/admin/theme-kit');
  await expect(page.getByRole('heading', { level: 1, name: 'Theme kit' })).toBeVisible();
}

/**
 * Paints a CSS declaration on a throwaway `<span>` appended INSIDE the given element and reads
 * back its resolved value, so a `color-mix()`/`var()` expression resolves exactly as the browser
 * computes it in that element's own cascade (a custom property a rule sets locally, such as an
 * alert's `--alert-color`, inherits into the probe the same way it reaches the element itself). A
 * replaced form control (`<input>`) has no rendered content model of its own, so the probe goes
 * beside it, as a child of its parent, instead; neither of the two rules this file reads through a
 * form-control input (`--color-neutral`, `--color-base-100`, the 55% checkbox/radio edge mix) is
 * ever set locally on the input itself, only inherited from the theme root, so the parent placement
 * resolves the same value.
 */
async function resolveOn(locator: Locator, prop: string, expr: string): Promise<string> {
  return locator.evaluate(
    (el, args) => {
      const container = el instanceof HTMLInputElement ? el.parentElement! : el;
      const probe = document.createElement('span');
      probe.style.position = 'absolute';
      probe.style.visibility = 'hidden';
      probe.style.setProperty(args.prop, args.expr);
      container.appendChild(probe);
      const resolved = getComputedStyle(probe).getPropertyValue(args.prop);
      probe.remove();
      return resolved;
    },
    { prop, expr },
  );
}

/** The same oracle, read off the element's `::before` pseudo-element instead of the element itself. */
async function computedBefore(locator: Locator, prop: string): Promise<string> {
  return locator.evaluate((el, p) => getComputedStyle(el, '::before').getPropertyValue(p), prop);
}

for (const theme of THEMES) {
  test.describe(`${theme}`, () => {
    test.beforeEach(async ({ page, context, baseURL }) => {
      await gotoThemed(page, context, baseURL!, theme);
    });

    test('radii of 4, 6, and 8px land by role, not by element', async ({ page }) => {
      const cases: { testId: string; px: string }[] = [
        { testId: 'tk-btn-plain', px: '6px' }, // field
        { testId: 'tk-field-input', px: '6px' }, // field
        { testId: 'tk-checkbox-unchecked', px: '4px' }, // selector
        { testId: 'tk-chip', px: '4px' }, // selector
        { testId: 'tk-card', px: '8px' }, // box
        { testId: 'tk-modal-box', px: '8px' }, // box
      ];
      for (const { testId, px } of cases) {
        const el = page.getByTestId(testId);
        await expect.poll(() => el.evaluate((e) => getComputedStyle(e).borderRadius)).toBe(px);
      }
    });

    test('btn-sm is 36px tall with 14px inline padding', async ({ page }) => {
      const small = page.getByTestId('tk-btn-sm');
      await expect.poll(() => small.evaluate((e) => getComputedStyle(e).height)).toBe('36px');
      await expect.poll(() => small.evaluate((e) => getComputedStyle(e).paddingLeft)).toBe('14px');
      await expect.poll(() => small.evaluate((e) => getComputedStyle(e).paddingRight)).toBe('14px');
    });

    test('the plain button is an outlined base-100 fill, not a flat slab', async ({ page }) => {
      const plain = page.getByTestId('tk-btn-plain');
      const fill = await resolveOn(plain, 'background-color', 'var(--color-base-100)');
      const edge = await resolveOn(
        plain,
        'border-color',
        'color-mix(in oklab, var(--color-base-content) 22%, transparent)',
      );
      await expect
        .poll(() => plain.evaluate((e) => getComputedStyle(e).backgroundColor))
        .toBe(fill);
      await expect.poll(() => plain.evaluate((e) => getComputedStyle(e).borderColor)).toBe(edge);
    });

    test('button label weight: 500 plain/ghost, 600 primary and every selected form', async ({
      page,
    }) => {
      const cases: { testId: string; weight: string }[] = [
        { testId: 'tk-btn-plain', weight: '500' },
        { testId: 'tk-btn-ghost', weight: '500' },
        { testId: 'tk-btn-primary', weight: '600' },
        { testId: 'tk-join-ladder-active', weight: '600' },
        { testId: 'tk-join-ladder-current', weight: '600' },
      ];
      for (const { testId, weight } of cases) {
        const el = page.getByTestId(testId);
        await expect.poll(() => el.evaluate((e) => getComputedStyle(e).fontWeight)).toBe(weight);
      }
    });

    test('the aria-current segment and the checked radio segment render as the selected segment', async ({
      page,
    }) => {
      const wash = await resolveOn(
        page.getByTestId('tk-join-ladder-current'),
        'background-color',
        'color-mix(in oklab, var(--color-base-content) 7%, var(--color-base-100))',
      );
      const cases = ['tk-join-ladder-current', 'tk-radio-join-first'];
      for (const testId of cases) {
        const el = page.getByTestId(testId);
        await expect.poll(() => el.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe(wash);
        await expect.poll(() => el.evaluate((e) => getComputedStyle(e).fontWeight)).toBe('600');
      }
    });

    test("the soft primary's rest and hover fills step through the primary tint", async ({
      page,
    }) => {
      const soft = page.getByTestId('tk-btn-soft-primary');
      const rest = await resolveOn(
        soft,
        'background-color',
        'color-mix(in oklab, var(--color-primary) 10%, transparent)',
      );
      await expect.poll(() => soft.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe(rest);

      await soft.hover();
      const hovered = await resolveOn(
        soft,
        'background-color',
        'color-mix(in oklab, var(--color-primary) 15%, transparent)',
      );
      await expect
        .poll(() => soft.evaluate((e) => getComputedStyle(e).backgroundColor))
        .toBe(hovered);
    });

    // S3 Q17: the rest rule's hover/focus-visible step split into its own :focus-visible copy
    // (unconditional) and a :hover copy gated on @media (hover: hover), so a keyboard-only reader
    // on a device that reports no hover capability still gets the step. Tabbing in from a
    // preceding element, never a mouse move, is what makes Chromium treat this as :focus-visible
    // for a <button>, which a bare .focus() call does not reliably do.
    test('the soft primary steps on keyboard focus with no pointer ever moved', async ({
      page,
    }) => {
      const soft = page.getByTestId('tk-btn-soft-primary');
      await page.getByTestId('tk-btn-primary').focus();
      await page.keyboard.press('Tab');
      await expect.poll(() => soft.evaluate((e) => e === document.activeElement)).toBe(true);
      const focused = await resolveOn(
        soft,
        'background-color',
        'color-mix(in oklab, var(--color-primary) 15%, transparent)',
      );
      await expect
        .poll(() => soft.evaluate((e) => getComputedStyle(e).backgroundColor))
        .toBe(focused);
    });

    test("the switch's checked track and knob, and every switch's round knob", async ({ page }) => {
      const checked = page.getByTestId('tk-switch-checked');
      const track = await resolveOn(checked, 'background-color', 'var(--color-neutral)');
      const knob = await resolveOn(checked, 'background-color', 'var(--color-base-100)');
      await expect
        .poll(() => checked.evaluate((e) => getComputedStyle(e).backgroundColor))
        .toBe(track);
      await expect.poll(() => computedBefore(checked, 'background-color')).toBe(knob);

      for (const testId of ['tk-switch-checked', 'tk-switch-unchecked', 'tk-toggle-primary']) {
        const el = page.getByTestId(testId);
        await expect
          .poll(() => el.evaluate((e) => getComputedStyle(e).borderRadius))
          .toBe('9999px');
        await expect.poll(() => computedBefore(el, 'border-radius')).toBe('9999px');
      }
    });

    test('toggle-primary keeps its own color, unaffected by the neutral-fill idiom', async ({
      page,
    }) => {
      const primary = page.getByTestId('tk-toggle-primary');
      const neutralTrack = await resolveOn(primary, 'background-color', 'var(--color-neutral)');
      const base100Knob = await resolveOn(primary, 'background-color', 'var(--color-base-100)');
      await expect
        .poll(() => primary.evaluate((e) => getComputedStyle(e).backgroundColor))
        .not.toBe(neutralTrack);
      await expect.poll(() => computedBefore(primary, 'background-color')).not.toBe(base100Knob);
    });

    test('the unchecked checkbox and radio edges clear the 55% mix', async ({ page }) => {
      const edge = await resolveOn(
        page.getByTestId('tk-checkbox-unchecked'),
        'border-color',
        'color-mix(in oklab, var(--color-base-content) 55%, transparent)',
      );
      for (const testId of ['tk-checkbox-unchecked', 'tk-radio-unchecked']) {
        const el = page.getByTestId(testId);
        await expect.poll(() => el.evaluate((e) => getComputedStyle(e).borderColor)).toBe(edge);
      }
    });

    test("the modal box carries the theme's warm shadow, not daisyUI's flat black", async ({
      page,
    }) => {
      const modal = page.getByTestId('tk-modal-box');
      const warm = await resolveOn(modal, 'box-shadow', 'var(--cairn-shadow)');
      await expect.poll(() => modal.evaluate((e) => getComputedStyle(e).boxShadow)).toBe(warm);
    });

    // daisyUI's own `.modal-box` is `opacity: 0; scale: .95` at rest, visible only
    // as a `.modal[open] > .modal-box`/`.modal.modal-open > .modal-box` child. The fixture renders
    // the box standalone (proving the warm shadow, not a full modal), so it carries its own
    // `opacity-100 scale-100` to stay visible; the shadow test above already proved the computed
    // box-shadow, invisible until this fix, since a computed style reads regardless of opacity.
    test("the statically open modal box renders visible, not hidden at daisyUI's rest opacity", async ({
      page,
    }) => {
      const modal = page.getByTestId('tk-modal-box');
      await expect.poll(() => modal.evaluate((e) => getComputedStyle(e).opacity)).toBe('1');
      await expect.poll(() => modal.evaluate((e) => getComputedStyle(e).scale)).toBe('1');
    });

    test('each alert renders its own panel and ink, and a bare alert stays untouched', async ({
      page,
    }) => {
      const cases: { testId: string; bg: string; border: string; ink: string }[] = [
        {
          testId: 'tk-alert-error',
          bg: 'var(--cairn-error-tint)',
          border: 'var(--cairn-error-border)',
          ink: 'var(--cairn-error-ink)',
        },
        {
          testId: 'tk-alert-warning',
          bg: 'color-mix(in oklab, var(--color-warning) 12%, var(--color-base-100))',
          border: 'color-mix(in oklab, var(--color-warning) 45%, var(--color-base-100))',
          ink: 'var(--cairn-warning-ink)',
        },
        {
          testId: 'tk-alert-success',
          bg: `color-mix(in oklab, var(--color-success) ${theme === 'cairn-admin' ? '7%' : '12%'}, var(--color-base-100))`,
          border: 'color-mix(in oklab, var(--color-success) 30%, var(--color-base-100))',
          ink: 'var(--color-positive-ink)',
        },
        {
          testId: 'tk-alert-info',
          bg: `color-mix(in oklab, var(--color-info) ${theme === 'cairn-admin' ? '7%' : '12%'}, var(--color-base-100))`,
          border: 'color-mix(in oklab, var(--color-info) 30%, var(--color-base-100))',
          ink: 'var(--cairn-info-ink)',
        },
      ];
      for (const { testId, bg, border, ink } of cases) {
        const el = page.getByTestId(testId);
        const panel = await resolveOn(el, 'background-color', bg);
        const edge = await resolveOn(el, 'border-color', border);
        const text = await resolveOn(el, 'color', ink);
        await expect
          .poll(() => el.evaluate((e) => getComputedStyle(e).backgroundColor))
          .toBe(panel);
        await expect.poll(() => el.evaluate((e) => getComputedStyle(e).borderColor)).toBe(edge);
        await expect.poll(() => el.evaluate((e) => getComputedStyle(e).color)).toBe(text);
      }

      // The bare alert carries none of the four variant classes, so it never matches any panel
      // rule's selector; its fill must differ from the error panel above, or the exclusion is
      // not narrow enough.
      const bare = page.getByTestId('tk-alert-bare');
      const errorPanel = await resolveOn(bare, 'background-color', 'var(--cairn-error-tint)');
      await expect
        .poll(() => bare.evaluate((e) => getComputedStyle(e).backgroundColor))
        .not.toBe(errorPanel);
    });

    test("the dropdown item's radius is concentric with the padded panel", async ({ page }) => {
      const item = page.getByTestId('tk-dropdown-item');
      await expect.poll(() => item.evaluate((e) => getComputedStyle(e).borderRadius)).toBe('4px');
    });

    // S3 Q6: the dropdown panel carries no box-shadow utility of its own (removed from this
    // fixture's markup), so a bare `.dropdown-content.menu` must supply the theme's own warm
    // elevation, the same var the modal box reads, in place of no shadow at all.
    test('the dropdown panel carries the warm elevation vocabulary', async ({ page }) => {
      const content = page.getByTestId('tk-dropdown-content');
      const warm = await resolveOn(content, 'box-shadow', 'var(--cairn-shadow)');
      await expect.poll(() => content.evaluate((e) => getComputedStyle(e).boxShadow)).toBe(warm);
    });

    // S3 Q4: a radio join-item keeps the browser's own UA margin on every edge daisyUI's own
    // `.join-item` rule does not restate (every edge but the leading one), which reopens a seam a
    // button join, whose UA margin is already zero, never shows. The two radios must sit exactly
    // one (negative, overlapping) border apart, the same gap the plain button join keeps.
    test('the radio join fuses with no reopened seam', async ({ page }) => {
      const first = page.getByTestId('tk-radio-join-first');
      const second = page.getByTestId('tk-radio-join-second');
      const firstBox = await first.evaluate((e) => e.getBoundingClientRect());
      const secondBox = await second.evaluate((e) => e.getBoundingClientRect());
      const border = await first.evaluate((e) => parseFloat(getComputedStyle(e).borderRightWidth));
      // The second radio's left edge sits exactly one border-width inside the first radio's own
      // right edge (the join's own -1px overlap); a reopened UA-margin seam would land it several
      // pixels further right instead.
      await expect
        .poll(() => secondBox.left - (firstBox.left + firstBox.width))
        .toBeCloseTo(-border, 0);
    });

    // S3 Q5: an uncolored selected outline/dash button used to fall through to daisyUI's own
    // `--color-base-200` + 5% black mix, a wash that reads opposite directions across the two
    // themes (a pale step in light, a near-black hole in dark). It now takes the identical
    // warm-tinted neutral wash the plain selected button already carries, one direction in both
    // themes.
    test('the selected outline takes the same neutral wash as the plain selected button', async ({
      page,
    }) => {
      const outlineActive = page.getByTestId('tk-btn-outline-active');
      const plainSelected = page.getByTestId('tk-join-ladder-active');
      const wash = await resolveOn(
        outlineActive,
        'background-color',
        'color-mix(in oklab, var(--color-base-content) 7%, var(--color-base-100))',
      );
      await expect
        .poll(() => outlineActive.evaluate((e) => getComputedStyle(e).backgroundColor))
        .toBe(wash);
      await expect
        .poll(() => plainSelected.evaluate((e) => getComputedStyle(e).backgroundColor))
        .toBe(wash);
    });
  });
}

// S3 Q19: the fixture is the page developers are pointed at as the plain-daisyUI idiom proof, so
// its own a11y gaps (a missing document title, unnamed sections, a forced-open dropdown trigger
// with no aria-expanded) are fixed on the page itself.
test('the fixture page is titled, its sections are named, and its dropdown trigger states its own expanded state', async ({
  page,
  context,
  baseURL,
}) => {
  await gotoThemed(page, context, baseURL!, 'cairn-admin');
  await expect(page).toHaveTitle('Theme kit');
  for (const name of ['Buttons and joins', 'Alerts', 'Controls', 'Chip, field, and card']) {
    await expect(page.getByRole('region', { name })).toBeVisible();
  }
  await expect(page.getByTestId('tk-dropdown-trigger')).toHaveAttribute('aria-expanded', 'true');
});

test('the rendered admin nav carries no link to the fixture screen', async ({ page }) => {
  await page.goto('/admin/posts');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('a[href="/admin/theme-kit"]')).toHaveCount(0);
  await expect(
    page
      .getByRole('navigation', { name: 'Site content' })
      .getByRole('link', { name: /theme.kit/i }),
  ).toHaveCount(0);
});

// Review focus 2: a hostile host stylesheet, and the public showcase's own compiled sheet, each
// injected once before and once after the admin sheet in the page's own <head>. Neither order may
// move the plain button, btn-sm's height, or the three radii; the two outline buttons are recorded
// in each order, since rule 11 (the selected-outline ink repair) is the one property a losing layer
// order could plausibly take from a host's own site-theme sublayer.
const HOSTILE_CSS =
  'div { font-family: Georgia; -webkit-font-smoothing: auto; scrollbar-width: auto; color-scheme: dark }';

/** Finds the `<link rel="stylesheet">` whose fetched text carries the admin sheet's own fingerprint. */
async function findAdminStylesheetHref(page: Page): Promise<string> {
  const hrefs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(
      (l) => (l as HTMLLinkElement).href,
    ),
  );
  for (const href of hrefs) {
    const res = await page.request.get(href);
    if ((await res.text()).includes('--radius-selector')) return href;
  }
  throw new Error('admin stylesheet link not found in <head>');
}

/**
 * Fetches every stylesheet the public homepage links, concatenated into one CSS text blob.
 *
 * The served HTML is parsed as a document, never matched with a regex, because the attribute order
 * differs by source: the showcase's own head writes `rel` before `href`, while SvelteKit emits its
 * route stylesheets as `href` before `rel`. The list must be non-empty, or the host-CSS check below
 * would pass without injecting any host CSS at all.
 */
async function fetchHomepageCss(page: Page, baseURL: string): Promise<string> {
  const homeURL = new URL('/', baseURL).toString();
  const html = await (await page.request.get(homeURL)).text();
  const hrefs = await page.evaluate(
    (args) =>
      Array.from(
        new DOMParser()
          .parseFromString(args.html, 'text/html')
          .querySelectorAll('link[rel~="stylesheet"][href]'),
      ).map((l) => new URL(l.getAttribute('href')!, args.homeURL).toString()),
    { html, homeURL },
  );
  expect(hrefs.length).toBeGreaterThan(0);
  const texts = await Promise.all(
    hrefs.map(async (href) => {
      const res = await page.request.get(href);
      expect(res.ok(), href).toBe(true);
      return res.text();
    }),
  );
  return texts.join('\n');
}

/** Inserts a `<style>` element immediately before or after the admin sheet's own `<link>`. */
async function injectAroundAdminSheet(
  page: Page,
  adminHref: string,
  css: string,
  order: 'before' | 'after',
): Promise<void> {
  await page.evaluate(
    (args) => {
      // The DOM link's own href PROPERTY is the browser-resolved absolute URL (what
      // findAdminStylesheetHref read), while its href ATTRIBUTE is whatever relative or absolute
      // string the page shipped; comparing the resolved property is what makes the two agree
      // regardless of which form the markup used.
      const admin = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find(
        (l) => (l as HTMLLinkElement).href === args.adminHref,
      );
      if (!admin || !admin.parentNode) throw new Error('admin stylesheet link vanished');
      const style = document.createElement('style');
      style.textContent = args.css;
      if (args.order === 'before') admin.parentNode.insertBefore(style, admin);
      else admin.parentNode.insertBefore(style, admin.nextSibling);
    },
    { adminHref, css, order },
  );
}

for (const order of ['before', 'after'] as const) {
  test(`review focus 2: host CSS injected ${order} the admin sheet leaves the plain button, btn-sm, and the radii unmoved`, async ({
    page,
    context,
    baseURL,
  }) => {
    await gotoThemed(page, context, baseURL!, 'cairn-admin');
    const adminHref = await findAdminStylesheetHref(page);
    const homepageCss = await fetchHomepageCss(page, baseURL!);
    await injectAroundAdminSheet(page, adminHref, homepageCss, order);
    await injectAroundAdminSheet(page, adminHref, HOSTILE_CSS, order);

    const plain = page.getByTestId('tk-btn-plain');
    const fill = await resolveOn(plain, 'background-color', 'var(--color-base-100)');
    const edge = await resolveOn(
      plain,
      'border-color',
      'color-mix(in oklab, var(--color-base-content) 22%, transparent)',
    );
    await expect.poll(() => plain.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe(fill);
    await expect.poll(() => plain.evaluate((e) => getComputedStyle(e).borderColor)).toBe(edge);

    const small = page.getByTestId('tk-btn-sm');
    await expect.poll(() => small.evaluate((e) => getComputedStyle(e).height)).toBe('36px');

    const radii: { testId: string; px: string }[] = [
      { testId: 'tk-btn-plain', px: '6px' },
      { testId: 'tk-checkbox-unchecked', px: '4px' },
      { testId: 'tk-card', px: '8px' },
    ];
    for (const { testId, px } of radii) {
      const el = page.getByTestId(testId);
      await expect.poll(() => el.evaluate((e) => getComputedStyle(e).borderRadius)).toBe(px);
    }

    // Both outline buttons keep the base-content ink in this order, which for the selected one is
    // the outline ink repair holding against the host sheet. The showcase's site-theme sublayer
    // carries an unscoped `.btn-outline` rule, but it sets only `--btn-border`, so it moves these
    // buttons' edges and never their ink. A host sheet with a site-theme rule on `color` could
    // still win the after order; this test does not cover that case.
    for (const testId of ['tk-btn-outline', 'tk-btn-outline-active']) {
      const el = page.getByTestId(testId);
      const ink = await resolveOn(el, 'color', 'var(--color-base-content)');
      await expect.poll(() => el.evaluate((e) => getComputedStyle(e).color)).toBe(ink);
    }
  });
}

// Review focus 3: the ladder join, forced to dir="rtl" at a 320px viewport, must not overflow the
// page, must round its outer corners on the logical start and end (which physically flip sides
// under RTL), and its selected segment must keep its state hairline.
test('review focus 3: the ladder join in RTL at 320px keeps its logical corners, no overflow, and the selected hairline', async ({
  page,
  context,
  baseURL,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await gotoThemed(page, context, baseURL!, 'cairn-admin');

  const join = page.getByTestId('tk-join-ladder');
  await join.evaluate((el) => el.setAttribute('dir', 'rtl'));

  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(320);

  const first = page.getByTestId('tk-join-ladder-plain');
  const last = page.getByTestId('tk-join-ladder-current');
  // The first DOM child sits at the inline start, which RTL renders on the physical right: its
  // outer (start) corners round, its inner (end) corners stay the structural zero.
  await expect
    .poll(() => first.evaluate((e) => getComputedStyle(e).borderTopRightRadius))
    .toBe('6px');
  await expect
    .poll(() => first.evaluate((e) => getComputedStyle(e).borderBottomRightRadius))
    .toBe('6px');
  await expect
    .poll(() => first.evaluate((e) => getComputedStyle(e).borderTopLeftRadius))
    .toBe('0px');
  // The last DOM child sits at the inline end, physically on the left under RTL.
  await expect
    .poll(() => last.evaluate((e) => getComputedStyle(e).borderTopLeftRadius))
    .toBe('6px');
  await expect
    .poll(() => last.evaluate((e) => getComputedStyle(e).borderBottomLeftRadius))
    .toBe('6px');
  await expect
    .poll(() => last.evaluate((e) => getComputedStyle(e).borderTopRightRadius))
    .toBe('0px');

  // The selected segment (aria-current, this join's own middle-free third segment) keeps its
  // state hairline regardless of direction.
  const hairline = await resolveOn(
    last,
    'border-color',
    'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
  );
  await expect.poll(() => last.evaluate((e) => getComputedStyle(e).borderColor)).toBe(hairline);
});

// Fix-round finding: the fixture's own error-alert markup had drifted from ConceptList's fixed
// `max-sm:grid-flow-row max-sm:grid-cols-1` form, so it still rendered the pre-fix crushed column
// at 320. Same shape ConceptList.test.ts already proves for the engine's own banner.
test('the error alert body spans the alert width at 320, not a crushed column', async ({
  page,
  context,
  baseURL,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await gotoThemed(page, context, baseURL!, 'cairn-admin');

  const alert = page.getByTestId('tk-alert-error');
  const body = alert.locator('p').nth(1);
  const alertBox = await alert.boundingBox();
  const bodyBox = await body.boundingBox();
  expect(alertBox).not.toBeNull();
  expect(bodyBox).not.toBeNull();
  expect(bodyBox!.width).toBeGreaterThan(alertBox!.width * 0.75);
});
