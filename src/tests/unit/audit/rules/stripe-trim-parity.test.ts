import { describe, it, expect } from 'vitest';
import { resolveConfig } from '../../../../lib/audit/config.js';
import { parseComponent } from '../../../../lib/audit/markup.js';
import { parseSheet } from '../../../../lib/audit/sheet.js';
import { applySuppressions } from '../../../../lib/audit/suppress.js';
import { stripeTrimParity } from '../../../../lib/audit/rules/static/stripe-trim-parity.js';
import type { ParsedComponent } from '../../../../lib/audit/markup.js';

const SHEET = parseSheet('');
const CONFIG = resolveConfig('/site', null, () => true);

function check(...files: ParsedComponent[]) {
  return stripeTrimParity.check({ files, sheet: SHEET, config: CONFIG, cssFiles: [] });
}

function component(style: string): ParsedComponent {
  return parseComponent('Fixture.svelte', `<div class="row"></div>\n\n<style>\n${style}\n</style>\n`);
}

describe('stripe-trim-parity', () => {
  it('flags an unconditioned :last-child padding trim co-occurring with a striped background', () => {
    const findings = check(
      component(
        [
          '.row:nth-child(odd) { background: var(--color-base-200); }',
          '.row:last-child { padding-bottom: 0; }',
        ].join('\n')
      )
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe('stripe-trim-parity');
    expect(findings[0].tier).toBe('error');
    expect(findings[0].message).toContain(':last-child:nth-child(odd)');
    expect(findings[0].message).toContain('"row"');
  });

  it('flags an unconditioned :first-child trim against a .table-zebra-style class', () => {
    const findings = check(
      component(
        [
          '.row.table-zebra { background: var(--color-base-200); }',
          '.row:first-child { padding-top: 0; }',
        ].join('\n')
      )
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain(':first-child');
  });

  // The fix: the trim is scoped to its own parity, so it only fires when the trimmed edge and
  // the stripe color actually agree.
  it('passes a trim already scoped to its own parity', () => {
    const findings = check(
      component(
        [
          '.row:nth-child(odd) { background: var(--color-base-200); }',
          '.row:last-child:nth-child(odd) { padding-bottom: 0; }',
        ].join('\n')
      )
    );
    expect(findings).toEqual([]);
  });

  it('never flags a first/last-child trim with no co-occurring stripe', () => {
    expect(check(component('.row:last-child { padding-bottom: 0; }'))).toEqual([]);
  });

  it('never flags a striped background with no first/last-child trim', () => {
    expect(check(component('.row:nth-child(odd) { background: var(--color-base-200); }'))).toEqual([]);
  });

  it('is suppressed by a directive naming the rule, and counted', () => {
    const file = parseComponent(
      'Fixture.svelte',
      [
        '<div class="row"></div>',
        '',
        '<style>',
        '  .row:nth-child(odd) { background: var(--color-base-200); }',
        '  /* cairn-audit-disable-next-line stripe-trim-parity -- filed for the next pass */',
        '  .row:last-child { padding-bottom: 0; }',
        '</style>',
        '',
      ].join('\n')
    );
    const split = applySuppressions(check(file), [file]);
    expect(split.findings).toEqual([]);
    expect(split.suppressed.map((f) => f.ruleId)).toEqual(['stripe-trim-parity']);
  });
});
