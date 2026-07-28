import { describe, it, expect } from 'vitest';
import { resolveConfig } from '../../../../lib/audit/config.js';
import { parseComponent } from '../../../../lib/audit/markup.js';
import { parseSheet } from '../../../../lib/audit/sheet.js';
import { applySuppressions } from '../../../../lib/audit/suppress.js';
import { grammarBoundary } from '../../../../lib/audit/rules/static/grammar-boundary.js';
import type { ParsedComponent } from '../../../../lib/audit/markup.js';

const SHEET = parseSheet('');
const CONFIG = resolveConfig('/site', null, () => true);

function check(...files: ParsedComponent[]) {
  return grammarBoundary.check({ files, sheet: SHEET, config: CONFIG, cssFiles: [] });
}

function component(style: string): ParsedComponent {
  return parseComponent('Fixture.svelte', `<div class="card"></div>\n\n<style>\n${style}\n</style>\n`);
}

describe('grammar-boundary', () => {
  it('flags a component redeclaring a --cairn-type-* grammar token', () => {
    const findings = check(component(':root { --cairn-type-body: 1rem; }'));
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe('grammar-boundary');
    expect(findings[0].tier).toBe('error');
    expect(findings[0].message).toContain('--cairn-type-body');
  });

  it('flags a component redeclaring a --cairn-gap-* grammar token', () => {
    const findings = check(component('.card { --cairn-gap-control: 1rem; }'));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('--cairn-gap-control');
  });

  it('passes a site re-tuning a --color-* palette token, the sanctioned operation', () => {
    expect(check(component('[data-theme="cairn-admin"] { --color-primary: oklch(52% 0.2 293); }'))).toEqual(
      []
    );
  });

  it('passes a component reading a grammar token through var(), never declaring one', () => {
    expect(check(component('.card { font-size: var(--cairn-type-body); }'))).toEqual([]);
  });

  it('is suppressed by a directive naming the rule, and counted', () => {
    const file = parseComponent(
      'Fixture.svelte',
      [
        '<div class="card"></div>',
        '',
        '<style>',
        '  /* cairn-audit-disable-next-line grammar-boundary -- a one-off brand experiment */',
        '  :root { --cairn-type-body: 1rem; }',
        '</style>',
        '',
      ].join('\n')
    );
    const split = applySuppressions(check(file), [file]);
    expect(split.findings).toEqual([]);
    expect(split.suppressed.map((f) => f.ruleId)).toEqual(['grammar-boundary']);
  });
});
