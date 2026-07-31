import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { userEvent } from 'vitest/browser';
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
 * The WCAG contrast ratio between two computed colors, priced through oklab to linear sRGB to
 * relative luminance, with each linear channel clamped to the displayable range (an oklch token whose
 * chroma sits outside sRGB renders clipped, and the clipped render is what a reader sees). Chromium
 * serializes every color in this sheet as either `oklch(L C H)` or `oklab(L a b)`, so one parser
 * covers both: oklch is oklab's polar form.
 */
function contrastRatio(a: string, b: string): number {
  const luminance = (color: string): number => {
    const nums = (color.match(/-?[\d.]+/g) ?? []).map(Number);
    if (nums.length < 3) throw new Error(`not an oklch/oklab color: ${color}`);
    const [L, second, third] = nums;
    const [oa, ob] = color.startsWith('oklch')
      ? [second * Math.cos((third * Math.PI) / 180), second * Math.sin((third * Math.PI) / 180)]
      : [second, third];
    const l = (L + 0.3963377774 * oa + 0.2158037573 * ob) ** 3;
    const m = (L - 0.1055613458 * oa - 0.0638541728 * ob) ** 3;
    const s = (L - 0.0894841775 * oa - 1.291485548 * ob) ** 3;
    const [r, g, bl] = [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ].map((v) => Math.min(1, Math.max(0, v)));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** One detached button carrying `className`, mounted so `getComputedStyle` resolves the sheet. */
function mount(className: string): HTMLButtonElement {
  const el = document.createElement('button');
  el.className = className;
  // The .btn base rule transitions background-color over 0.2s, so a hover read taken straight after
  // the pointer lands would catch a mid-interpolation frame close to the resting color.
  el.style.transition = 'none';
  document.body.appendChild(el);
  return el;
}

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

    plain.remove();
    active.remove();
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

    active.remove();
    ground.remove();
    plain.remove();
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

    primaryActive.remove();
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

    outlineActive.remove();
    neutralOutlineActive.remove();
  });

  // The unlayered rules beat daisyUI's disabled reset (--btn-bg and --btn-border to transparent)
  // unless they exclude the disabled forms themselves, which left a disabled selected control wearing
  // an active-colored ring where daisyUI intends none.
  it('leaves a disabled selected control the transparent border daisyUI resets it to', () => {
    for (const cls of ['btn btn-active btn-disabled', 'btn btn-active']) {
      const el = mount(cls);
      if (cls === 'btn btn-active') el.disabled = true;
      expect(getComputedStyle(el).borderTopColor).toBe('rgba(0, 0, 0, 0)');
      el.remove();
    }

    const ariaDisabled = mount('btn btn-active');
    ariaDisabled.setAttribute('aria-disabled', 'true');
    expect(getComputedStyle(ariaDisabled).borderTopColor).toBe('rgba(0, 0, 0, 0)');
    ariaDisabled.remove();
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

    active.remove();
  });
});

// The fill override, the hairline, and the hover step are all scoped to the dark root alone, so the
// light theme keeps daisyUI's stock .btn-active in every one of them, including stock's own
// no-change-on-hover convention. The claim is worth pinning because the CHANGELOG makes it: a rule
// written under the shared :where(both themes) prefix by mistake would silently move the light theme.
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

  it('keeps daisyUI stock: a border matching a plain .btn and no dark-side hairline', () => {
    const plain = mount('btn');
    const active = mount('btn btn-active');

    expect(getComputedStyle(active).borderTopColor).toBe(getComputedStyle(plain).borderTopColor);

    plain.remove();
    active.remove();
  });

  it('keeps daisyUI stock: the outline variant stays unfilled and untouched', () => {
    const outline = mount('btn btn-outline btn-primary');
    const outlineActive = mount('btn btn-outline btn-primary btn-active');

    // Stock daisyUI fills an active outline button and leaves its ink at --btn-color. The dark
    // repair does not reach here, so the light composition still reads as daisyUI ships it.
    expect(getComputedStyle(outlineActive).color).toBe(getComputedStyle(outline).color);

    outline.remove();
    outlineActive.remove();
  });
});
