import { describe, it, expect } from 'vitest';
import { resolveConfig } from '../../../../lib/audit/config.js';
import { parseComponent } from '../../../../lib/audit/markup.js';
import { parseSheet } from '../../../../lib/audit/sheet.js';
import { motionProperty } from '../../../../lib/audit/rules/static/motion-property.js';
import type { ParsedComponent } from '../../../../lib/audit/markup.js';
import type { CssSource, Finding } from '../../../../lib/audit/types.js';

const CONFIG = resolveConfig('/site', null, () => true);
const EMPTY_SHEET = parseSheet('');

// The class-join surface's own compiled sheet: an arbitrary-value transition-property utility, a
// vendor component's own width transition (the drawer-side disagreement, decision 4), and an
// animate-* utility resolved through its --animate-* custom property and its own @keyframes block.
const SHEET = parseSheet(
  [
    '.transition-\\[width\\] { transition-property: width }',
    '.drawer-side { transition: width .2s ease-out }',
    ':root { --animate-fizzle: fizzle .2s ease; }',
    '.animate-fizzle { animation: var(--animate-fizzle); }',
    '@keyframes fizzle { 50% { width: 4px; opacity: .5 } }',
  ].join(' ')
);

const FRAME_OFFSET_RULE =
  ":where([data-theme='cairn-admin'], [data-theme='cairn-admin-dark']) [data-cairn-motion=\"frame-offset\"] " +
  '{ transition: margin-left 240ms ease; }';
const FRAME_OFFSET_RULE_TWO_PROPERTIES =
  ":where([data-theme='cairn-admin'], [data-theme='cairn-admin-dark']) [data-cairn-motion=\"frame-offset\"] " +
  '{ transition: margin-left 240ms ease, top 240ms ease; }';

function cssFile(source: string): CssSource {
  return { file: 'src/lib/components/cairn-admin.css', source };
}

function check(files: ParsedComponent[], cssFiles: CssSource[] = []): Finding[] {
  return motionProperty.check({ files, sheet: SHEET, config: CONFIG, cssFiles });
}

function component(markup: string, style?: string): ParsedComponent {
  const styleBlock = style ? `\n\n<style>\n${style}\n</style>\n` : '\n';
  return parseComponent('Fixture.svelte', `${markup}${styleBlock}`);
}

describe('motion-property: the property allowlist', () => {
  it('flags a class-join transition-[width] class', () => {
    const findings = check([component('<div class="transition-[width]"></div>')]);
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe('motion-property');
    expect(findings[0].tier).toBe('error');
    expect(findings[0].message).toContain('width');
  });

  it('flags a hand-authored CSS declaration transitioning width', () => {
    const findings = check([component('<div class="mover"></div>', '.mover { transition: width 200ms ease; }')]);
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('width');
  });

  it('produces no motion-property finding for transition: all, which motion-band owns', () => {
    const findings = check([component('<div class="mover"></div>', '.mover { transition: all 200ms ease; }')]);
    expect(findings.filter((f) => f.ruleId === 'motion-property')).toEqual([]);
  });

  it('passes an allowlisted paint property', () => {
    const findings = check([component('<div class="mover"></div>', '.mover { transition: opacity 200ms ease; }')]);
    expect(findings).toEqual([]);
  });

  it('produces a different message for a named-error property than for a merely-outside one', () => {
    const namedError = check([
      component('<div class="mover"></div>', '.mover { transition: margin-left 200ms ease; }'),
    ]);
    const outside = check([component('<div class="mover"></div>', '.mover { transition: max-width 200ms ease; }')]);
    expect(namedError[0].message).toContain('margin-left');
    expect(namedError[0].message).toContain('allowlist');
    expect(outside[0].message).toContain('max-width');
    expect(outside[0].message).toContain('allowlist');
    expect(namedError[0].message).not.toBe(outside[0].message);
  });
});

describe('motion-property: the three-property cap', () => {
  it('flags a transition declaration naming more than three properties in one list', () => {
    const findings = check([
      component(
        '<div class="mover"></div>',
        '.mover { transition: opacity 200ms ease, color 200ms ease, background-color 200ms ease, border-color 200ms ease; }'
      ),
    ]);
    expect(findings.some((f) => f.message.includes('4 properties'))).toBe(true);
  });

  it('passes a transition declaration naming exactly three properties', () => {
    const findings = check([
      component(
        '<div class="mover"></div>',
        '.mover { transition: opacity 200ms ease, color 200ms ease, background-color 200ms ease; }'
      ),
    ]);
    expect(findings).toEqual([]);
  });
});

describe('motion-property: the animate-* keyframe clause', () => {
  it('checks an animate-* utility through its --animate-* custom property\'s keyframes', () => {
    const findings = check([component('<div class="animate-fizzle"></div>')]);
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('width');
  });
});

describe('motion-property: the vendor class-join exemption', () => {
  it('exempts class="drawer-side" joined to the vendor width transition', () => {
    const findings = check([component('<div class="drawer-side"></div>')]);
    expect(findings).toEqual([]);
  });

  it('still flags the same declaration authored in an audited CSS file', () => {
    const findings = check(
      [component('<div class="unrelated"></div>')],
      [cssFile('.drawer-side { transition: width .2s ease-out; }')]
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('width');
  });

  it('exempts class="btn" joined to DaisyUI\'s own five-property transition list, over the cap', () => {
    const btnSheet = parseSheet(
      '.btn { transition-property: color, background-color, border-color, box-shadow, --btn-fs; }'
    );
    const findings = motionProperty.check({
      files: [component('<div class="btn"></div>')],
      sheet: btnSheet,
      config: CONFIG,
      cssFiles: [],
    });
    expect(findings).toEqual([]);
  });

  it('exempts class="modal" joined to its own vendor transitions', () => {
    const modalSheet = parseSheet('.modal { transition: transform .3s cubic-bezier(0.32, 0.72, 0, 1); }');
    const findings = motionProperty.check({
      files: [component('<div class="modal"></div>')],
      sheet: modalSheet,
      config: CONFIG,
      cssFiles: [],
    });
    expect(findings).toEqual([]);
  });

  it('exempts class="dropdown" joined to its own vendor transitions', () => {
    const dropdownSheet = parseSheet('.dropdown { transition: opacity, transform, display; }');
    const findings = motionProperty.check({
      files: [component('<div class="dropdown"></div>')],
      sheet: dropdownSheet,
      config: CONFIG,
      cssFiles: [],
    });
    expect(findings).toEqual([]);
  });

  it('exempts class="modal-box", DaisyUI\'s own four-property open/close transition', () => {
    const modalBoxSheet = parseSheet(
      '.modal-box { transition: translate .3s ease-out, scale .3s ease-out, opacity .2s ease-out 50ms, box-shadow .3s ease-out; }'
    );
    const findings = motionProperty.check({
      files: [component('<div class="modal-box"></div>')],
      sheet: modalBoxSheet,
      config: CONFIG,
      cssFiles: [],
    });
    expect(findings).toEqual([]);
  });

  it('exempts class="dropdown-content", the second half of the dropdown vendor pair', () => {
    const sheet = parseSheet('.dropdown .dropdown-content { transition-property: opacity, scale, display, overlay; }');
    const findings = motionProperty.check({
      files: [component('<div class="dropdown-content"></div>')],
      sheet,
      config: CONFIG,
      cssFiles: [],
    });
    expect(findings).toEqual([]);
  });

  it('exempts class="menu", DaisyUI\'s own details-content property list', () => {
    const sheet = parseSheet('.menu { transition-property: block-size, content-visibility; }');
    const findings = motionProperty.check({
      files: [component('<div class="menu"></div>')],
      sheet,
      config: CONFIG,
      cssFiles: [],
    });
    expect(findings).toEqual([]);
  });

  it('exempts class="checkbox", DaisyUI\'s own clip-path check mark motion', () => {
    const sheet = parseSheet('.checkbox:before { transition: clip-path .3s .1s, opacity .1s .1s, rotate .3s .1s, translate .3s .1s; }');
    const findings = motionProperty.check({
      files: [component('<div class="checkbox"></div>')],
      sheet,
      config: CONFIG,
      cssFiles: [],
    });
    expect(findings).toEqual([]);
  });

  it('exempts class="card", DaisyUI\'s own outline-shorthand focus transition', () => {
    const sheet = parseSheet('.card { transition: outline .2s ease-in-out; }');
    const findings = motionProperty.check({
      files: [component('<div class="card"></div>')],
      sheet,
      config: CONFIG,
      cssFiles: [],
    });
    expect(findings).toEqual([]);
  });
});

describe('motion-property: the transition: none idiom', () => {
  it('names zero properties, the same clearing transition: all already gets', () => {
    const findings = check([component('<div class="mover"></div>', '.mover { transition: none; }')]);
    expect(findings).toEqual([]);
  });
});

describe('motion-property: the Tailwind transition-utility class-join exemption', () => {
  const TEN_NAME_SHEET = parseSheet(
    [
      '.transition-colors {',
      '  transition-property: color, background-color, border-color, outline-color,',
      '    text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via,',
      '    --tw-gradient-to;',
      '}',
      '.cairn-many-props {',
      '  transition-property: color, background-color, border-color, outline-color,',
      '    text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via,',
      '    --tw-gradient-to;',
      '}',
    ].join('\n')
  );

  it('exempts class="transition-colors" from the cap and the allowlist, over both properties at once', () => {
    const findings = motionProperty.check({
      files: [component('<div class="transition-colors"></div>')],
      sheet: TEN_NAME_SHEET,
      config: CONFIG,
      cssFiles: [],
    });
    expect(findings).toEqual([]);
  });

  it('still convicts an authored class with the same ten-name compiled list, keyed on the name alone', () => {
    const findings = motionProperty.check({
      files: [component('<div class="cairn-many-props"></div>')],
      sheet: TEN_NAME_SHEET,
      config: CONFIG,
      cssFiles: [],
    });
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.some((f) => f.message.includes('10 properties'))).toBe(true);
  });
});

describe('motion-property: the frame-offset exception', () => {
  it('passes the carrying element, matching the declaring rule on containment rather than exact equality', () => {
    const findings = check(
      [component('<div data-cairn-motion="frame-offset"></div>')],
      [cssFile(FRAME_OFFSET_RULE)]
    );
    expect(findings).toEqual([]);
  });

  it('fails an element without the attribute transitioning margin-left', () => {
    const findings = check([
      component('<div class="mover"></div>', '.mover { transition: margin-left 200ms ease; }'),
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('margin-left');
  });

  it('fails the carrying element on a second layout property, past the one exempted margin-left', () => {
    const findings = check(
      [component('<div data-cairn-motion="frame-offset"></div>')],
      [cssFile(FRAME_OFFSET_RULE_TWO_PROPERTIES)]
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('"top"');
  });

  it('passes a consumer-owned carrying element, and fails a second carrying element on the same screen', () => {
    const findings = check(
      [component('<div data-cairn-motion="frame-offset"></div>\n<div data-cairn-motion="frame-offset"></div>')],
      [cssFile(FRAME_OFFSET_RULE)]
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('margin-left');
  });

  it('never grants the allowance to a bound or interpolated attribute value, and convicts margin-left instead', () => {
    const source = ['<script>', '  let mode = $state(\'frame-offset\');', '</script>', '<div data-cairn-motion={mode}></div>'].join(
      '\n'
    );
    const findings = motionProperty.check({
      files: [parseComponent('Fixture.svelte', `${source}\n`)],
      sheet: SHEET,
      config: CONFIG,
      cssFiles: [cssFile(FRAME_OFFSET_RULE)],
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('margin-left');
    expect(findings[0].file).toBe('src/lib/components/cairn-admin.css');
  });
});

describe('motion-property: display and overlay under allow-discrete', () => {
  it('passes a display/overlay pair carrying allow-discrete beside an allowlisted paint property', () => {
    const findings = check([
      component(
        '<div class="mover"></div>',
        '.mover { transition: opacity 120ms, display 120ms allow-discrete, overlay 120ms allow-discrete; }'
      ),
    ]);
    expect(findings).toEqual([]);
  });

  it('reads a comma inside var() and cubic-bezier() as an argument, never another transitioned property', () => {
    // The shape every admin-toolkit component authors: a token read with a literal fallback, and a
    // named curve token whose own fallback is a four-argument cubic-bezier. A naive comma split
    // reads each fragment as another property and reports both an over-cap count and a list of
    // nonsense property names.
    const findings = check([
      component(
        '<div class="mover"></div>',
        '.mover { transition: opacity var(--cairn-dur-base, 150ms) var(--cairn-ease-entrance, cubic-bezier(0, 0, 0.38, 0.9)),' +
          ' display var(--cairn-dur-base, 150ms) allow-discrete, overlay var(--cairn-dur-base, 150ms) allow-discrete; }'
      ),
    ]);
    expect(findings).toEqual([]);
  });

  it('still errors a display transition with no allow-discrete', () => {
    const findings = check([component('<div class="mover"></div>', '.mover { transition: display 120ms; }')]);
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('display');
  });

  it('still errors an overlay transition with no allow-discrete', () => {
    const findings = check([component('<div class="mover"></div>', '.mover { transition: overlay 120ms; }')]);
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('overlay');
  });

  it('still errors an unrelated layout property carrying allow-discrete, since the arm covers only display and overlay', () => {
    const findings = check([
      component('<div class="mover"></div>', '.mover { transition: height 120ms allow-discrete; }'),
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('height');
  });
});

describe('motion-property: admin scoping', () => {
  it('declares adminOnly, so it never reads a site\'s own public components', () => {
    expect(motionProperty.adminOnly).toBe(true);
  });
});
