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
 * A computed color's chroma, from either serialization the two fixture states below produce. A flat
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
    const plain = document.createElement('button');
    plain.className = 'btn';
    const active = document.createElement('button');
    active.className = 'btn btn-active';
    document.body.appendChild(plain);
    document.body.appendChild(active);

    const plainL = oklchLightness(getComputedStyle(plain).backgroundColor);
    const activeL = oklchLightness(getComputedStyle(active).backgroundColor);

    expect(Math.abs(activeL - plainL)).toBeGreaterThanOrEqual(0.04);

    plain.remove();
    active.remove();
  });

  // A first repair hardcoded a flat --btn-bg value that fixed the neutral step above but discarded
  // the --btn-color channel: a variant selected control (btn btn-primary btn-active) lost its
  // accent entirely and painted its --btn-fg (--color-primary-content, oklch 20%) on the same flat
  // hue-75 fill every other selected control got, roughly 1.02:1. The fix mixes toward white off
  // --btn-color itself, so a primary control keeps its hue and most of its chroma, only lightened.
  it('keeps the --btn-color variant on a variant selected control instead of collapsing to neutral', () => {
    const primaryActive = document.createElement('button');
    primaryActive.className = 'btn btn-primary btn-active';
    document.body.appendChild(primaryActive);

    const chroma = backgroundChroma(getComputedStyle(primaryActive).backgroundColor);
    // The dark Warm Stone neutral family (base-200/base-300, the flat hardcoded fill's hue) sits at
    // 0.009-0.014 chroma; --color-primary's own chroma is 0.15. 0.05 sits well clear of the neutral
    // ceiling and well under the primary floor, so it discriminates a collapsed fill from a kept one.
    expect(chroma).toBeGreaterThan(0.05);

    primaryActive.remove();
  });

  // The resting override above carries no pseudo-class, so it always applies (hover included) and,
  // being unlayered, always outranks daisyUI's own layered .btn:hover attempt at --btn-bg regardless
  // of that rule's specificity. Without a second, higher-specificity unlayered :hover rule, the
  // selected control gave no visible feedback on hover. transition: none sidesteps the .btn base
  // rule's 0.2s background-color transition, so the assertion reads the settled value rather than a
  // mid-interpolation frame close to the resting color.
  it('changes background on hover, unlike the pre-fix flat override', async () => {
    const active = document.createElement('button');
    active.className = 'btn btn-active';
    active.style.transition = 'none';
    document.body.appendChild(active);

    const resting = getComputedStyle(active).backgroundColor;
    await userEvent.hover(active);
    const hovered = getComputedStyle(active).backgroundColor;

    expect(hovered).not.toBe(resting);

    active.remove();
  });
});
