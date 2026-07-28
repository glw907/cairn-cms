import { describe, it, expect } from 'vitest';
import { resolveConfig } from '../../../../lib/audit/config.js';
import { parseComponent } from '../../../../lib/audit/markup.js';
import { parseSheet } from '../../../../lib/audit/sheet.js';
import { applySuppressions } from '../../../../lib/audit/suppress.js';
import { typeScale } from '../../../../lib/audit/rules/static/type-scale.js';
import type { ParsedComponent } from '../../../../lib/audit/markup.js';

const SHEET = parseSheet(
  [
    '.type-body { font-size: var(--cairn-type-body); line-height: 1.25rem }',
    '.text-base { font-size: 1rem }',
    '.text-base-content { color: var(--color-base-content) }',
    '.text-\\[1\\.875rem\\] { font-size: 1.875rem }',
    // The escaped selectors Tailwind emits for a variant-prefixed and an arbitrary-property
    // utility. The sheet resolves them like any other class; only the rule's own prefilter used
    // to discard them before the lookup ran.
    '@media (width >= 96rem) { .\\32 xl\\:text-sm { font-size: var(--text-sm) } }',
    '@media (width >= 40rem) { .sm\\:text-\\[13px\\] { font-size: 13px } }',
    '.\\[font-size\\:1\\.375rem\\] { font-size: 1.375rem }',
    '.\\[text-underline-offset\\:2px\\] { text-underline-offset: 2px }',
  ].join(' ')
);

const CONFIG = resolveConfig('/site', null, () => true);

function check(...files: ParsedComponent[]) {
  return typeScale.check({ files, sheet: SHEET, config: CONFIG });
}

describe('type-scale', () => {
  it('flags a font-size class that resolves to no --cairn-type-* token', () => {
    const file = parseComponent('Fixture.svelte', '<span class="text-base">x</span>\n');
    const findings = check(file);
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe('type-scale');
    expect(findings[0].tier).toBe('error');
    expect(findings[0].message).toContain('text-base');
    expect(findings[0].message).toContain('--cairn-type-*');
  });

  it('passes a role utility, whose font-size resolves through a --cairn-type-* var', () => {
    const file = parseComponent('Fixture.svelte', '<span class="type-body">x</span>\n');
    expect(check(file)).toEqual([]);
  });

  // The finding this rule must not make, twice already made elsewhere in this initiative: a word
  // boundary alone matches the size token `text-base` inside the daisyUI color utility
  // `text-base-content`. Exact sheet resolution makes this test pass without any special-casing
  // in the rule itself.
  it('never confuses text-base-content (a color utility, no font-size decl) with text-base', () => {
    const file = parseComponent('Fixture.svelte', '<span class="text-base-content">x</span>\n');
    expect(check(file)).toEqual([]);
  });

  it('passes an arbitrary bracket literal that references a --cairn-type-* token', () => {
    const sheet = parseSheet('.text-\\[var\\(--cairn-type-heading\\)\\] { font-size: var(--cairn-type-heading) }');
    const file = parseComponent('Fixture.svelte', '<span class="text-[var(--cairn-type-heading)]">x</span>\n');
    expect(typeScale.check({ files: [file], sheet, config: CONFIG })).toEqual([]);
  });

  // A responsive type size is an in-distribution idiom in the admin, and the sheet resolves it to
  // the same declaration as its unprefixed form; only the rule's start-anchored prefilter made it
  // invisible.
  it('flags a size utility behind a variant prefix, which resolves identically', () => {
    const file = parseComponent('Fixture.svelte', '<p class="2xl:text-sm">x</p>\n');
    const findings = check(file);
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('2xl:text-sm');
  });

  it('flags an arbitrary size behind a variant prefix', () => {
    const file = parseComponent('Fixture.svelte', '<div class="sm:text-[13px]"></div>\n');
    expect(check(file)).toHaveLength(1);
  });

  it('flags the arbitrary-property form, which sets font-size with no namespace at all', () => {
    const file = parseComponent('Fixture.svelte', '<span class="[font-size:1.375rem]">x</span>\n');
    expect(check(file)).toHaveLength(1);
  });

  it('passes an arbitrary property that sets something other than font-size', () => {
    const file = parseComponent('Fixture.svelte', '<a class="[text-underline-offset:2px]">x</a>\n');
    expect(check(file)).toEqual([]);
  });

  it('is suppressed by a directive naming the rule, and counted', () => {
    const file = parseComponent(
      'Fixture.svelte',
      [
        '<!-- cairn-audit-disable-next-line type-scale -- the ratified wordmark exception -->',
        '<span class="text-[1.875rem]">Cairn</span>',
        '',
      ].join('\n')
    );
    const split = applySuppressions(check(file), [file]);
    expect(split.findings).toEqual([]);
    expect(split.suppressed.map((f) => f.ruleId)).toEqual(['type-scale']);
  });
});
