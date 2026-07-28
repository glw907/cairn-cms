import { describe, it, expect } from 'vitest';
import { resolveConfig } from '../../../../lib/audit/config.js';
import { parseComponent } from '../../../../lib/audit/markup.js';
import { parseSheet } from '../../../../lib/audit/sheet.js';
import { applySuppressions } from '../../../../lib/audit/suppress.js';
import { tokenColors } from '../../../../lib/audit/rules/static/token-colors.js';
import type { ParsedComponent } from '../../../../lib/audit/markup.js';

// token-colors reads only each file's own <style> block (and any named consumer CSS file); it
// never resolves through the compiled admin sheet.
const SHEET = parseSheet('');
const CONFIG = resolveConfig('/site', null, () => true);

function check(...files: ParsedComponent[]) {
  return tokenColors.check({ files, sheet: SHEET, config: CONFIG, cssFiles: [] });
}

function component(style: string): ParsedComponent {
  return parseComponent('Fixture.svelte', `<div class="card"></div>\n\n<style>\n${style}\n</style>\n`);
}

describe('token-colors: raw literals', () => {
  it('flags a raw hex color', () => {
    const findings = check(component('.card { color: #ffffff; }'));
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe('token-colors');
    expect(findings[0].tier).toBe('error');
    expect(findings[0].message).toContain('hex');
  });

  it('flags a raw rgb() color', () => {
    const findings = check(component('.card { background: rgba(255, 255, 255, 0.5); }'));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('rgb');
  });

  it('flags a raw named color', () => {
    const findings = check(component('.card { border-color: white; }'));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('white');
  });

  // The regex-substrate trap this rule must not repeat: a property NAME can contain a color word
  // (white-space) with no color literal anywhere in its VALUE.
  it('never flags white-space: nowrap, the property-name trap', () => {
    expect(check(component('.card { white-space: nowrap; }'))).toEqual([]);
  });

  it('passes a token reference through var()', () => {
    expect(check(component('.card { color: var(--color-base-content); }'))).toEqual([]);
  });
});

describe('token-colors: achromatics and their keywords', () => {
  it('flags a pure achromatic oklch (zero chroma)', () => {
    const findings = check(component('.card { color: oklch(50% 0 75); }'));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('achromatic');
  });

  it('passes a warm near-neutral oklch with nonzero chroma, cairn\'s own recipe', () => {
    expect(check(component('.card { color: oklch(97.5% 0.004 75); }'))).toEqual([]);
  });

  // transparent and currentColor are CSS keywords, not color choices the palette could supply.
  it('never flags transparent or currentColor', () => {
    const findings = check(
      component('.card { background: color-mix(in oklab, currentColor 10%, transparent); }')
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
        '  /* cairn-audit-disable-next-line token-colors -- migrating this swatch next */',
        '  .card { color: white; }',
        '</style>',
        '',
      ].join('\n')
    );
    const split = applySuppressions(check(file), [file]);
    expect(split.findings).toEqual([]);
    expect(split.suppressed.map((f) => f.ruleId)).toEqual(['token-colors']);
  });
});
