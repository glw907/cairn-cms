import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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
});
