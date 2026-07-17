import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  readThemeOverlayBaseTokens,
  applyThemeOverlay,
  parseThemeTokens,
  checkThemeContrastTokens,
} from '../../../scripts/check-public-tokens.mjs';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');

describe('readThemeOverlayBaseTokens', () => {
  it('reads the light and dark base-ladder overrides from a plain-CSS overlay file', () => {
    const css = `
:root {
  --font-display: 'Fraunces Variable', serif;
}

:root {
  --color-base-100: oklch(98.4% 0.0035 80) !important;
  --color-base-content: oklch(25% 0.014 70) !important;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    --color-base-100: oklch(24% 0.01 78) !important;
    --color-base-content: oklch(92% 0.007 80) !important;
  }
}
`;
    expect(readThemeOverlayBaseTokens(css)).toEqual({
      light: { 'color-base-100': 'oklch(98.4% 0.0035 80)', 'color-base-content': 'oklch(25% 0.014 70)' },
      dark: { 'color-base-100': 'oklch(24% 0.01 78)', 'color-base-content': 'oklch(92% 0.007 80)' },
    });
  });
});

describe('applyThemeOverlay', () => {
  it('overrides only the tokens the overlay carries, per theme', () => {
    const themeTokens = {
      light: { 'color-base-100': 'oklch(98.4% 0 0)', 'color-primary': 'oklch(45% 0.1 248)' },
      dark: { 'color-base-100': 'oklch(24% 0 0)', 'color-primary': 'oklch(74% 0.1 248)' },
    };
    const overlay = {
      light: { 'color-base-100': 'oklch(98.4% 0.0035 80)' },
      dark: { 'color-base-100': 'oklch(24% 0.01 78)' },
    };
    expect(applyThemeOverlay(themeTokens, overlay)).toEqual({
      light: { 'color-base-100': 'oklch(98.4% 0.0035 80)', 'color-primary': 'oklch(45% 0.1 248)' },
      dark: { 'color-base-100': 'oklch(24% 0.01 78)', 'color-primary': 'oklch(74% 0.1 248)' },
    });
  });
});

// The cairn-theme identity overlay (examples/cairn-theme/cairn.css) only retones the base ladder;
// merging its override onto theme.css's own tokens and re-running the dual-gamut check proves the
// overlay stays AA in both sRGB and P3, the same floor the plain theme clears. This is a real gate
// on real files, not a synthetic fixture, since a future overlay retone should fail here.
describe('the cairn-theme overlay clears the dual-gamut AA floor', () => {
  it('every pair passes in both light and dark after the overlay applies', () => {
    const themeCss = readFileSync(resolve(ROOT, 'examples/showcase/src/theme/theme.css'), 'utf8');
    const cairnCss = readFileSync(resolve(ROOT, 'examples/cairn-theme/cairn.css'), 'utf8');
    const merged = applyThemeOverlay(parseThemeTokens(themeCss), readThemeOverlayBaseTokens(cairnCss));
    const rows = checkThemeContrastTokens(merged);
    const failures = rows.filter((r) => !r.pass);
    expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
  });
});
