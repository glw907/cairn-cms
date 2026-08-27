import { describe, it, expect } from 'vitest';
import { resolveConfig } from '../../../../lib/audit/config.js';
import { parseComponent } from '../../../../lib/audit/markup.js';
import { parseSheet } from '../../../../lib/audit/sheet.js';
import { applySuppressions } from '../../../../lib/audit/suppress.js';
import { unlayeredFontClobber } from '../../../../lib/audit/rules/static/unlayered-font-clobber.js';
import type { ParsedComponent } from '../../../../lib/audit/markup.js';

const SHEET = parseSheet('');
const CONFIG = resolveConfig('/site', null, () => true);

function check(...files: ParsedComponent[]) {
  return unlayeredFontClobber.check({ files, sheet: SHEET, config: CONFIG, cssFiles: [] });
}

describe('unlayered-font-clobber', () => {
  it('flags an unlayered scoped font-size/font-weight declaration on an element carrying font utilities', () => {
    const file = parseComponent(
      'Fixture.svelte',
      [
        '<h2 class="cairn-heading text-2xl font-bold">Title</h2>',
        '',
        '<style>',
        '  .cairn-heading { font-size: 1.5rem; font-weight: 700; }',
        '</style>',
        '',
      ].join('\n')
    );
    const findings = check(file);
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe('unlayered-font-clobber');
    expect(findings[0].tier).toBe('error');
    expect(findings[0].message).toContain('layer');
    expect(findings[0].message).toContain('font-size');
    expect(findings[0].message).toContain('text-2xl');
  });

  it('flags the font shorthand the same way', () => {
    const file = parseComponent(
      'Fixture.svelte',
      [
        '<span class="brand-mark font-mono">cairn</span>',
        '',
        '<style>',
        "  .brand-mark { font: 700 1.5rem/1.4 sans-serif; }",
        '</style>',
        '',
      ].join('\n')
    );
    const findings = check(file);
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('"font"');
  });

  // The fixed twin: the same markup and declaration, moved inside @layer components. Cascade
  // layer order now puts the scoped style BEHIND the utility layer, so it never wins.
  it('passes the same declaration wrapped in @layer components', () => {
    const file = parseComponent(
      'Fixture.svelte',
      [
        '<h2 class="cairn-heading text-2xl font-bold">Title</h2>',
        '',
        '<style>',
        '  @layer components {',
        '    .cairn-heading { font-size: 1.5rem; font-weight: 700; }',
        '  }',
        '</style>',
        '',
      ].join('\n')
    );
    expect(check(file)).toEqual([]);
  });

  it('never flags an unlayered font declaration when the element carries no font utility class', () => {
    const file = parseComponent(
      'Fixture.svelte',
      [
        '<h2 class="cairn-heading">Title</h2>',
        '',
        '<style>',
        '  .cairn-heading { font-size: 1.5rem; font-weight: 700; }',
        '</style>',
        '',
      ].join('\n')
    );
    expect(check(file)).toEqual([]);
  });

  it('never flags a non-font declaration on the same class', () => {
    const file = parseComponent(
      'Fixture.svelte',
      [
        '<h2 class="cairn-heading text-2xl font-bold">Title</h2>',
        '',
        '<style>',
        '  .cairn-heading { color: var(--color-primary); }',
        '</style>',
        '',
      ].join('\n')
    );
    expect(check(file)).toEqual([]);
  });

  // A row or list component repeats its own row class across many elements; the rule names the
  // hazard once per CSS rule, not once per element the class happens to match.
  it('flags a shared class matching several elements only once', () => {
    const file = parseComponent(
      'Fixture.svelte',
      [
        '<h2 class="cairn-heading text-2xl font-bold">First</h2>',
        '<h2 class="cairn-heading text-2xl font-bold">Second</h2>',
        '',
        '<style>',
        '  .cairn-heading { font-size: 1.5rem; font-weight: 700; }',
        '</style>',
        '',
      ].join('\n')
    );
    expect(check(file)).toHaveLength(1);
  });

  it('never flags a text-color utility, which names a color rather than a font-affecting size', () => {
    const file = parseComponent(
      'Fixture.svelte',
      [
        '<h2 class="cairn-heading text-primary">Title</h2>',
        '',
        '<style>',
        '  .cairn-heading { font-size: 1.5rem; }',
        '</style>',
        '',
      ].join('\n')
    );
    expect(check(file)).toEqual([]);
  });

  it('is suppressed by a directive naming the rule, and counted', () => {
    const file = parseComponent(
      'Fixture.svelte',
      [
        '<h2 class="cairn-heading text-2xl font-bold">Title</h2>',
        '',
        '<style>',
        '  /* cairn-audit-disable-next-line unlayered-font-clobber -- filed for the next pass */',
        '  .cairn-heading { font-size: 1.5rem; font-weight: 700; }',
        '</style>',
        '',
      ].join('\n')
    );
    const split = applySuppressions(check(file), [file]);
    expect(split.findings).toEqual([]);
    expect(split.suppressed.map((f) => f.ruleId)).toEqual(['unlayered-font-clobber']);
  });
});
