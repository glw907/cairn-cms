import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, converter } from 'culori';
import { dualGamutRatio } from '../../../scripts/checks/check-public-tokens.mjs';

// A sibling of role-layer-contrast.test.ts: the alert idiom rule's four inks, each measured
// against its own composited panel rather than a plain surface, so this lives beside the ink's
// own math (color-mix in oklab) instead of that file's plain-surface guaranteed-value branch.

const toOklab = converter('oklab');
const toOklch = converter('oklch');

/** Parses `expr`, throwing (naming `expr`) rather than returning undefined on a bad literal. */
function mustParse(expr: string) {
  const parsed = parse(expr);
  if (!parsed) throw new Error(`cannot parse colour ${expr}`);
  return parsed;
}

/**
 * The CSS `color-mix(in oklab, <tone> <pct>%, <base>)` result, as an oklch string `dualGamutRatio`
 * can parse: converts both inputs to oklab, linearly interpolates each channel by `pct`, then
 * converts the mix back to oklch.
 */
function mixInOklab(tone: string, pct: number, base: string): string {
  const t = toOklab(mustParse(tone));
  const b = toOklab(mustParse(base));
  const p = pct / 100;
  const q = 1 - p;
  // .a carries no explicit numeric field in the shared culori ambient shim (src/tests/culori.d.ts),
  // only its generic string-indexed fallback, so Number(...) narrows it back to the number channel
  // math the mix needs.
  const l = p * (t.l ?? 0) + q * (b.l ?? 0);
  const a = p * Number(t.a ?? 0) + q * Number(b.a ?? 0);
  const bChan = p * (t.b ?? 0) + q * (b.b ?? 0);
  const mixed = toOklch({ mode: 'oklab', l, a, b: bChan });
  return `oklch(${(mixed.l ?? 0) * 100}% ${mixed.c ?? 0} ${mixed.h ?? 0})`;
}

// The tone and base tokens the panel mixes read, per theme, read from cairn-admin.css (the test's
// fixed truth; if these change in the sheet, update this deliberately).
const TONE = {
  light: { base100: 'oklch(99% 0.004 75)', info: 'oklch(52% 0.12 240)', success: 'oklch(52% 0.12 150)', warning: 'oklch(75% 0.15 70)' },
  dark: { base100: 'oklch(24% 0.01 75)', info: 'oklch(72% 0.12 240)', success: 'oklch(70% 0.12 150)', warning: 'oklch(80% 0.14 70)' },
};

// The four locked inks, per theme.
const INK = {
  light: {
    error: 'oklch(50% 0.19 25)',
    warning: 'oklch(50% 0.13 70)',
    success: 'oklch(48% 0.12 150)',
    info: 'oklch(44% 0.12 240)',
  },
  dark: {
    error: 'oklch(78% 0.15 25)',
    warning: 'oklch(80% 0.14 70)',
    success: 'oklch(78% 0.12 150)',
    info: 'oklch(82% 0.08 240)',
  },
};

// The error alert reuses the locked quiet-danger tint directly, not a mix.
const ERROR_TINT = { light: 'oklch(96% 0.03 25)', dark: 'oklch(28% 0.06 25)' };

// Each variant's panel mix percentage, per theme (the Alerts table: warning holds one percentage
// in both themes; success and info mix stronger in dark, where the darker base-100 needs it).
const PANEL_PCT: Record<'light' | 'dark', { warning: number; success: number; info: number }> = {
  light: { warning: 12, success: 7, info: 7 },
  dark: { warning: 12, success: 12, info: 12 },
};

/** The composited panel color for one non-error variant, in one theme. */
function panel(theme: 'light' | 'dark', variant: 'warning' | 'success' | 'info'): string {
  const t = TONE[theme];
  const tone = variant === 'warning' ? t.warning : variant === 'success' ? t.success : t.info;
  return mixInOklab(tone, PANEL_PCT[theme][variant], t.base100);
}

// LOCK: a hardcoded copy of cairn-admin.css. A future retune of a tone, a base, or an ink would
// otherwise pass this test against the stale copy, so assert the source sheet still contains
// every literal this math assumes.
it('matches the oklch literals the source sheet defines', () => {
  const sheet = readFileSync(
    resolve(fileURLToPath(new URL('.', import.meta.url)), '../../lib/components/cairn-admin.css'),
    'utf8',
  );
  for (const theme of ['light', 'dark'] as const) {
    for (const key of ['base100', 'info', 'success', 'warning'] as const) {
      expect(sheet, `${theme}.${key} missing from sheet`).toContain(TONE[theme][key]);
    }
    for (const variant of ['error', 'warning', 'success', 'info'] as const) {
      expect(sheet, `${theme} ink ${variant} missing from sheet`).toContain(INK[theme][variant]);
    }
  }
  expect(sheet).toContain(ERROR_TINT.light);
  expect(sheet).toContain(ERROR_TINT.dark);
});

describe('alert ink contrast against its own composited panel', () => {
  for (const theme of ['light', 'dark'] as const) {
    it(`error ink clears AA on the locked error tint (${theme})`, () => {
      const { srgb, p3 } = dualGamutRatio(INK[theme].error, ERROR_TINT[theme]);
      expect(Math.min(srgb, p3)).toBeGreaterThanOrEqual(4.5);
    });
    for (const variant of ['warning', 'success', 'info'] as const) {
      it(`${variant} ink clears AA on its own composited panel (${theme})`, () => {
        const { srgb, p3 } = dualGamutRatio(INK[theme][variant], panel(theme, variant));
        expect(Math.min(srgb, p3)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});
