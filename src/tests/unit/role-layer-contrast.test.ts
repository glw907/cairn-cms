import { describe, it, expect } from 'vitest';
import { parse, converter, interpolate } from 'culori';
import { dualGamutRatio } from '../../../scripts/check-public-tokens.mjs';

const toRgb = converter('rgb');

// The Warm Stone surfaces and ink, read from cairn-admin.css (the test's fixed truth; if these values
// change in the sheet, update this deliberately).
const SURFACES = {
  light: { base100: 'oklch(99% 0.004 75)', base200: 'oklch(96.5% 0.006 75)', content: 'oklch(26% 0.014 75)' },
  dark: { base100: 'oklch(24% 0.01 75)', base200: 'oklch(15.5% 0.009 75)', content: 'oklch(93% 0.006 75)' },
};

/** The opaque colour a translucent ink renders as over a surface, returned as an `rgb(...)` string for
 * dualGamutRatio. The ink is base-content faded to `alpha` the way Tailwind fades it, color-mix(in
 * oklab, fg, transparent), and the result is that faded ink alpha-composited over the surface. */
function compositeOver(fg: string, bg: string, alpha: number): string {
  const ink = interpolate([fg, 'transparent'], 'oklab')(1 - alpha);
  const inkAlpha = ink.alpha ?? 1;
  const inkRgb = toRgb(ink)!;
  const surfaceRgb = toRgb(parse(bg)!)!;
  const channel = (c: 'r' | 'g' | 'b') =>
    (inkRgb[c] * inkAlpha + surfaceRgb[c] * (1 - inkAlpha)) * 255;
  return `rgb(${channel('r')} ${channel('g')} ${channel('b')})`;
}

/** The minimum dual-gamut ratio of base-content at `alpha` over base-100 and base-200, in one theme. */
function roleFloor(theme: 'light' | 'dark', alpha: number): number {
  const s = SURFACES[theme];
  const r1 = dualGamutRatio(compositeOver(s.content, s.base100, alpha), s.base100);
  const r2 = dualGamutRatio(compositeOver(s.content, s.base200, alpha), s.base200);
  return Math.min(r1.srgb, r1.p3, r2.srgb, r2.p3);
}

// The guaranteed role-layer values, read from cairn-admin.css (the test's fixed truth). These are the
// `--color-muted` / `--color-subtle` Tier-2 vars the named utilities point at on each theme.
const ROLES = {
  light: { muted: 'oklch(48% 0.01 75)', subtle: 'oklch(42% 0.01 75)' },
  dark: { muted: 'oklch(72% 0.01 75)', subtle: 'oklch(80% 0.008 75)' },
};

/** The minimum dual-gamut ratio of a guaranteed role colour over base-100 and base-200, in one theme. */
function guaranteedFloor(theme: 'light' | 'dark', role: 'muted' | 'subtle'): number {
  const s = SURFACES[theme];
  const fg = ROLES[theme][role];
  const r1 = dualGamutRatio(fg, s.base100);
  const r2 = dualGamutRatio(fg, s.base200);
  return Math.min(r1.srgb, r1.p3, r2.srgb, r2.p3);
}

// MEASUREMENT: print the table so the implementer can choose alphas. Not an assertion.
it('prints the role-layer ratio table', () => {
  for (const theme of ['light', 'dark'] as const) {
    for (let a = 50; a <= 100; a += 5) {
      // eslint-disable-next-line no-console
      console.log(theme, `${a}%`, roleFloor(theme, a / 100).toFixed(2));
    }
  }
  expect(true).toBe(true);
});

// BRANCH: guaranteed-value. The measured ratio table above (light 50%->3.71 .. 100%->14.05; dark
// 50%->1.50 .. 80%->5.14 .. 100%->13.39) shows a single base-content opacity step CAN clear 4.5 on
// both surfaces in both themes only at >= 80% alpha. But the design requires `subtle` to be the
// stronger role while the dark theme paints subtle LIGHTER than muted (80% L vs 72% L). An opacity
// step of base-content over a dark surface gets darker as alpha rises, so it cannot make subtle both
// stronger-contrast AND lighter than muted on dark. The hue-shifted guaranteed values (Tier 2) express
// a tone the fold cannot, so `--color-muted` / `--color-subtle` stay vars and the role utilities point
// at them. The four floor checks below assert AA on the guaranteed values directly (not skipped, since
// the guaranteed values are measurable here); the ordering check is expressed on the vars' measured
// dualGamutRatio.
describe('role-layer AA floors (guaranteed-value branch)', () => {
  for (const theme of ['light', 'dark'] as const) {
    it(`muted clears AA on both surfaces (${theme})`, () => {
      expect(guaranteedFloor(theme, 'muted')).toBeGreaterThanOrEqual(4.5);
    });
    it(`subtle clears AA on both surfaces (${theme})`, () => {
      expect(guaranteedFloor(theme, 'subtle')).toBeGreaterThanOrEqual(4.5);
    });
  }
  for (const theme of ['light', 'dark'] as const) {
    it(`subtle is the stronger role (${theme})`, () => {
      expect(guaranteedFloor(theme, 'subtle')).toBeGreaterThan(guaranteedFloor(theme, 'muted'));
    });
  }
});
