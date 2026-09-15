import { describe, it, expect } from 'vitest';
import { resolveConfig } from '../../../../lib/audit/config.js';
import { parseComponent } from '../../../../lib/audit/markup.js';
import { parseSheet } from '../../../../lib/audit/sheet.js';
import { focusParity } from '../../../../lib/audit/rules/static/focus-parity.js';
import { motionHoverGate } from '../../../../lib/audit/rules/static/motion-hover-gate.js';
import type { ParsedComponent } from '../../../../lib/audit/markup.js';

const CONFIG = resolveConfig('/site', null, () => true);
const SHEET = parseSheet('');

function check(...files: ParsedComponent[]) {
  return motionHoverGate.check({ files, sheet: SHEET, config: CONFIG, cssFiles: [] });
}

function component(style: string, markup = '<div class="card"></div>'): ParsedComponent {
  return parseComponent('Fixture.svelte', `${markup}\n\n<style>\n${style}\n</style>\n`);
}

describe('motion-hover-gate', () => {
  // The shipped model: a guarded rule declaring paint alone, never motion.
  it('passes the shipped model\'s shape, a guarded rule declaring paint only', () => {
    const findings = check(
      component(
        [
          '@media (hover: hover) {',
          "  .btn.cairn-btn-guarded[aria-disabled='true']:hover { --btn-bg: var(--color-base-300); }",
          '}',
        ].join('\n')
      )
    );
    expect(findings).toEqual([]);
  });

  it('fails an ungated :hover state whose base rule declares the transition', () => {
    const findings = check(
      component(['.step-act { transition: border-color 150ms ease; }', '.step-act:hover { border-color: blue; }'].join('\n'))
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe('motion-hover-gate');
    expect(findings[0].tier).toBe('error');
    expect(findings[0].message).toContain('.step-act:hover');
    expect(findings[0].message).toContain('@media (hover: hover)');
    expect(findings[0].message).toContain('.btn-active:hover');
    expect(findings[0].message).toContain(':focus-visible');
  });

  it('fails an ungated :hover rule declaring its own transition directly', () => {
    const findings = check(component('.btn-quiet:hover { transition: color 150ms ease; color: blue; }'));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('.btn-quiet:hover');
  });

  it('never reads a Tailwind hover: utility, out of scope by construction', () => {
    const findings = check(component('', '<div class="hover:bg-base-300 transition-colors"></div>'));
    expect(findings).toEqual([]);
  });

  it('passes a correctly split pair, :hover guarded and :focus-visible outside, alongside focus-parity', () => {
    const style = [
      '.step-act:hover { color: var(--color-primary); }',
      '@media (hover: hover) {',
      '  .step-act:hover { transition: color 150ms ease; }',
      '}',
      '.step-act:focus-visible { transition: color 150ms ease; color: var(--color-primary); }',
    ].join('\n');
    const file = component(style);
    expect(check(file)).toEqual([]);
    expect(focusParity.check({ files: [file], sheet: SHEET, config: CONFIG, cssFiles: [] })).toEqual([]);
  });

  it('fails a :focus-visible alternative declaring motion from inside the guard', () => {
    const findings = check(
      component(
        [
          '@media (hover: hover) {',
          '  .btn:hover { transition: color 150ms ease; }',
          '  .btn:focus-visible { transition: color 150ms ease; }',
          '}',
        ].join('\n')
      )
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('.btn:focus-visible');
    expect(findings[0].message).toContain('@media (hover: hover)');
    expect(findings[0].message).toContain('.btn-active:hover');
  });

  it('declares adminOnly, so it never reads a site\'s own public components', () => {
    expect(motionHoverGate.adminOnly).toBe(true);
  });
});
