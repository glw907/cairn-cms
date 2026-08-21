import { describe, it, expect, afterEach, beforeAll, afterAll } from 'vitest';
import { userEvent } from 'vitest/browser';
import { contrastRatio as rgbaContrastRatio, type Rgba } from '../../lib/audit/color.js';
// The shipped sheet, the same artifact AdminReset.test.ts and the CairnAdminShell.test.ts palette
// suite load: this test has to prove the override that reaches a consumer, not the source file, so
// it loads the built dist output rather than compiling cairn-admin.css itself.
import compiledAdminCss from '../../../dist/components/cairn-admin.css?inline';

/**
 * The oklch/oklab lightness `getComputedStyle` serializes a color function to, read straight off the
 * string rather than round-tripped through sRGB. Chromium preserves the color space a declaration
 * resolves through: a bare `oklch(...)` token stays `oklch(L C H)`, and a `color-mix(in oklab, ...)`
 * chain (daisyUI's own dark `.btn-active` recipe) serializes to `oklab(L a b)`. Both put lightness in
 * the same first channel, since oklch is oklab's own polar form, so this needs no color-space
 * conversion: it is the same number either way.
 */
function oklchLightness(computedColor: string): number {
  const match = computedColor.match(/[\d.]+/);
  if (!match) throw new Error(`not an oklch/oklab color: ${computedColor}`);
  return Number(match[0]);
}

/**
 * A computed color's chroma, from either serialization the fixture states below produce. A flat
 * `oklch(L C H)` literal (the broken hardcoded-fill state this suite guards against) serializes with
 * chroma as its own second channel; the variant-preserving `color-mix(in oklab, ...)` fix serializes
 * to `oklab(L a b)`, whose chroma is the a/b vector's magnitude, since oklab is oklch's own Cartesian
 * form. Both read the same physical quantity.
 */
function backgroundChroma(computedColor: string): number {
  const nums = computedColor.match(/-?[\d.]+/g);
  if (!nums || nums.length < 3) throw new Error(`not an oklch/oklab color: ${computedColor}`);
  if (computedColor.startsWith('oklch')) return Number(nums[1]);
  if (computedColor.startsWith('oklab')) {
    const a = Number(nums[1]);
    const b = Number(nums[2]);
    return Math.sqrt(a * a + b * b);
  }
  throw new Error(`not an oklch/oklab color: ${computedColor}`);
}

/**
 * A computed color as sRGB bytes, resolved by painting it rather than by parsing color syntax, the
 * discipline `src/lib/audit/color.ts` already documents for the audit's own rules: every color in
 * this sheet serializes in its authored oklch/oklab space, and an out-of-gamut token renders
 * clipped, so the canvas is the one reader that reports the pixels a person actually sees.
 */
function paintedRgba(color: string): Rgba {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('the browser gave no 2d canvas context');
  // A string the browser refuses leaves `fillStyle` at whatever it already held, so the sentinel
  // separates a refusal from a color that legitimately resolves to it.
  context.fillStyle = '#ff00ff';
  context.fillStyle = color;
  if (context.fillStyle === '#ff00ff') throw new Error(`the browser refused the color: ${color}`);
  context.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
  return { r, g, b, a: a / 255 };
}

/** The WCAG contrast ratio between two colors as `getComputedStyle` serializes them. */
function contrastRatio(a: string, b: string): number {
  return rgbaContrastRatio(paintedRgba(a), paintedRgba(b));
}

const mounted: HTMLElement[] = [];

/**
 * One button carrying `className`, on the page so `getComputedStyle` resolves it against the
 * sheet. Every mount is torn down after the test that made it.
 */
function mount(className: string): HTMLButtonElement {
  const el = document.createElement('button');
  el.className = className;
  // The .btn base rule transitions background-color over 0.2s, so a hover read taken straight after
  // the pointer lands would catch a mid-interpolation frame close to the resting color.
  el.style.transition = 'none';
  document.body.appendChild(el);
  mounted.push(el);
  return el;
}

afterEach(() => {
  for (const el of mounted.splice(0)) el.remove();
});

// Design ratchet Task 4 (closes finding 4, ships with the one-filled-action partition change): the
// ruling pushes a segmented control's selected state off btn-primary and onto btn-active, and
// daisyUI's own dark .btn-active is a measured 0.011 oklch-lightness step off a plain .btn, close to
// invisible on a dark ground. This proves the dark-theme override against the REAL compiled sheet.
describe('the dark-ground .btn-active selected state', () => {
  let sheet: HTMLStyleElement;

  beforeAll(() => {
    document.documentElement.setAttribute('data-theme', 'cairn-admin-dark');
    sheet = document.createElement('style');
    sheet.textContent = compiledAdminCss;
    document.head.appendChild(sheet);
  });

  afterAll(() => {
    document.documentElement.removeAttribute('data-theme');
    sheet.remove();
  });

  it('raises the .btn -> .btn-active background lightness step to at least 0.04 oklch on dark', () => {
    const plain = mount('btn');
    const active = mount('btn btn-active');

    const plainL = oklchLightness(getComputedStyle(plain).backgroundColor);
    const activeL = oklchLightness(getComputedStyle(active).backgroundColor);

    expect(Math.abs(activeL - plainL)).toBeGreaterThanOrEqual(0.04);
  });

  // The fill step above is perceptual, not photometric: it measures 1.14:1 against an unselected
  // base-200 sibling and 1.05:1 against the base-100 ground, far under WCAG 1.4.11's 3:1 floor for a
  // state cue. The 3:1 cue rides on the border instead, the design system's 1px inset hairline in the
  // family's own ink. The first repair set --btn-border to var(--btn-bg), which measured 1.00:1
  // against its own fill and left the selected segment with no fill contrast, no border, and no
  // shadow (daisyUI's .btn-active zeroes --btn-shadow).
  it('gives the neutral selected state a border that is not its own fill and clears 3:1', () => {
    const active = mount('btn btn-active');
    const ground = mount('');
    ground.style.backgroundColor = 'var(--color-base-100)';
    const plain = mount('btn');

    const style = getComputedStyle(active);
    const fill = style.backgroundColor;
    const border = style.borderTopColor;

    expect(border).not.toBe(fill);
    expect(contrastRatio(border, fill)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(border, getComputedStyle(ground).backgroundColor)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(border, getComputedStyle(plain).backgroundColor)).toBeGreaterThanOrEqual(3);
    // The border is painted, not merely declared: a zero-width border would carry the color and cue
    // nothing.
    expect(parseFloat(style.borderTopWidth)).toBeGreaterThan(0);
  });

  // A first repair hardcoded a flat --btn-bg value that fixed the neutral step above but discarded
  // the --btn-color channel: a variant selected control (btn btn-primary btn-active) lost its
  // accent entirely and painted its --btn-fg (--color-primary-content, oklch 20%) on the same flat
  // hue-75 fill every other selected control got, roughly 1.02:1. The fix mixes toward white off
  // --btn-color itself, so a primary control keeps its hue and most of its chroma, only lightened.
  it('keeps the --btn-color variant on a variant selected control instead of collapsing to neutral', () => {
    const primaryActive = mount('btn btn-primary btn-active');

    const chroma = backgroundChroma(getComputedStyle(primaryActive).backgroundColor);
    // The dark Warm Stone neutral family (base-200/base-300, the flat hardcoded fill's hue) sits at
    // 0.009-0.014 chroma; --color-primary's own chroma is 0.15. 0.05 sits well clear of the neutral
    // ceiling and well under the primary floor, so it discriminates a collapsed fill from a kept one.
    expect(chroma).toBeGreaterThan(0.05);
  });

  // .btn-outline sets `color` directly off --btn-color rather than through --btn-fg, and daisyUI's
  // own .btn-active fills an outline button anyway (it sits directly in daisyui.l1.l2, which outranks
  // .btn-outline in the nested daisyui.l1.l2.l3). Stock, that painted primary ink on a
  // primary-derived fill at 1.20:1. Restating `color` off --btn-fg is what makes the composition
  // legible; excluding outline from the fill override would not have, since daisyUI fills it either
  // way. Not a composition cairn's own markup uses, but the sheet ships to consumers.
  it('keeps the outline-variant selected state legible at AA', () => {
    const outlineActive = mount('btn btn-outline btn-primary btn-active');
    const neutralOutlineActive = mount('btn btn-outline btn-active');

    for (const el of [outlineActive, neutralOutlineActive]) {
      const style = getComputedStyle(el);
      expect(contrastRatio(style.color, style.backgroundColor)).toBeGreaterThanOrEqual(4.5);
    }
  });

  // Design ratchet D3 item 1: the color override that repairs the outline/dash composition used
  // to sit on this same unscoped rule, so being unlayered it outranked every OTHER selected
  // control's own text utility too, not only the outline/dash forms it exists for. Splitting it
  // into its own rule, scoped to :is(.btn-outline, .btn-dash), lets a plain selected control's
  // ink follow a consumer's own utility again while the outline composition keeps its repair.
  it('scopes the color override to outline/dash forms, so a plain selected control keeps its own text utility', () => {
    const plainErrorActive = mount('btn btn-active text-error');
    const referenceError = mount('text-error');

    expect(getComputedStyle(plainErrorActive).color).toBe(getComputedStyle(referenceError).color);

    const outlineActive = mount('btn btn-outline btn-primary btn-active');
    const style = getComputedStyle(outlineActive);
    expect(contrastRatio(style.color, style.backgroundColor)).toBeGreaterThanOrEqual(6);
  });

  // The unlayered rules beat daisyUI's disabled reset (--btn-bg and --btn-border to transparent)
  // unless they exclude the disabled forms themselves, which left a disabled selected control wearing
  // an active-colored ring where daisyUI intends none.
  it('leaves a disabled selected control the transparent border daisyUI resets it to', () => {
    const disabledForms: Record<string, (el: HTMLButtonElement) => void> = {
      'the .btn-disabled class': (el) => el.classList.add('btn-disabled'),
      'the disabled property': (el) => {
        el.disabled = true;
      },
      'the aria-disabled attribute': (el) => el.setAttribute('aria-disabled', 'true'),
    };

    for (const [form, disable] of Object.entries(disabledForms)) {
      const el = mount('btn btn-active');
      disable(el);
      expect(getComputedStyle(el).borderTopColor, `${form} kept the active hairline`).toBe('rgba(0, 0, 0, 0)');
    }
  });

  // The resting override above carries no pseudo-class, so it always applies (hover included) and,
  // being unlayered, always outranks daisyUI's own layered .btn:hover attempt at --btn-bg regardless
  // of that rule's specificity. Without a second, higher-specificity unlayered :hover rule, the
  // selected control gave no visible feedback on hover. The step is pinned by lightness, not by mere
  // inequality: a rounding-scale difference would satisfy `not.toBe` and still read as nothing.
  it('lightens the selected fill by a measurable step on hover', async () => {
    const active = mount('btn btn-active');

    const resting = getComputedStyle(active).backgroundColor;
    await userEvent.hover(active);
    const hovered = getComputedStyle(active).backgroundColor;

    expect(oklchLightness(hovered) - oklchLightness(resting)).toBeGreaterThanOrEqual(0.03);
  });
});

// The neutral fill override, the hairline, and the hover step are all scoped to the dark root
// alone, so the light theme keeps daisyUI's stock .btn-active in each of them, including stock's
// own no-change-on-hover convention. The outline/dash color rule is the one exception: it is
// theme-agnostic from the start (design ratchet D3 items 1-2), since stock daisyUI's own
// outline-active ink composition is illegible on both themes, worse on light (1.17:1) than dark's
// own pre-repair defect (1.20:1). The remaining claim is still worth pinning because the CHANGELOG
// makes it: a rule written under the shared :where(both themes) prefix by mistake would silently
// move the light theme's neutral fill, border, or hover behavior.
describe('the light theme .btn-active', () => {
  let sheet: HTMLStyleElement;

  beforeAll(() => {
    document.documentElement.setAttribute('data-theme', 'cairn-admin');
    sheet = document.createElement('style');
    sheet.textContent = compiledAdminCss;
    document.head.appendChild(sheet);
  });

  afterAll(() => {
    document.documentElement.removeAttribute('data-theme');
    sheet.remove();
  });

  // Stock daisyUI (5.7) mixes the active border 7% toward black where a plain .btn mixes 5%, a step
  // of roughly 0.02 oklch lightness. The dark hairline sits at 57% L, more than 0.3 below either, so
  // a stock border reads within a hair of plain and nowhere near the hairline.
  it('keeps daisyUI stock: a border within a hair of a plain .btn and no dark-side hairline', () => {
    const plainL = oklchLightness(getComputedStyle(mount('btn')).borderTopColor);
    const activeL = oklchLightness(getComputedStyle(mount('btn btn-active')).borderTopColor);

    expect(Math.abs(activeL - plainL)).toBeLessThan(0.03);
    expect(activeL).toBeGreaterThan(0.8);
  });

  // Design ratchet D3 items 1-2: stock daisyUI fills an active outline button (a color-mix toward
  // black) but leaves `color` at the outline variant's own ink, measured 1.17:1 here, worse than
  // dark's own pre-repair 1.20:1. The outline/dash color rule that first shipped dark-only is
  // theme-agnostic, so light gets the same ink repair off --btn-fg.
  it('repairs the outline variant the same way dark does: color off --btn-fg, not the outline ink', () => {
    const outline = mount('btn btn-outline btn-primary');
    const outlineActive = mount('btn btn-outline btn-primary btn-active');

    const style = getComputedStyle(outlineActive);
    expect(style.color).not.toBe(getComputedStyle(outline).color);
    expect(contrastRatio(style.color, style.backgroundColor)).toBeGreaterThanOrEqual(4.5);
  });
});
