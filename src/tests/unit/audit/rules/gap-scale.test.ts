import { describe, it, expect } from 'vitest';
import { resolveConfig } from '../../../../lib/audit/config.js';
import { parseComponent } from '../../../../lib/audit/markup.js';
import { parseSheet } from '../../../../lib/audit/sheet.js';
import { applySuppressions } from '../../../../lib/audit/suppress.js';
import { gapScale } from '../../../../lib/audit/rules/static/gap-scale.js';
import type { ParsedComponent } from '../../../../lib/audit/markup.js';

// A class the audited sheet never compiled falls back to its own bracket text, so an empty sheet
// still exercises the rule's scale arithmetic in full.
const SHEET = parseSheet('');
const CONFIG = resolveConfig('/site', null, () => true);

// The compiled form of the same utilities, with the escaped selectors Tailwind emits and the
// normalized values Lightning CSS writes: a leading zero dropped, a sign dropped, a unit lowercased.
const COMPILED = parseSheet(
  [
    '.mt-\\[7px\\] { margin-top: 7px }',
    '@media (width >= 40rem) { .sm\\:mt-\\[7px\\] { margin-top: 7px } }',
    '.hover\\:mt-\\[7px\\]:hover { margin-top: 7px }',
    '.mt-\\[0\\.4375rem\\] { margin-top: .4375rem }',
    '.mt-\\[\\.4375rem\\] { margin-top: .4375rem }',
    '.p-\\[7px\\] { padding: 7px }',
    '.p-\\[\\+7px\\] { padding: 7px }',
    '.gap-\\[7Px\\] { gap: 7px }',
    '@media (width >= 40rem) { .sm\\:mt-\\[12vh\\] { margin-top: 12vh } }',
  ].join(' ')
);

function check(...files: ParsedComponent[]) {
  return gapScale.check({ files, sheet: SHEET, config: CONFIG });
}

/** The same check against the compiled sheet, the substrate a real run resolves through. */
function checkCompiled(source: string) {
  const file = parseComponent('Fixture.svelte', source);
  return gapScale.check({ files: [file], sheet: COMPILED, config: CONFIG });
}

describe('gap-scale', () => {
  it('flags an arbitrary padding literal off the spacing grid', () => {
    const file = parseComponent('Fixture.svelte', '<div class="p-[13px]"></div>\n');
    const findings = check(file);
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe('gap-scale');
    expect(findings[0].tier).toBe('error');
    expect(findings[0].message).toContain('p-[13px]');
  });

  it('flags an arbitrary gap literal that names no ratified gap-role token', () => {
    // 11px === 0.6875rem, half a step off the 0.125rem grid: a genuinely invented value, not a
    // named step written as a bracket.
    const file = parseComponent('Fixture.svelte', '<div class="gap-[11px]"></div>\n');
    expect(check(file)).toHaveLength(1);
  });

  it('passes a named Tailwind step, never inspecting it', () => {
    const file = parseComponent('Fixture.svelte', '<div class="p-4 gap-3"></div>\n');
    expect(check(file)).toEqual([]);
  });

  it('passes an arbitrary literal that lands exactly on the spacing grid (a half-step of 0.125rem)', () => {
    // 3.875rem === 31 * 0.125rem: Tailwind's own generative spacing utility would write this as
    // `pl-15.5` (n * 0.25rem with n = 15.5, a legal half-step multiplier), so the bracket form
    // carries no invented value even though its multiplier is not a whole number.
    const file = parseComponent('Fixture.svelte', '<div class="pl-[3.875rem]"></div>\n');
    expect(check(file)).toEqual([]);
  });

  it('passes an arbitrary gap literal that references a ratified gap-role token', () => {
    const file = parseComponent(
      'Fixture.svelte',
      '<div class="gap-[var(--cairn-gap-control)]"></div>\n'
    );
    expect(check(file)).toEqual([]);
  });

  // A value with no fixed-length equivalent (a viewport unit, a calc(), an env()) is expressing
  // geometry the spacing scale has no vocabulary for, a safe-area inset or a viewport-relative
  // offset, not a spacing relationship the rule should ever have an opinion on.
  it('does not flag a viewport-relative arbitrary literal', () => {
    const file = parseComponent('Fixture.svelte', '<div class="mt-[12vh]"></div>\n');
    expect(check(file)).toEqual([]);
  });

  it('does not flag a calc()/env() arbitrary literal', () => {
    const file = parseComponent(
      'Fixture.svelte',
      '<div class="pb-[calc(0.5rem+env(safe-area-inset-bottom))]"></div>\n'
    );
    expect(check(file)).toEqual([]);
  });

  // A variant prefix changes when a declaration applies, never what it declares, and the sheet
  // resolves all three of these to the same margin.
  it('flags a bracket literal behind a responsive or state variant', () => {
    expect(checkCompiled('<div class="mt-[7px]"></div>\n')).toHaveLength(1);
    expect(checkCompiled('<div class="sm:mt-[7px]"></div>\n')).toHaveLength(1);
    expect(checkCompiled('<div class="hover:mt-[7px]"></div>\n')).toHaveLength(1);
  });

  it('still reads a variant-prefixed value outside the scale remit as outside it', () => {
    expect(checkCompiled('<div class="sm:mt-[12vh]"></div>\n')).toEqual([]);
  });

  // Notation, not value: each of these compiles byte-identically to a literal the rule already
  // flags, and reading the source text instead of the compiled declaration let the notation pass.
  it('flags a near-miss notation the sheet normalizes onto the same value', () => {
    expect(checkCompiled('<div class="mt-[0.4375rem]"></div>\n')).toHaveLength(1);
    expect(checkCompiled('<div class="mt-[.4375rem]"></div>\n')).toHaveLength(1);
    expect(checkCompiled('<div class="p-[7px]"></div>\n')).toHaveLength(1);
    expect(checkCompiled('<div class="p-[+7px]"></div>\n')).toHaveLength(1);
    expect(checkCompiled('<div class="gap-[7Px]"></div>\n')).toHaveLength(1);
  });

  it('is suppressed by a directive naming the rule, and counted', () => {
    const file = parseComponent(
      'Fixture.svelte',
      [
        '<!-- cairn-audit-disable-next-line gap-scale -- a one-off nav indent, filed for Pass 3 -->',
        '<div class="p-[13px]"></div>',
        '',
      ].join('\n')
    );
    const split = applySuppressions(check(file), [file]);
    expect(split.findings).toEqual([]);
    expect(split.suppressed.map((f) => f.ruleId)).toEqual(['gap-scale']);
  });
});
