import { describe, it, expect } from 'vitest';
import { resolveConfig } from '../../../../lib/audit/config.js';
import { parseComponent } from '../../../../lib/audit/markup.js';
import { parseSheet } from '../../../../lib/audit/sheet.js';
import { applySuppressions } from '../../../../lib/audit/suppress.js';
import { gapScale } from '../../../../lib/audit/rules/static/gap-scale.js';
import type { ParsedComponent } from '../../../../lib/audit/markup.js';

// gap-scale reads only the class tokens themselves; it never resolves through the sheet, so an
// empty sheet exercises it fully.
const SHEET = parseSheet('');
const CONFIG = resolveConfig('/site', null, () => true);

function check(...files: ParsedComponent[]) {
  return gapScale.check({ files, sheet: SHEET, config: CONFIG });
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
