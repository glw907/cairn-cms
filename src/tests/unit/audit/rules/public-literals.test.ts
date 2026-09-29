import { describe, it, expect } from 'vitest';
import { resolveConfig } from '../../../../lib/audit/config.js';
import { lineAt, parseComponent } from '../../../../lib/audit/markup.js';
import { parseSheet } from '../../../../lib/audit/sheet.js';
import { applySuppressions } from '../../../../lib/audit/suppress.js';
import { publicLiterals } from '../../../../lib/audit/rules/static/public-literals.js';
import { tokenColors } from '../../../../lib/audit/rules/static/token-colors.js';
import type { CssSource } from '../../../../lib/audit/types.js';

// public-literals reads each public file's own <style> block, its inline styles, its class tokens,
// and the standalone CSS the public scope holds; it never resolves through the compiled sheet.
const SHEET = parseSheet('');
const CONFIG = resolveConfig('/site', null, () => true);

function check(files: { path: string; source: string }[] = [], css: CssSource[] = []) {
  return publicLiterals.check({
    files: files.map((file) => parseComponent(file.path, file.source)),
    sheet: SHEET,
    config: CONFIG,
    cssFiles: css,
  });
}

const route = (source: string) => [{ path: 'src/routes/+page.svelte', source }];
const routeStyle = (style: string) => route(`<div class="card"></div>\n\n<style>\n${style}\n</style>\n`);

describe('public-literals: what it flags, exactly once each', () => {
  it('registers as an advisory public-scope rule', () => {
    expect(publicLiterals.id).toBe('public-literals');
    expect(publicLiterals.tier).toBe('advisory');
    expect(publicLiterals.publicScope).toBe(true);
    expect(publicLiterals.adminOnly).toBeUndefined();
  });

  it('flags a hex color in a <style> block', () => {
    const findings = check(routeStyle('.card { color: #abc; }'));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ ruleId: 'public-literals', tier: 'advisory' });
    expect(findings[0].message).toContain('#abc');
  });

  it('flags an oklch() color in a style attribute', () => {
    const findings = check(route('<div style="color: oklch(60% 0.12 200)"></div>'));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('oklch');
  });

  it('flags an arbitrary Tailwind font size', () => {
    const findings = check(route('<p class="text-[14px]">x</p>'));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('14px');
  });

  it('flags an arbitrary Tailwind color', () => {
    const findings = check(route('<p class="bg-[#abc]">x</p>'));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('#abc');
  });

  it('flags a style: directive with a literal color', () => {
    const findings = check(route('<p style:color="#def">x</p>'));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('#def');
  });

  it('flags a literal custom property outside a theme root, in a component and in a CSS file', () => {
    expect(check(routeStyle(':global(:root) { --brand: #abc; }'))).toHaveLength(1);
    expect(check([], [{ file: 'src/chassis/prose.css', source: ':root { --brand: #abc; }' }])).toHaveLength(1);
  });

  it('flags an absolute font size in a declaration, rem included', () => {
    const findings = check(routeStyle('.card { font-size: 0.875rem; }'));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('0.875rem');
  });

  // The font shorthand carries a size, so an absolute one is an absolute font size.
  it('flags an absolute size inside the font shorthand, and passes a relative one', () => {
    expect(check(routeStyle('.card { font: 0.9375rem/1.4 system-ui, sans-serif; }'))).toHaveLength(1);
    expect(check(routeStyle('.card { font: 0.9375em/1.4 system-ui, sans-serif; }'))).toEqual([]);
  });

  it('flags a literal in a rule of a file that sits under a theme root, when it is not a custom property', () => {
    const findings = check([
      { path: 'src/theme/Chrome.svelte', source: '<i></i>\n<style>\n.a { color: #abc; }\n</style>\n' },
    ]);
    expect(findings).toHaveLength(1);
  });

  it('flags a standalone CSS file declaration', () => {
    const findings = check([], [{ file: 'src/chassis/prose.css', source: '.x { border-color: rebeccapurple; }' }]);
    expect(findings).toHaveLength(1);
    expect(findings[0].file).toBe('src/chassis/prose.css');
  });
});

describe('public-literals: what it passes', () => {
  it('passes a custom property definition in a theme component <style> block', () => {
    const findings = check([
      {
        path: 'src/theme/Chrome.svelte',
        source: '<i></i>\n<style>\n:global(:root) { --site-banner-radius: 4px; --site-tint: #abc; }\n</style>\n',
      },
    ]);
    expect(findings).toEqual([]);
  });

  it('passes the chassis scale rem steps and any custom property in the theme root file', () => {
    const findings = check([], [
      {
        file: 'src/chassis/tokens.css',
        source: '@theme {\n  --text-sm: 0.875rem;\n  --text-base: 1rem;\n  --color-brand: oklch(60% 0.12 200);\n}\n',
      },
      { file: 'src/theme/theme.css', source: ':root { --cairn-shadow: 0 1px 2px rgb(0 0 0 / 0.2); }' },
    ]);
    expect(findings).toEqual([]);
  });

  it('passes Tailwind stock utilities, relative sizes, and token reads', () => {
    const findings = check(
      route(
        '<p class="text-sm bg-red-500 text-base-content w-[14px] p-[1rem] bg-[var(--color-primary)] text-[0.88em]">x</p>\n' +
          '<style>\n.a { font-size: 0.88em; color: var(--color-primary); margin: 0.5rem; }\n' +
          '.b { font-size: calc(var(--text-sm) * 1.1); background: color-mix(in oklab, var(--color-primary) 50%, transparent); }\n</style>\n'
      )
    );
    expect(findings).toEqual([]);
  });

  it('passes the root element font-size, whatever it is set to', () => {
    const findings = check([], [
      {
        file: 'src/chassis/base.css',
        source: 'html { font-size: clamp(0.9rem, 0.85rem + 0.3vw, 1.1rem); }\n:root { font-size: 16px; }\n',
      },
    ]);
    expect(findings).toEqual([]);
  });

  it('does not pass a non-root font-size just because a root rule shares the file', () => {
    const findings = check([], [
      { file: 'src/chassis/base.css', source: 'html { font-size: 16px; }\n.x { font-size: 16px; }\n' },
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('16px');
  });

  it.each(['transparent', 'currentColor', 'inherit', 'unset'])('does not flag %s', (keyword) => {
    expect(check(routeStyle(`.card { color: ${keyword}; border-color: ${keyword}; }`))).toEqual([]);
  });
});

describe('public-literals: a color word inside a quoted string', () => {
  // A quoted string is content or a family name, not a color the declaration paints with.
  const quoted: [string, string][] = [
    ['generated content', '.card::before { content: "red"; }'],
    ['single-quoted content', ".card::before { content: 'white'; }"],
    ['a quoted font family', '.card { font-family: "Tomato Grotesk", sans-serif; }'],
    ['an escaped quote inside the string', '.card::before { content: "say \\"hi\\" red"; }'],
  ];

  it.each(quoted)('passes %s', (_label, rule) => {
    expect(check(routeStyle(rule))).toEqual([]);
  });

  it('passes a quoted color word in a standalone CSS file and a style attribute', () => {
    expect(check([], [{ file: 'src/chassis/prose.css', source: '.x::after { content: "red"; }' }])).toEqual([]);
    expect(check(route('<p style="font-family: \'Gold\', serif">x</p>'))).toEqual([]);
  });

  it('still flags a bare color word beside a quoted string', () => {
    const findings = check(routeStyle('.card { background: url("a.png") white; }'));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('white');
  });

  it('leaves token-colors reading the quoted word as before', () => {
    const files = routeStyle('.card::before { content: "red"; }');
    const parsed = files.map((file) => parseComponent(file.path, file.source));
    expect(tokenColors.check({ files: parsed, sheet: SHEET, config: CONFIG, cssFiles: [] })).toHaveLength(1);
  });
});

describe('public-literals: the shared core against token-colors', () => {
  // A chromatic oklch() is a literal `public-literals` names and `token-colors` never did, so the
  // admin tree's findings cannot move when the core learns a form.
  it('flags oklch(60% 0.12 200) in public-literals and not in token-colors', () => {
    const files = routeStyle('.card { color: oklch(60% 0.12 200); }');
    expect(check(files)).toHaveLength(1);
    const parsed = files.map((file) => parseComponent(file.path, file.source));
    expect(tokenColors.check({ files: parsed, sheet: SHEET, config: CONFIG, cssFiles: [] })).toEqual([]);
  });

  it('agrees with token-colors on a hex literal, so both would report the same declaration', () => {
    const files = routeStyle('.card { color: #abc; }');
    const parsed = files.map((file) => parseComponent(file.path, file.source));
    expect(tokenColors.check({ files: parsed, sheet: SHEET, config: CONFIG, cssFiles: [] })).toHaveLength(1);
    expect(check(files)).toHaveLength(1);
  });
});

describe('public-literals: positions', () => {
  it('lands a mixed style attribute finding on the literal, not on the interpolation', () => {
    const source = '<p>x</p>\n<div\n  style="color: #abc; width: {w}px"\n></div>\n';
    const findings = check(route(source));
    expect(findings).toHaveLength(1);
    expect(source.slice(findings[0].start, findings[0].end)).toBe('#abc');
    expect(findings[0].line).toBe(3);
  });

  it('lands a class-token finding on the token', () => {
    const source = '<p>x</p>\n<p class="card text-[14px]">y</p>\n';
    const [finding] = check(route(source));
    expect(source.slice(finding.start, finding.end)).toBe('text-[14px]');
    expect(finding.line).toBe(2);
  });

  it('lands a style: directive finding on the value', () => {
    const source = '<p style:color="#def">x</p>';
    const [finding] = check(route(source));
    expect(source.slice(finding.start, finding.end)).toBe('#def');
  });

  it('lands a <style> finding on the rule that declares it, at the file line', () => {
    const source = '<div></div>\n\n<style>\n.ok { margin: 0; }\n.bad { color: #abc; }\n</style>\n';
    const [finding] = check(route(source));
    expect(finding.line).toBe(lineAt(source, source.indexOf('.bad')));
    expect(finding.line).toBe(5);
  });
});

describe('public-literals: suppression', () => {
  it('is silenced by a directive above the offending node, like every other static rule', () => {
    const source =
      '<!-- cairn-audit-disable-next-line public-literals -- a brand swatch the spec fixes -->\n<p class="text-[14px]">x</p>\n';
    const file = parseComponent('src/routes/+page.svelte', source);
    const findings = publicLiterals.check({ files: [file], sheet: SHEET, config: CONFIG, cssFiles: [] });
    const split = applySuppressions(findings, [file]);
    expect(split.findings).toEqual([]);
    expect(split.suppressed.map((finding) => finding.ruleId)).toEqual(['public-literals']);
  });
});
