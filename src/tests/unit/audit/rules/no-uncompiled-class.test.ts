import { describe, it, expect } from 'vitest';
import { resolveConfig } from '../../../../lib/audit/config.js';
import { parseComponent } from '../../../../lib/audit/markup.js';
import { parseSheet } from '../../../../lib/audit/sheet.js';
import { applySuppressions } from '../../../../lib/audit/suppress.js';
import { noUncompiledClass } from '../../../../lib/audit/rules/static/no-uncompiled-class.js';
import type { ParsedComponent } from '../../../../lib/audit/markup.js';

const SHEET = parseSheet('.card { border: 1px solid black } .type-body { font-size: .875rem }');
const CONFIG = resolveConfig('/site', null, () => true);

function check(...files: ParsedComponent[]) {
  return noUncompiledClass.check({ files, sheet: SHEET, config: CONFIG });
}

describe('no-uncompiled-class', () => {
  it('flags a class the built sheet never compiles', () => {
    const file = parseComponent('Fixture.svelte', '<div class="card ml-1"></div>\n');
    const findings = check(file);
    expect(findings.map((f) => f.message)).toEqual([
      expect.stringContaining('"ml-1" never compiles'),
    ]);
    expect(findings[0].ruleId).toBe('no-uncompiled-class');
    expect(findings[0].tier).toBe('error');
  });

  it('passes every class the sheet compiles', () => {
    const file = parseComponent('Fixture.svelte', '<div class="card type-body"></div>\n');
    expect(check(file)).toEqual([]);
  });

  // The scoped-style exclusion the old regex gate (check-admin-css-classes.mjs) also drew: a
  // class the component's own <style> block defines is Svelte-scoped, never the admin sheet's
  // job, so a markup reference to it is not a compiled-sheet miss.
  it('passes a class the component\'s own scoped <style> block defines', () => {
    const file = parseComponent(
      'Fixture.svelte',
      ['<div class="card section-head">x</div>', '<style>', '  .section-head { margin: 0 }', '</style>', ''].join(
        '\n'
      )
    );
    expect(check(file)).toEqual([]);
  });

  // daisyUI's own `.menu` component excludes `.disabled` items from hover/focus purely through
  // `:not(...)` negation; no rule anywhere declares `.disabled` positively. EntryPicker's real
  // `class:disabled` on a selected menu item is real, working daisyUI API, not an uncompiled miss.
  it('passes a class the sheet only ever negates', () => {
    const sheetWithNegation = parseSheet('.menu li:not(.menu-title, .disabled) { padding: 1px }');
    const file = parseComponent('Fixture.svelte', '<li class:disabled={selected}>x</li>\n');
    expect(noUncompiledClass.check({ files: [file], sheet: sheetWithNegation, config: CONFIG })).toEqual([]);
  });

  it('is suppressed by a directive naming the rule, and counted', () => {
    const file = parseComponent(
      'Fixture.svelte',
      [
        '<!-- cairn-audit-disable-next-line no-uncompiled-class -- a naming hook with no visual role -->',
        '<div class="cairn-test-hook"></div>',
        '',
      ].join('\n')
    );
    const split = applySuppressions(check(file), [file]);
    expect(split.findings).toEqual([]);
    expect(split.suppressed.map((f) => f.ruleId)).toEqual(['no-uncompiled-class']);
  });
});
