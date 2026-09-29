import { test, expect, type Page, type Locator } from '@playwright/test';

// The proof spec: every contrast row cairn's theme identity work commits to, measured against
// the G1 fixture in a real browser rather than asserted from a design comment. Each pair is
// painted onto a throwaway canvas and read back as sRGB, mirroring cairn-audit's own color
// normalizer (src/lib/audit/rendered/page-surface.ts's resolveColorsInPage): a computed color
// property can serialize as `color-mix(...)`/`oklch(...)` rather than `rgb()`, which no
// hand-rolled parser reads reliably, and this file, under examples/showcase, has no access to the
// engine's own internal audit module to import it from. A translucent color composites onto its named ground
// before the WCAG ratio is measured; an already-opaque color composites onto itself, a no-op.

type Theme = 'cairn-admin' | 'cairn-admin-dark';

const THEMES: Theme[] = ['cairn-admin', 'cairn-admin-dark'];

/**
 * How long the hover/active step test waits after triggering a state before reading it back.
 * daisyUI's own `.btn` carries a 0.2s transition on `background-color`, and an immediate read
 * catches an interpolated mid-transition value indistinguishable from rest.
 */
const SETTLE_MS = 300;

/** A color already normalized to sRGB bytes, alpha in 0..1. */
interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

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
 * Paints each raw CSS color string over opaque white and over opaque black on a 1x1 canvas, and
 * recovers the sRGB bytes plus alpha from the difference between the two reads: the same
 * technique cairn-audit's rendered rules use to normalize a color the browser itself serializes
 * in whatever functional notation it chooses. A string the browser refuses to paint resolves to
 * null, reported rather than treated as a pass.
 */
async function paintColors(page: Page, colors: string[]): Promise<(Rgba | null)[]> {
  const unique = [...new Set(colors)];
  const resolved = await page.evaluate((raws: string[]) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return raws.map(() => null);
    const paintOver = (backdrop: string, color: string): number[] => {
      ctx.globalCompositeOperation = 'copy';
      ctx.fillStyle = backdrop;
      ctx.fillRect(0, 0, 1, 1);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      return Array.from(ctx.getImageData(0, 0, 1, 1).data);
    };
    return raws.map((raw) => {
      if (!raw) return null;
      // Two sentinel paints tell "the browser refused this string" from "this string really is
      // black or white": fillStyle silently keeps its prior value on an invalid assignment.
      ctx.fillStyle = '#000000';
      ctx.fillStyle = raw;
      const asBlack = ctx.fillStyle;
      ctx.fillStyle = '#ffffff';
      ctx.fillStyle = raw;
      const asWhite = ctx.fillStyle;
      if (asBlack === '#000000' && asWhite === '#ffffff') return null;

      const overWhite = paintOver('#ffffff', raw);
      const overBlack = paintOver('#000000', raw);
      let alpha = 0;
      for (let i = 0; i < 3; i += 1) alpha += 1 - (overWhite[i] - overBlack[i]) / 255;
      alpha = Math.min(1, Math.max(0, alpha / 3));
      if (alpha <= 0) return [0, 0, 0, 0];
      const channel = (value: number) => Math.min(255, Math.max(0, value / alpha));
      return [channel(overBlack[0]), channel(overBlack[1]), channel(overBlack[2]), alpha];
    });
  }, unique);
  const byInput = new Map(unique.map((color, index) => [color, resolved[index]]));
  return colors.map((color) => {
    const entry = byInput.get(color);
    return entry ? { r: entry[0], g: entry[1], b: entry[2], a: entry[3] } : null;
  });
}

/** Alpha-composites `fg` over `bg`. */
function composite(fg: Rgba, bg: Rgba): Rgba {
  const a = fg.a + bg.a * (1 - fg.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a,
    g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a,
    b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a,
    a,
  };
}

/** WCAG 2.x relative luminance. */
function relativeLuminance(c: Rgba): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

/** WCAG 2.x contrast ratio, order-independent. */
function contrastRatio(a: Rgba, b: Rgba): number {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

/**
 * The WCAG contrast ratio between two named colors, each independently alpha-composited onto
 * `ground` first. Every row of the pair table this spec proves reduces to this same shape:
 * neither side ever paints onto the other, only onto a shared backdrop, and compositing an
 * already-opaque color onto anything is a no-op.
 */
async function contrastOnGround(page: Page, a: string, b: string, ground: string): Promise<number> {
  const [colorA, colorB, colorGround] = await paintColors(page, [a, b, ground]);
  if (!colorA || !colorB || !colorGround) {
    throw new Error(`could not resolve a color among: ${a} | ${b} | ${ground}`);
  }
  const opaqueA = colorA.a >= 0.999 ? colorA : composite(colorA, colorGround);
  const opaqueB = colorB.a >= 0.999 ? colorB : composite(colorB, colorGround);
  return contrastRatio(opaqueA, opaqueB);
}

/** The computed value of a color property, read off `locator`'s own box or a named pseudo-element. */
async function styleOf(
  locator: Locator,
  prop: 'color' | 'backgroundColor' | 'borderColor' | 'outlineColor' | 'boxShadow',
  pseudo?: '::before',
): Promise<string> {
  return locator.evaluate(
    (el, args) =>
      (getComputedStyle(el, args.pseudo ?? null) as unknown as Record<string, string>)[args.prop],
    { prop, pseudo },
  );
}

/** A theme root custom property's own declared value, read off the page's `[data-theme]` wrapper. */
async function themeVar(page: Page, name: string): Promise<string> {
  return page
    .locator('[data-theme]')
    .first()
    .evaluate((el, n) => getComputedStyle(el).getPropertyValue(n).trim(), name);
}

/** Focuses `locator` and confirms the browser treats it as keyboard focus, not merely focus. */
async function focusVisible(locator: Locator): Promise<void> {
  await locator.evaluate((el) => (el as HTMLElement).focus());
  await expect(locator.evaluate((el) => el.matches(':focus-visible'))).resolves.toBe(true);
}

for (const theme of THEMES) {
  test.describe(`${theme}`, () => {
    test.beforeEach(async ({ page, context, baseURL }) => {
      await gotoThemed(page, context, baseURL!, theme);
    });

    test('alert inks, and the error alert nested link, clear 4.5:1 on their own panel', async ({
      page,
    }) => {
      const base100 = await themeVar(page, '--color-base-100');
      const cases = [
        { testId: 'tk-alert-error', label: 'alert-error' },
        { testId: 'tk-alert-warning', label: 'alert-warning' },
        { testId: 'tk-alert-success', label: 'alert-success' },
        { testId: 'tk-alert-info', label: 'alert-info' },
      ];
      for (const { testId, label } of cases) {
        const el = page.getByTestId(testId);
        const ink = await styleOf(el, 'color');
        const panel = await styleOf(el, 'backgroundColor');
        const ratio = await contrastOnGround(page, ink, panel, base100);
        console.log(`PROOF ${theme} ${label} ink/panel: ${ratio.toFixed(3)}`);
        expect(ratio, label).toBeGreaterThanOrEqual(4.5);
      }

      const panel = await styleOf(page.getByTestId('tk-alert-error'), 'backgroundColor');
      const linkInk = await styleOf(page.getByTestId('tk-alert-error-link'), 'color');
      const linkRatio = await contrastOnGround(page, linkInk, panel, base100);
      console.log(`PROOF ${theme} alert-error nested link/panel: ${linkRatio.toFixed(3)}`);
      expect(linkRatio, 'nested link').toBeGreaterThanOrEqual(4.5);
    });

    test('the switch: checked track and knob, and the unchecked edge and knob, clear 3:1', async ({
      page,
    }) => {
      const base100 = await themeVar(page, '--color-base-100');

      const checked = page.getByTestId('tk-switch-checked');
      const track = await styleOf(checked, 'backgroundColor');
      const knob = await styleOf(checked, 'backgroundColor', '::before');
      const trackRatio = await contrastOnGround(page, track, base100, base100);
      console.log(`PROOF ${theme} switch checked track/base-100: ${trackRatio.toFixed(3)}`);
      expect(trackRatio, 'checked track').toBeGreaterThanOrEqual(3);
      const knobRatio = await contrastOnGround(page, knob, track, track);
      console.log(`PROOF ${theme} switch checked knob/track: ${knobRatio.toFixed(3)}`);
      expect(knobRatio, 'checked knob').toBeGreaterThanOrEqual(3);

      const unchecked = page.getByTestId('tk-switch-unchecked');
      const edge = await styleOf(unchecked, 'borderColor');
      const uncheckedKnob = await styleOf(unchecked, 'backgroundColor', '::before');
      const edgeRatio = await contrastOnGround(page, edge, base100, base100);
      console.log(`PROOF ${theme} switch unchecked edge/base-100: ${edgeRatio.toFixed(3)}`);
      expect(edgeRatio, 'unchecked edge').toBeGreaterThanOrEqual(3);
      const uncheckedKnobRatio = await contrastOnGround(page, uncheckedKnob, base100, base100);
      console.log(
        `PROOF ${theme} switch unchecked knob/base-100: ${uncheckedKnobRatio.toFixed(3)}`,
      );
      expect(uncheckedKnobRatio, 'unchecked knob').toBeGreaterThanOrEqual(3);
    });

    test('selected-segment text clears 4.5:1 on the 7% wash, all five selected forms', async ({
      page,
    }) => {
      const base100 = await themeVar(page, '--color-base-100');

      // The fixture's own markup carries three of the five selected forms (btn-active,
      // aria-current, a checked radio join segment); the other two are synthesized here on a
      // plain button each, the same forms BtnActiveDarkGround.test.ts proves against the
      // compiled sheet in a component test.
      const pressed = page.getByTestId('tk-btn-plain');
      await pressed.evaluate((el) => el.setAttribute('aria-pressed', 'true'));
      const checkedAttr = page.getByTestId('tk-btn-ghost');
      await checkedAttr.evaluate((el) => el.setAttribute('aria-checked', 'true'));

      const cases: { locator: Locator; label: string }[] = [
        { locator: page.getByTestId('tk-join-ladder-active'), label: 'btn-active' },
        { locator: page.getByTestId('tk-join-ladder-current'), label: 'aria-current' },
        { locator: page.getByTestId('tk-radio-join-first'), label: 'checked radio join' },
        { locator: pressed, label: 'aria-pressed' },
        { locator: checkedAttr, label: 'aria-checked' },
      ];
      for (const { locator, label } of cases) {
        const ink = await styleOf(locator, 'color');
        const wash = await styleOf(locator, 'backgroundColor');
        const ratio = await contrastOnGround(page, ink, wash, base100);
        console.log(`PROOF ${theme} selected-segment ink/wash (${label}): ${ratio.toFixed(3)}`);
        expect(ratio, label).toBeGreaterThanOrEqual(4.5);
      }
    });

    test('the selected hairline clears 3:1 against the card and against the resting sibling edge', async ({
      page,
    }) => {
      const base100 = await themeVar(page, '--color-base-100');
      const selected = page.getByTestId('tk-join-ladder-active');
      const sibling = page.getByTestId('tk-join-ladder-plain');
      const hairline = await styleOf(selected, 'borderColor');
      const siblingEdge = await styleOf(sibling, 'borderColor');

      const cardRatio = await contrastOnGround(page, hairline, base100, base100);
      console.log(`PROOF ${theme} selected hairline/base-100: ${cardRatio.toFixed(3)}`);
      expect(cardRatio, 'hairline vs card').toBeGreaterThanOrEqual(3);

      const siblingRatio = await contrastOnGround(page, hairline, siblingEdge, base100);
      console.log(
        `PROOF ${theme} selected hairline/resting sibling edge: ${siblingRatio.toFixed(3)}`,
      );
      expect(siblingRatio, 'hairline vs sibling edge').toBeGreaterThanOrEqual(3);
    });

    test('focus rings on the plain, neutral, soft primary, and selected buttons, and both switches, clear 3:1', async ({
      page,
    }) => {
      const base100 = await themeVar(page, '--color-base-100');
      const cases = [
        { testId: 'tk-btn-plain', label: 'plain button' },
        { testId: 'tk-btn-neutral', label: 'neutral button' },
        { testId: 'tk-btn-soft-primary', label: 'soft primary button' },
        { testId: 'tk-join-ladder-active', label: 'selected button' },
        { testId: 'tk-switch-checked', label: 'checked switch' },
        { testId: 'tk-switch-unchecked', label: 'unchecked switch' },
      ];
      for (const { testId, label } of cases) {
        const el = page.getByTestId(testId);
        await focusVisible(el);
        const ring = await styleOf(el, 'outlineColor');
        const ratio = await contrastOnGround(page, ring, base100, base100);
        console.log(`PROOF ${theme} focus ring/base-100 (${label}): ${ratio.toFixed(3)}`);
        expect(ratio, label).toBeGreaterThanOrEqual(3);
      }
    });

    // Measured and recorded for the proof record, never asserted against a floor: these are the
    // hover, active, and dark-lift steps the design already commits to elsewhere, not new
    // contrast claims. A step's own before/after values are printed so the record can quote them.
    test('records the hover, active, and lift steps for the record', async ({ page }) => {
      const plain = page.getByTestId('tk-btn-plain');
      const plainRest = await styleOf(plain, 'backgroundColor');
      await plain.hover();
      await page.waitForTimeout(SETTLE_MS);
      const plainHover = await styleOf(plain, 'backgroundColor');
      console.log(
        `PROOF ${theme} plain button hover step: rest ${plainRest} -> hover ${plainHover}`,
      );

      const neutral = page.getByTestId('tk-btn-neutral');
      const neutralRest = await styleOf(neutral, 'backgroundColor');
      await neutral.hover();
      await page.waitForTimeout(SETTLE_MS);
      const neutralHover = await styleOf(neutral, 'backgroundColor');
      console.log(
        `PROOF ${theme} neutral button hover step: rest ${neutralRest} -> hover ${neutralHover}`,
      );

      const selected = page.getByTestId('tk-join-ladder-active');
      const selectedRest = await styleOf(selected, 'backgroundColor');
      await selected.hover();
      await page.waitForTimeout(SETTLE_MS);
      const selectedHover = await styleOf(selected, 'backgroundColor');
      console.log(
        `PROOF ${theme} selected-segment hover step: rest ${selectedRest} -> hover ${selectedHover}`,
      );
      await page.mouse.move(0, 0);

      const soft = page.getByTestId('tk-btn-soft-primary');
      const softRest = await styleOf(soft, 'backgroundColor');
      await soft.hover();
      await page.waitForTimeout(SETTLE_MS);
      const softHover = await styleOf(soft, 'backgroundColor');
      const box = await soft.boundingBox();
      if (!box) throw new Error('the soft primary button has no box to press');
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(SETTLE_MS);
      const softActive = await styleOf(soft, 'backgroundColor');
      await page.mouse.up();
      console.log(
        `PROOF ${theme} soft primary step: rest ${softRest} -> hover ${softHover} -> active ${softActive}`,
      );

      const primary = page.getByTestId('tk-btn-primary');
      const lift = await styleOf(primary, 'boxShadow');
      console.log(`PROOF ${theme} primary lift: ${lift}`);
    });
  });
}
