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

  // The inverse-gate bug: `(prefers-reduced-motion: no-preference)` runs ONLY when the visitor has
  // NOT asked for reduced motion, so a rule inside it guards nothing a reduced-motion visitor would
  // see. Before the fix, `isReducedMotionGuarded` matched it too, so it registered `.card` as
  // guarded and this outer, genuinely unguarded `.card` rule went unflagged.
  it('still flags a selector whose only nearby guard-shaped rule is inside no-preference, the inverse gate', () => {
    const findings = check(
      component(
        [
          '.card { transition: color 200ms ease; }',
          '@media (prefers-reduced-motion: no-preference) {',
          '  .card { transition-duration: 400ms; }',
          '}',
        ].join('\n')
      )
    );
    expect(
      findings.some((f) => f.ruleId === 'reduced-motion' && f.message.includes('.card')),
      'expected the outer .card rule to still be flagged as unguarded'
    ).toBe(true);
  });

  // The bare boolean form, `@media (prefers-reduced-motion)` with no value, is CSS's own equivalent
  // to `(prefers-reduced-motion: reduce)`: it must count as a valid guard, not fall through to the
  // inverse-gate exclusion, which only names `no-preference` specifically.
  it('passes a selector covered by the bare boolean prefers-reduced-motion form', () => {
    const findings = check(
      component(
        [
          '.card { transition: color 200ms ease; }',
          '@media (prefers-reduced-motion) {',
          '  .card { transition: none; }',
          '}',
        ].join('\n')
      )
    );
    expect(findings).toEqual([]);
  });

  // cairn-admin.css's own shipped guard is a blanket universal-descendant selector, not a selector
  // named by text, and .cairn-caret's own `transition` shorthand is the shorthand-counts-as-longhand
  // case: the floor declares only `transition-duration`.
  it('discharges a rule under a blanket floor that zeroes the transition-duration longhand its shorthand implies', () => {
    const findings = check(
      component(
        [
          '.cairn-caret { transition: rotate 150ms ease; }',
          '@media (prefers-reduced-motion: reduce) {',
          "  [data-theme='cairn-admin'] * { transition-duration: 0.01ms; }",
          '}',
        ].join('\n')
      )
    );
    expect(findings).toEqual([]);
  });

  it('discharges a rule declaring the longhand directly under the same blanket floor', () => {
    const findings = check(
      component(
        [
          '.cairn-caret { transition-duration: 150ms; }',
          '@media (prefers-reduced-motion: reduce) {',
          "  [data-theme='cairn-admin'] * { transition-duration: 0.01ms; }",
          '}',
        ].join('\n')
      )
    );
    expect(findings).toEqual([]);
  });

  // The floor's own longhand never proves it zeroes a property the longhand doesn't cover, so a
  // rule declaring only transition-timing-function still owes its own guarded sibling.
  it('still flags a rule declaring only transition-timing-function under a blanket floor that never touches it', () => {
    const findings = check(
      component(
        [
          '.cairn-caret { transition-timing-function: ease; }',
          '@media (prefers-reduced-motion: reduce) {',
          "  [data-theme='cairn-admin'] * { transition-duration: 0.01ms; }",
          '}',
        ].join('\n')
      )
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe('reduced-motion');
    expect(findings[0].message).toContain('.cairn-caret');
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
