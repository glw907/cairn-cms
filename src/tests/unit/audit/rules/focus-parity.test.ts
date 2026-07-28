import { describe, it, expect } from 'vitest';
import { resolveConfig } from '../../../../lib/audit/config.js';
import { parseComponent } from '../../../../lib/audit/markup.js';
import { parseSheet } from '../../../../lib/audit/sheet.js';
import { applySuppressions } from '../../../../lib/audit/suppress.js';
import { focusParity } from '../../../../lib/audit/rules/static/focus-parity.js';
import type { ParsedComponent } from '../../../../lib/audit/markup.js';

const SHEET = parseSheet('');
const CONFIG = resolveConfig('/site', null, () => true);

function check(...files: ParsedComponent[]) {
  return focusParity.check({ files, sheet: SHEET, config: CONFIG, cssFiles: [] });
}

function component(style: string): ParsedComponent {
  return parseComponent('Fixture.svelte', `<button class="act">x</button>\n\n<style>\n${style}\n</style>\n`);
}

describe('focus-parity', () => {
  it('flags a :hover selector with no matching :focus-visible selector', () => {
    const findings = check(component('.act:hover { color: var(--color-primary); }'));
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe('focus-parity');
    expect(findings[0].tier).toBe('error');
    expect(findings[0].message).toContain(':hover');
  });

  it('passes a :hover selector paired with its own :focus-visible rule', () => {
    const findings = check(
      component(['.act:hover { color: var(--color-primary); }', '.act:focus-visible { color: var(--color-primary); }'].join('\n'))
    );
    expect(findings).toEqual([]);
  });

  // The idiom cairn's own recipe compacts to: one rule, a comma-joined selector list, so the
  // treatment is authored once.
  it('passes a :hover selector grouped with :focus-visible in one comma list', () => {
    const findings = check(component('.act:hover,\n.act:focus-visible {\n  color: var(--color-primary);\n}'));
    expect(findings).toEqual([]);
  });

  // ExpandableRow's own shipped case: a container's hover wash acknowledges a nested control
  // gaining focus, so :focus-within is the sanctioned counterpart to a container-level :hover.
  it('passes a container :hover paired with :focus-within instead of :focus-visible', () => {
    const findings = check(
      component(
        [
          '.row:hover > .cell { background: var(--color-base-200); }',
          '.row:focus-within > .cell { background: var(--color-base-200); }',
        ].join('\n')
      )
    );
    expect(findings).toEqual([]);
  });

  it('is suppressed by a directive naming the rule, and counted', () => {
    const file = parseComponent(
      'Fixture.svelte',
      [
        '<button class="act">x</button>',
        '',
        '<style>',
        '  /* cairn-audit-disable-next-line focus-parity -- filed for the next pass */',
        '  .act:hover { color: var(--color-primary); }',
        '</style>',
        '',
      ].join('\n')
    );
    const split = applySuppressions(check(file), [file]);
    expect(split.findings).toEqual([]);
    expect(split.suppressed.map((f) => f.ruleId)).toEqual(['focus-parity']);
  });
});
