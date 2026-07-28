import { describe, it, expect } from 'vitest';
import { resolveConfig } from '../../../../lib/audit/config.js';
import { parseComponent } from '../../../../lib/audit/markup.js';
import { parseSheet } from '../../../../lib/audit/sheet.js';
import { applySuppressions } from '../../../../lib/audit/suppress.js';
import { reducedMotion } from '../../../../lib/audit/rules/static/reduced-motion.js';
import type { ParsedComponent } from '../../../../lib/audit/markup.js';

const SHEET = parseSheet('');
const CONFIG = resolveConfig('/site', null, () => true);

function check(...files: ParsedComponent[]) {
  return reducedMotion.check({ files, sheet: SHEET, config: CONFIG, cssFiles: [] });
}

function component(style: string): ParsedComponent {
  return parseComponent('Fixture.svelte', `<div class="card"></div>\n\n<style>\n${style}\n</style>\n`);
}

describe('reduced-motion', () => {
  it('flags a transition-bearing selector with no prefers-reduced-motion coverage', () => {
    const findings = check(component('.card { transition: color 200ms ease; }'));
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe('reduced-motion');
    expect(findings[0].tier).toBe('error');
    expect(findings[0].message).toContain('.card');
  });

  // HelpHome's own shipped pattern: a guard names both selectors as one comma list, and each is
  // read as its own alternative rather than needing to repeat the whole list.
  it('passes two selectors covered by one grouped guard rule', () => {
    const findings = check(
      component(
        [
          '.step-act { transition: border-color 150ms ease; }',
          '.btn-quiet { transition: border-color 150ms ease; }',
          '@media (prefers-reduced-motion: reduce) {',
          '  .btn-quiet, .step-act { transition: none; }',
          '}',
        ].join('\n')
      )
    );
    expect(findings).toEqual([]);
  });

  it('never flags a rule that neutralizes its own transition with none', () => {
    expect(check(component('.card { transition: none; }'))).toEqual([]);
  });

  it('is suppressed by a directive naming the rule, and counted', () => {
    const file = parseComponent(
      'Fixture.svelte',
      [
        '<div class="card"></div>',
        '',
        '<style>',
        '  /* cairn-audit-disable-next-line reduced-motion -- filed for the next pass */',
        '  .card { transition: color 200ms ease; }',
        '</style>',
        '',
      ].join('\n')
    );
    const split = applySuppressions(check(file), [file]);
    expect(split.findings).toEqual([]);
    expect(split.suppressed.map((f) => f.ruleId)).toEqual(['reduced-motion']);
  });
});
