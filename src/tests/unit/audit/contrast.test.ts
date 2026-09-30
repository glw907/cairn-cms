import { describe, it, expect } from 'vitest';
import { dualGamutRatio, resolveColor } from '../../../lib/audit/contrast.js';
import type { ResolvedColor } from '../../../lib/audit/contrast.js';

/** A lookup over a fixed custom-property table, the shape a scheme's resolved values take. */
function lookup(values: Record<string, string>) {
  return (name: string) => values[name];
}

/** The resolved color, or a failed test naming why it did not resolve. */
function color(expression: string, values: Record<string, string> = {}): ResolvedColor {
  const result = resolveColor(expression, lookup(values));
  if (!result.ok) throw new Error(`${expression} did not resolve: ${result.reason}`);
  return result.color;
}

/** Why an expression is unmeasured, or a failed test when it resolved. */
function reason(expression: string, values: Record<string, string> = {}): string {
  const result = resolveColor(expression, lookup(values));
  if (result.ok) throw new Error(`${expression} resolved, expected unmeasured`);
  return result.reason;
}

describe('resolveColor: var() chains', () => {
  it('follows a chain of var() references to a literal', () => {
    const values = { '--a': 'var(--b)', '--b': 'var(--c)', '--c': 'oklch(50% 0.1 200)' };
    expect(color('var(--a)', values)).toMatchObject({ mode: 'oklch', l: 0.5, c: 0.1, h: 200 });
  });

  it('takes a fallback when the property is undefined, and ignores it when defined', () => {
    expect(color('var(--missing, oklch(40% 0 0))')).toMatchObject({ l: 0.4 });
    expect(color('var(--set, oklch(40% 0 0))', { '--set': 'oklch(70% 0 0)' })).toMatchObject({ l: 0.7 });
  });

  it('drops a trailing !important before reading the value', () => {
    expect(color('var(--a)', { '--a': 'oklch(30% 0 0) !important' })).toMatchObject({ l: 0.3 });
  });

  it('reports an undefined property with no fallback as unmeasured, naming it', () => {
    expect(reason('var(--nowhere)')).toContain('--nowhere');
  });

  it('reports a var() cycle as unmeasured instead of recursing forever', () => {
    expect(reason('var(--a)', { '--a': 'var(--b)', '--b': 'var(--a)' })).toContain('cycle');
  });
});

describe('resolveColor: the one color-mix form', () => {
  it('evaluates var() operands inside a mix', () => {
    const values = { '--fill': 'oklch(54% 0.12 150)', '--ink': 'oklch(25% 0 0)' };
    const mixed = color('color-mix(in oklab, var(--fill) 50%, var(--ink))', values);
    expect(mixed.mode).toBe('oklab');
    expect(mixed.l).toBeCloseTo(0.395, 10);
  });

  it('evaluates a nested mix whose operands are themselves the one form', () => {
    const values = { '--muted': 'color-mix(in oklab, var(--ink) 80%, var(--paper))', '--ink': 'oklch(20% 0 0)', '--paper': 'oklch(100% 0 0)' };
    const mixed = color('color-mix(in oklab, var(--muted) 50%, var(--paper))', values);
    expect(mixed.l).toBeCloseTo(0.68, 10);
  });

  it.each([
    ['a relative color', 'oklch(from var(--fill) calc(l - 0.2) c h)', 'relative'],
    ['a three-operand mix', 'color-mix(in oklab, var(--fill) 30%, var(--ink) 30%, white)', 'three'],
    ['a mix with no percentage', 'color-mix(in oklab, var(--fill), var(--ink))', 'percentage'],
    ['a mix with two percentages', 'color-mix(in oklab, var(--fill) 30%, var(--ink) 70%)', 'percentage'],
    ['a mix in another space', 'color-mix(in srgb, var(--fill) 30%, var(--ink))', 'srgb'],
    ['a mix with a hue method', 'color-mix(in oklch longer hue, var(--fill) 30%, var(--ink))', 'longer hue'],
    ['light-dark()', 'light-dark(white, black)', 'light-dark'],
    ['currentColor', 'currentColor', 'currentColor'],
    ['a var() inside a color function', 'oklch(var(--l) 0.1 200)', 'var()'],
  ])('reports %s as unmeasured, never a color', (_label, expression, expected) => {
    const values = { '--fill': 'oklch(54% 0.12 150)', '--ink': 'oklch(25% 0 0)', '--l': '50%' };
    expect(reason(expression, values)).toContain(expected);
  });

  it('never throws on malformed input', () => {
    for (const expression of ['color-mix(', 'color-mix(in oklab, red 50%', 'var(', 'var(--a', '', 'oklch(']) {
      expect(() => resolveColor(expression, lookup({}))).not.toThrow();
      expect(resolveColor(expression, lookup({})).ok).toBe(false);
    }
  });
});

/**
 * Chromium's computed value for each mix, read with `getComputedStyle(el).color` in Chromium
 * 153.0.8010.12 (Playwright 1.63) and recorded as printed. Chromium prints six significant digits,
 * and its last digit can sit one unit from the double-precision result (it prints -0.0778195 where
 * culori computes -0.07781944), so a component matches when it lies within one unit of the last
 * digit Chromium printed.
 */
const CHROMIUM: [expression: string, printed: string][] = [
  ['color-mix(in oklab, oklch(54% 0.12 150) 50%, oklch(25% 0 0))', 'oklab(0.395 -0.0519615 0.03)'],
  ['color-mix(in oklab, oklch(80% 0.13 78) 5%, oklch(92% 0 0))', 'oklab(0.914 0.00135143 0.00635796)'],
  ['color-mix(in oklab, oklch(55% 0.1 235) 95%, oklch(98.4% 0 0))', 'oklab(0.5717 -0.0544898 -0.0778195)'],
  ['color-mix(in oklab, oklch(50% 0.1 30) 90%, oklch(90% 0.05 200))', 'oklab(0.54 0.0732438 0.0432899)'],
  ['color-mix(in oklab, oklch(66% 0.17 27) 50%, oklch(92% 0 0))', 'oklab(0.79 0.0757356 0.0385892)'],
  ['color-mix(in oklch, oklch(58% 0.19 27) 30%, oklch(66% 0.17 200))', 'oklch(0.636 0.176 148.1)'],
  ['color-mix(in oklch, oklch(50% 0.1 30), oklch(90% 0.05 200) 25%)', 'oklch(0.6 0.0875 72.5)'],
  ['color-mix(in oklch, oklch(25% 0 0) 60%, oklch(70% 0.1 248))', 'oklch(0.43 0.04 315.2)'],
  ['color-mix(in oklch, oklch(70% 0.1 248) 10%, oklch(25% 0 0))', 'oklch(0.295 0.01 348.8)'],
  ['color-mix(in oklab, oklch(25% 0 0) 60%, transparent)', 'oklab(0.25 0 0 / 0.6)'],
  ['color-mix(in oklch, oklch(45% 0.1 248) 40%, transparent)', 'oklch(0.45 0.1 248 / 0.4)'],
];

/** One unit in the last digit a printed number carries (`0.0519615` gives 1e-7, `148.1` gives 0.1). */
function lastDigitUnit(printed: string): number {
  const decimals = printed.includes('.') ? printed.split('.')[1].length : 0;
  return 10 ** -decimals;
}

describe('resolveColor matches Chromium to the printed digit', () => {
  it.each(CHROMIUM)('%s', (expression, printed) => {
    const match = /^(oklab|oklch)\(([^/)]+)(?:\/\s*([^)]+))?\)$/.exec(printed);
    if (!match) throw new Error(`unreadable Chromium value ${printed}`);
    const [, mode, channels, alpha] = match;
    const expected = channels.trim().split(/\s+/);
    const mixed = color(expression);
    expect(mixed.mode).toBe(mode);
    const names = mode === 'oklab' ? ['l', 'a', 'b'] : ['l', 'c', 'h'];
    names.forEach((name, index) => {
      const actual = Number(mixed[name] ?? 0);
      const want = Number(expected[index]);
      expect(Math.abs(actual - want), `${name}: resolver ${actual}, Chromium ${expected[index]}`).toBeLessThanOrEqual(
        lastDigitUnit(expected[index])
      );
    });
    const wantAlpha = alpha === undefined ? 1 : Number(alpha.trim());
    expect(Math.abs((mixed.alpha ?? 1) - wantAlpha)).toBeLessThanOrEqual(alpha === undefined ? 0 : lastDigitUnit(alpha.trim()));
  });

  // An operand written in sRGB converts into oklab through culori's matrices, and Chromium's own
  // matrices differ from culori's in the fifth significant digit (Chromium reads white as L 0.999994).
  // The mix itself agrees; the conversion does not, so this case is held to a looser bound that
  // still sits far below anything a contrast ratio can see.
  it('stays within 1e-4 of Chromium for an operand written in sRGB', () => {
    const mixed = color('color-mix(in oklab, #1d4ed8 25%, white)');
    const chromium = { l: 0.87204, a: -0.0052827, b: -0.0540125 };
    for (const name of ['l', 'a', 'b'] as const) {
      expect(Math.abs(Number(mixed[name]) - chromium[name])).toBeLessThan(1e-4);
    }
  });
});

describe('dualGamutRatio', () => {
  it('measures black on white at 21:1 in both gamuts', () => {
    const { srgb, p3 } = dualGamutRatio('oklch(0% 0 0)', 'oklch(100% 0 0)');
    expect(srgb).toBeCloseTo(21, 5);
    expect(p3).toBeCloseTo(21, 5);
  });

  it('composites a translucent foreground over the ground before it measures', () => {
    const ground = 'oklch(100% 0 0)';
    const half = dualGamutRatio(color('color-mix(in oklab, oklch(0% 0 0) 50%, transparent)'), ground);
    const opaque = dualGamutRatio('oklch(0% 0 0)', ground);
    expect(half.srgb).toBeLessThan(opaque.srgb);
    expect(half.srgb).toBeGreaterThan(1);
    const transparent = dualGamutRatio(color('color-mix(in oklab, oklch(0% 0 0) 0%, transparent)'), ground);
    expect(transparent.srgb).toBeCloseTo(1, 5);
  });

  it('throws naming a string it cannot parse', () => {
    expect(() => dualGamutRatio('not-a-color', 'white')).toThrow(/not-a-color/);
  });
});
