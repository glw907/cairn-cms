import { describe, it, expect } from 'vitest';
import { resolveConfig } from '../../../../lib/audit/config.js';
import { parseComponent } from '../../../../lib/audit/markup.js';
import { parseSheet } from '../../../../lib/audit/sheet.js';
import {
  radiusScale,
  RADIUS_SCALE_PROMOTION_VERSION,
} from '../../../../lib/audit/rules/static/radius-scale.js';
import type { ParsedComponent } from '../../../../lib/audit/markup.js';

// The rule reads only class tokens; it never resolves through the sheet.
const SHEET = parseSheet('');
const CONFIG = resolveConfig('/site', null, () => true);

function check(...files: ParsedComponent[]) {
  return radiusScale.check({ files, sheet: SHEET, config: CONFIG });
}

function fixture(markup: string): ParsedComponent {
  return parseComponent('Fixture.svelte', markup);
}

describe('radius-scale: fixed and bare radii', () => {
  it('flags a fixed radius on a btn, naming rounded-field', () => {
    const findings = check(fixture('<button class="btn rounded-lg">Save</button>\n'));
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe('radius-scale');
    expect(findings[0].tier).toBe('advisory');
    expect(findings[0].message).toContain('rounded-field');
    expect(findings[0].message).toContain(RADIUS_SCALE_PROMOTION_VERSION);
  });

  it('flags a fixed radius on a card, naming rounded-box', () => {
    const findings = check(fixture('<div class="card rounded-xl">x</div>\n'));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('rounded-box');
    expect(findings[0].message).toContain(RADIUS_SCALE_PROMOTION_VERSION);
  });

  it('flags a bare rounded on a plain div with the three-role sentence', () => {
    const findings = check(fixture('<div class="rounded">x</div>\n'));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('rounded-selector');
    expect(findings[0].message).toContain('rounded-field');
    expect(findings[0].message).toContain('rounded-box');
    expect(findings[0].message).toContain(RADIUS_SCALE_PROMOTION_VERSION);
  });

  it('flags a fixed radius behind a responsive variant', () => {
    const findings = check(fixture('<div class="md:rounded-lg">x</div>\n'));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain(RADIUS_SCALE_PROMOTION_VERSION);
  });

  it('flags a side or corner form of a fixed radius', () => {
    const findings = check(fixture('<div class="rounded-t-2xl">x</div>\n'));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain(RADIUS_SCALE_PROMOTION_VERSION);
  });
});

describe('radius-scale: arbitrary and variable-shorthand radii', () => {
  it('flags an arbitrary bracket radius with no ratified role', () => {
    const findings = check(fixture('<div class="rounded-[0.55rem]">x</div>\n'));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain(RADIUS_SCALE_PROMOTION_VERSION);
  });

  it('flags an arbitrary bracket radius naming a ratified role token, with the exact class', () => {
    const findings = check(fixture('<div class="rounded-[var(--radius-field)]">x</div>\n'));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('rounded-field');
    expect(findings[0].message).toContain(RADIUS_SCALE_PROMOTION_VERSION);
  });

  it('flags the variable-shorthand form naming a ratified role, with the exact class', () => {
    const findings = check(fixture('<div class="rounded-(--radius-field)">x</div>\n'));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('rounded-field');
    expect(findings[0].message).toContain(RADIUS_SCALE_PROMOTION_VERSION);
  });

  it('flags the variable-shorthand form naming an unratified var with the three-role sentence', () => {
    const findings = check(fixture('<div class="rounded-(--my-radius)">x</div>\n'));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('rounded-selector');
    expect(findings[0].message).toContain('rounded-field');
    expect(findings[0].message).toContain('rounded-box');
    expect(findings[0].message).toContain(RADIUS_SCALE_PROMOTION_VERSION);
  });
});

describe('radius-scale: rounded-full and chips', () => {
  it('flags rounded-full on a badge, naming rounded-selector', () => {
    const findings = check(fixture('<span class="badge rounded-full">New</span>\n'));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('rounded-selector');
    expect(findings[0].message).toContain(RADIUS_SCALE_PROMOTION_VERSION);
  });

  it('passes rounded-full on an avatar with no badge class', () => {
    expect(check(fixture('<div class="avatar rounded-full">x</div>\n'))).toEqual([]);
  });
});

describe('radius-scale: multiple findings on one element', () => {
  it('raises exactly two findings for two offending tokens on the same element', () => {
    const findings = check(fixture('<div class="rounded-lg md:rounded-xl">x</div>\n'));
    expect(findings).toHaveLength(2);
    for (const finding of findings) {
      expect(finding.message).toContain(RADIUS_SCALE_PROMOTION_VERSION);
    }
  });
});

describe('radius-scale: passing fixtures', () => {
  it('passes the ratified role classes and their side forms', () => {
    expect(check(fixture('<div class="rounded-field">x</div>\n'))).toEqual([]);
    expect(check(fixture('<div class="rounded-t-box">x</div>\n'))).toEqual([]);
  });

  it('passes rounded-none', () => {
    expect(check(fixture('<div class="rounded-none">x</div>\n'))).toEqual([]);
  });

  it('passes a structural side zero on a joined edge', () => {
    expect(check(fixture('<div class="join-item rounded-l-none">x</div>\n'))).toEqual([]);
  });
});

describe('radius-scale: the class-to-role mapping', () => {
  const cases: Array<[string, string]> = [
    ['badge', 'rounded-selector'],
    ['btn', 'rounded-field'],
    ['input', 'rounded-field'],
    ['select', 'rounded-field'],
    ['textarea', 'rounded-field'],
    ['card', 'rounded-box'],
    ['modal-box', 'rounded-box'],
    ['dropdown-content', 'rounded-box'],
  ];

  it.each(cases)('names %s\'s own role class for a rounded-lg on it', (daisyClass, roleClass) => {
    const findings = check(fixture(`<div class="${daisyClass} rounded-lg">x</div>\n`));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain(roleClass);
    expect(findings[0].message).toContain(RADIUS_SCALE_PROMOTION_VERSION);
  });
});

describe('radius-scale: the promotion version', () => {
  it('names 0.99.0 in every finding', () => {
    const findings = check(
      fixture('<div class="rounded rounded-[0.55rem] rounded-(--my-radius)">x</div>\n')
    );
    expect(findings.length).toBeGreaterThan(0);
    for (const finding of findings) {
      expect(finding.message).toContain(RADIUS_SCALE_PROMOTION_VERSION);
    }
  });
});
