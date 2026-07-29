import { describe, it, expect } from 'vitest';
import { resolveConfig } from '../../../../lib/audit/config.js';
import { parseComponent } from '../../../../lib/audit/markup.js';
import { parseSheet } from '../../../../lib/audit/sheet.js';
import { applySuppressions } from '../../../../lib/audit/suppress.js';
import { motionBand } from '../../../../lib/audit/rules/static/motion-band.js';
import type { ParsedComponent } from '../../../../lib/audit/markup.js';

const SHEET = parseSheet('');
const CONFIG = resolveConfig('/site', null, () => true);

function check(...files: ParsedComponent[]) {
  return motionBand.check({ files, sheet: SHEET, config: CONFIG, cssFiles: [] });
}

function component(style: string): ParsedComponent {
  return parseComponent('Fixture.svelte', `<div class="card"></div>\n\n<style>\n${style}\n</style>\n`);
}

describe('motion-band: transition: all', () => {
  it('flags a transition naming "all" as the transitioned property', () => {
    const findings = check(component('.card { transition: all 200ms ease; }'));
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe('motion-band');
    expect(findings[0].tier).toBe('error');
    expect(findings[0].message).toContain('all');
  });

  it('passes a transition naming its properties explicitly', () => {
    expect(check(component('.card { transition: border-color 200ms ease; }'))).toEqual([]);
  });

  // Nesting a child inside a scoped rule used to hide the parent's own declarations from every
  // CSS-family rule, this one included.
  it('reads a rule that nests a child alongside its own transition', () => {
    const findings = check(
      component('.card { transition: all 900ms ease; &:hover { opacity: 1 } }')
    );
    expect(findings).toHaveLength(2);
    expect(findings.some((f) => f.message.includes('all'))).toBe(true);
    expect(findings.some((f) => f.message.includes('900ms'))).toBe(true);
  });
});

describe('motion-band: the duration band', () => {
  it('flags a duration below the 150-250ms band', () => {
    const findings = check(component('.card { transition: color 80ms ease; }'));
    expect(findings.some((f) => f.message.includes('80ms'))).toBe(true);
  });

  it('flags a duration above the band', () => {
    const findings = check(component('.card { transition: color 400ms ease; }'));
    expect(findings.some((f) => f.message.includes('400ms'))).toBe(true);
  });

  it('flags a duration written in seconds', () => {
    const findings = check(component('.card { animation-duration: 0.4s; }'));
    expect(findings.some((f) => f.message.includes('400ms'))).toBe(true);
  });

  it('passes a duration inside the band', () => {
    expect(check(component('.card { transition: color 200ms ease; }'))).toEqual([]);
  });

  it('never flags a duration inside a prefers-reduced-motion guard', () => {
    const findings = check(
      component(
        [
          '.card { transition: color 200ms ease; }',
          '@media (prefers-reduced-motion: reduce) {',
          '  .card { transition-duration: 0.01ms; }',
          '}',
        ].join('\n')
      )
    );
    expect(findings).toEqual([]);
  });

  it('is suppressed by a directive naming the rule, and counted', () => {
    const file = parseComponent(
      'Fixture.svelte',
      [
        '<div class="card"></div>',
        '',
        '<style>',
        '  /* cairn-audit-disable-next-line motion-band -- a deliberate slow reveal, filed for Pass 3 */',
        '  .card { transition: color 400ms ease; }',
        '</style>',
        '',
      ].join('\n')
    );
    const split = applySuppressions(check(file), [file]);
    expect(split.findings).toEqual([]);
    expect(split.suppressed.map((f) => f.ruleId)).toEqual(['motion-band']);
  });
});
