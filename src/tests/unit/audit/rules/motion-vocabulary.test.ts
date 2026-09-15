import { describe, it, expect } from 'vitest';
import { resolveConfig } from '../../../../lib/audit/config.js';
import { parseComponent } from '../../../../lib/audit/markup.js';
import { parseSheet } from '../../../../lib/audit/sheet.js';
import { motionVocabulary, motionVocabularyAbstentions } from '../../../../lib/audit/rules/static/motion-vocabulary.js';
import type { ParsedComponent } from '../../../../lib/audit/markup.js';
import type { CssSource, Finding } from '../../../../lib/audit/types.js';

const CONFIG = resolveConfig('/site', null, () => true);

// The companion assertion: the built sheet's two admin theme roots set the two Tailwind
// transition-default custom properties to cairn duration and easing tokens. Green in every fixture
// that is not itself testing the assertion's own failure mode.
const COMPANION_GREEN = [
  "[data-theme='cairn-admin'] { --default-transition-duration: var(--cairn-dur-base); --default-transition-timing-function: var(--cairn-ease-standard); }",
  "[data-theme='cairn-admin-dark'] { --default-transition-duration: var(--cairn-dur-base); --default-transition-timing-function: var(--cairn-ease-standard); }",
].join(' ');

// The built sheet the audit reads (dist/components/cairn-admin.css) emits the two admin theme
// roots with double-quoted attribute selectors, not the single-quoted form above; this shape
// proves the companion assertion's green path against what the build actually ships.
const COMPANION_GREEN_BUILD_QUOTES = [
  '[data-theme="cairn-admin"] { --default-transition-duration: var(--cairn-dur-base); --default-transition-timing-function: var(--cairn-ease-standard); }',
  '[data-theme="cairn-admin-dark"] { --default-transition-duration: var(--cairn-dur-base); --default-transition-timing-function: var(--cairn-ease-standard); }',
].join(' ');

const COMPANION_RED =
  "[data-theme='cairn-admin'] { --default-transition-duration: .15s; --default-transition-timing-function: ease; }";

function cssFile(source: string): CssSource {
  return { file: 'src/lib/components/cairn-admin.css', source };
}

function component(markup: string, style?: string): ParsedComponent {
  const styleBlock = style ? `\n\n<style>\n${style}\n</style>\n` : '\n';
  return parseComponent('Fixture.svelte', `${markup}${styleBlock}`);
}

function check(sheetCss: string, files: ParsedComponent[], cssFiles: CssSource[] = []): Finding[] {
  return motionVocabulary.check({ files, sheet: parseSheet(sheetCss), config: CONFIG, cssFiles });
}

function notes(sheetCss: string, files: ParsedComponent[], cssFiles: CssSource[] = []) {
  return motionVocabularyAbstentions({ files, sheet: parseSheet(sheetCss), config: CONFIG, cssFiles });
}

describe('motion-vocabulary: the CSS-family surface', () => {
  it('reproduces cairn-admin.css:545, naming both the literal duration and the bare ease', () => {
    const findings = check(COMPANION_GREEN, [component('<div class="mover"></div>', '.mover { transition: rotate 150ms ease; }')]);
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe('motion-vocabulary');
    expect(findings[0].tier).toBe('error');
    expect(findings[0].message).toContain('150ms');
    expect(findings[0].message).toContain('"ease"');
    expect(findings[0].message).toContain('--cairn-dur-base');
  });

  it('names the nearest of the five duration tokens by value, not always the same one', () => {
    const findings = check(COMPANION_GREEN, [
      component('<div class="mover"></div>', '.mover { transition: opacity 250ms var(--cairn-ease-standard); }'),
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('250ms');
    expect(findings[0].message).toContain('--cairn-dur-shift');
  });

  it('passes a duration and easing already written as cairn token references', () => {
    const findings = check(COMPANION_GREEN, [
      component('<div class="mover"></div>', '.mover { transition: opacity var(--cairn-dur-base) var(--cairn-ease-standard); }'),
    ]);
    expect(findings).toEqual([]);
  });

  it('passes animate-spin-shaped motion authored directly: an infinite linear animation exempts its duration', () => {
    const findings = check(COMPANION_GREEN, [
      component('<div class="mover"></div>', '.mover { animation: spin 1s linear infinite; }'),
    ]);
    expect(findings).toEqual([]);
  });

  it('records that a five-second linear infinite animation is deliberately not checked on duration', () => {
    const findings = check(COMPANION_GREEN, [
      component('<div class="mover"></div>', '.mover { animation: spin 5s linear infinite; }'),
    ]);
    expect(findings).toEqual([]);
  });

  it('fails an infinite animation declaring ease-in-out on its easing, even though its duration is exempt', () => {
    const findings = check(COMPANION_GREEN, [
      component('<div class="mover"></div>', '.mover { animation: spin 2s ease-in-out infinite; }'),
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('linear');
    expect(findings[0].message).toContain('ease-in-out');
  });

  it('fails a 700ms finite animation on both its literal duration and its literal easing', () => {
    const findings = check(COMPANION_GREEN, [
      component('<div class="mover"></div>', '.mover { animation: fizzle 700ms ease; }'),
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('700ms');
    expect(findings[0].message).toContain('"ease"');
  });
});

describe('motion-vocabulary: the class-join surface', () => {
  const CLASS_SHEET = [
    '.duration-\\[250ms\\] { transition-duration: 250ms; }',
    '.duration-\\(--cairn-dur-base\\) { transition-duration: var(--cairn-dur-base); }',
    // The compiled shape the build actually emits for a bare transition-colors utility: a
    // transition-property list plus the two custom-property-riding declarations that fall through
    // to the theme root's default, not a lone transition-property declaration.
    '.transition-colors { transition-property: color, background-color, border-color; transition-timing-function: var(--tw-ease, var(--default-transition-timing-function)); transition-duration: var(--tw-duration, var(--default-transition-duration)); }',
    ':root { --animate-spin: spin 1s linear infinite; }',
    '.animate-spin { animation: var(--animate-spin); }',
    ':root { --animate-fizzle: fizzle 700ms ease; }',
    '.animate-fizzle { animation: var(--animate-fizzle); }',
  ].join(' ');

  it('flags a literal arbitrary-value duration class', () => {
    const findings = check(`${COMPANION_GREEN} ${CLASS_SHEET}`, [component('<div class="duration-[250ms]"></div>')]);
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('250ms');
  });

  it('passes the token authoring form', () => {
    const findings = check(`${COMPANION_GREEN} ${CLASS_SHEET}`, [
      component('<div class="duration-(--cairn-dur-base)"></div>'),
    ]);
    expect(findings).toEqual([]);
  });

  it('passes transition-colors alone when the companion assertion is green, riding the theme default', () => {
    const findings = check(`${COMPANION_GREEN} ${CLASS_SHEET}`, [component('<div class="transition-colors"></div>')]);
    expect(findings).toEqual([]);
  });

  it('with the companion assertion forced red, reports the assertion and not the element', () => {
    const findings = check(`${COMPANION_RED} ${CLASS_SHEET}`, [component('<div class="transition-colors"></div>')]);
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('companion assertion');
    expect(findings[0].message).not.toContain('transition-colors');
  });

  it('passes transition-colors when the companion roots carry the double-quoted selector form the build emits', () => {
    const findings = check(`${COMPANION_GREEN_BUILD_QUOTES} ${CLASS_SHEET}`, [
      component('<div class="transition-colors"></div>'),
    ]);
    expect(findings).toEqual([]);
  });

  it('passes animate-spin on both halves, its duration exempt and its linear easing checked', () => {
    const findings = check(`${COMPANION_GREEN} ${CLASS_SHEET}`, [component('<div class="animate-spin"></div>')]);
    expect(findings).toEqual([]);
  });

  it('fails a 700ms finite animate-* class on both halves', () => {
    const findings = check(`${COMPANION_GREEN} ${CLASS_SHEET}`, [component('<div class="animate-fizzle"></div>')]);
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('700ms');
    expect(findings[0].message).toContain('"ease"');
  });
});

describe('motion-vocabulary: the vendor-class exemption', () => {
  const VENDOR_SHEET = [
    '.btn { transition: color .2s ease-out, background-color .2s ease-out; }',
    '.cairn-btn-like { transition: color .2s ease-out, background-color .2s ease-out; }',
    '.drawer-side { transition: width .2s ease-out; }',
  ].join(' ');

  it('exempts .btn, producing zero findings', () => {
    const findings = check(`${COMPANION_GREEN} ${VENDOR_SHEET}`, [component('<div class="btn"></div>')]);
    expect(findings).toEqual([]);
  });

  it('still convicts a cairn-authored class of the identical shape', () => {
    const findings = check(`${COMPANION_GREEN} ${VENDOR_SHEET}`, [component('<div class="cairn-btn-like"></div>')]);
    expect(findings.length).toBeGreaterThan(0);
  });

  it('exercises the explicit class-name fallback on a second vendor class, .drawer-side', () => {
    const findings = check(`${COMPANION_GREEN} ${VENDOR_SHEET}`, [component('<div class="drawer-side"></div>')]);
    expect(findings).toEqual([]);
  });
});

describe('motion-vocabulary: the three abstention shapes', () => {
  it('abstains on a var() occupying the shorthand property slot, recording a note and zero findings', () => {
    const files = [component('<div class="mover"></div>', '.mover { transition: var(--host-transition); }')];
    expect(check(COMPANION_GREEN, files)).toEqual([]);
    const recorded = notes(COMPANION_GREEN, files);
    expect(recorded).toHaveLength(1);
    expect(recorded[0].reason).toContain('property slot');
  });

  it('abstains on a calc() over a foreign variable, recording a note and zero findings', () => {
    const files = [
      component('<div class="mover"></div>', '.mover { transition-duration: calc(var(--host-base) * 2); }'),
    ];
    expect(check(COMPANION_GREEN, files)).toEqual([]);
    const recorded = notes(COMPANION_GREEN, files);
    expect(recorded).toHaveLength(1);
    expect(recorded[0].reason).toContain('calc()');
  });

  it('abstains on a shorthand carrying allow-discrete keywords, recording a note and zero findings', () => {
    const files = [
      component('<div class="mover"></div>', '.mover { transition: display 150ms allow-discrete; }'),
    ];
    expect(check(COMPANION_GREEN, files)).toEqual([]);
    const recorded = notes(COMPANION_GREEN, files);
    expect(recorded).toHaveLength(1);
    expect(recorded[0].reason).toContain('allow-discrete');
  });
});

describe('motion-vocabulary: admin scoping', () => {
  it('declares adminOnly, so it never reads a site\'s own public components', () => {
    expect(motionVocabulary.adminOnly).toBe(true);
  });
});
