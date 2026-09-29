import { describe, it, expect } from 'vitest';
import {
  arbitraryValueHazard,
  findAbsoluteFontSize,
  findColorLiteral,
  isPureAchromatic,
} from '../../../lib/audit/literals.js';

describe('findColorLiteral: each literal form', () => {
  const literals: [string, string, string][] = [
    ['hex', '#abc', 'hex'],
    ['hex with alpha', '1px solid #aabbcc80', 'hex'],
    ['rgb()', 'rgb(10 20 30)', 'rgb'],
    ['rgba()', 'rgba(10, 20, 30, 0.5)', 'rgb'],
    ['hsl()', 'hsl(120 50% 40%)', 'hsl'],
    ['hwb()', 'hwb(120 10% 20%)', 'hwb'],
    ['lab()', 'lab(50% 40 59)', 'lab'],
    ['lch()', 'lch(50% 60 30)', 'lch'],
    ['oklab()', 'oklab(60% 0.1 0.05)', 'oklab'],
    ['oklch()', 'oklch(60% 0.12 200)', 'oklch'],
    ['color()', 'color(display-p3 1 0 0)', 'color'],
    ['a named color', 'tomato', 'named'],
    ['a named color inside a shorthand', '1px solid white', 'named'],
  ];

  it.each(literals)('flags %s', (_label, value, form) => {
    expect(findColorLiteral(value)?.form).toBe(form);
  });

  const notLiterals = [
    'transparent',
    'currentColor',
    'currentcolor',
    'inherit',
    'initial',
    'unset',
    'revert',
    'revert-layer',
    'var(--color-primary)',
    'color-mix(in oklab, var(--color-primary) 50%, var(--color-base-100))',
    'none',
    'nowrap',
    '1px',
  ];

  it.each(notLiterals)('does not flag %s', (value) => {
    expect(findColorLiteral(value)).toBeNull();
  });

  it('reads hex before a function form, the priority token-colors reports in', () => {
    expect(findColorLiteral('oklch(60% 0.12 200) #fff')?.form).toBe('hex');
  });

  it('does not read lab( inside oklab( or color( inside color-mix(', () => {
    expect(findColorLiteral('oklab(60% 0.1 0.05)')?.form).toBe('oklab');
    expect(findColorLiteral('color-mix(in srgb, var(--a), var(--b))')).toBeNull();
  });
});

describe('isPureAchromatic', () => {
  it.each(['oklch(50% 0 75)', 'oklab(50% 0 0)', 'hsl(0 0% 50%)'])('is true for %s', (value) => {
    expect(isPureAchromatic(value)).toBe(true);
  });

  it.each(['oklch(60% 0.12 200)', 'oklab(60% 0.1 0.05)', 'hsl(120 50% 40%)', 'lab(50% 0 0)'])(
    'is false for %s',
    (value) => {
      expect(isPureAchromatic(value)).toBe(false);
    }
  );
});

describe('findAbsoluteFontSize', () => {
  it.each([
    ['font-size', '14px'],
    ['font-size', '12pt'],
    ['font-size', '0.875rem'],
    ['font-size', '1.25REM'],
    ['font', '0.9375rem/1.4 system-ui, sans-serif'],
    ['font', 'italic 700 16px/1.2 Georgia, serif'],
  ])('flags %s: %s', (property, value) => {
    expect(findAbsoluteFontSize(property, value)).not.toBeNull();
  });

  it.each([
    ['font-size', '0.88em'],
    ['font-size', '90%'],
    ['font-size', 'larger'],
    ['font-size', 'var(--text-sm)'],
    ['font-size', 'var(--text-sm, 0.875rem)'],
    ['font-size', 'calc(var(--text-sm) * 1.1)'],
    ['font-size', 'calc(var(--scale) * 1rem)'],
    ['font-size', 'clamp(1rem, var(--fluid), 2rem)'],
    ['font', '0.9375em/1.4 system-ui, sans-serif'],
    ['font', 'inherit'],
    ['line-height', '1.4rem'],
    ['margin', '14px'],
    ['width', '20rem'],
  ])('passes %s: %s', (property, value) => {
    expect(findAbsoluteFontSize(property, value)).toBeNull();
  });

  it('does not read a number that merely ends in a unit-like suffix', () => {
    expect(findAbsoluteFontSize('font-size', '1.2em')).toBeNull();
    expect(findAbsoluteFontSize('font-size', 'x14px')).toBeNull();
  });
});

describe('arbitraryValueHazard: a Tailwind arbitrary value', () => {
  it.each([
    ['text-[#abc]', 'color'],
    ['bg-[#abc]', 'color'],
    ['border-[rgb(1_2_3)]', 'color'],
    ['fill-[oklch(60%_0.12_200)]', 'color'],
    ['md:hover:bg-[#abc]', 'color'],
    ['bg-[#abc]/50', 'color'],
    ['!bg-[#abc]', 'color'],
    ['text-[color:tomato]', 'color'],
    ['[color:#abc]', 'color'],
    ['text-[14px]', 'font-size'],
    ['lg:text-[0.875rem]', 'font-size'],
    ['text-[length:12pt]', 'font-size'],
    ['[font-size:14px]', 'font-size'],
  ])('flags %s as a %s literal', (token, kind) => {
    expect(arbitraryValueHazard(token)?.kind).toBe(kind);
  });

  it.each([
    'text-sm',
    'text-lg',
    'bg-red-500',
    'bg-primary',
    'text-base-content',
    'text-[0.88em]',
    'text-[var(--text-sm)]',
    'bg-[var(--color-primary)]',
    'bg-[color:var(--color-primary)]',
    'w-[14px]',
    'p-[1rem]',
    'grid-cols-[1fr_auto]',
    'bg-[transparent]',
    'text-[currentColor]',
    'card',
  ])('passes %s', (token) => {
    expect(arbitraryValueHazard(token)).toBeNull();
  });
});
