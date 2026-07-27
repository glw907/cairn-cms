import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
// The build script is plain ESM under scripts/; the unit project runs in Node.
import { buildAdminCss } from '../../../scripts/build-admin-css.mjs';
import { GRAMMAR_TOKENS } from '../../lib/design/grammar-tokens.js';

// One compile for the whole file, and deliberately the PLAIN build, byte-identical to what `npm run
// package` ships. An earlier draft scanned a probe fixture to defeat tree-shaking, which proved the
// utility DEFINITIONS were correct while saying nothing about what reaches a consumer; the role
// utilities are a documented public interface, so the input's `@source inline(...)` safelist now
// carries all ten into the shipped sheet and this file asserts against that sheet.
//
// Keep this to ONE buildAdminCss() call. @tailwindcss/postcss caches its compiler per `from` path
// across calls within one process (keyed on disk mtime, not on the in-memory input string), so a
// second call against the same input path silently replays the first call's compiled output instead
// of re-scanning. Splitting this file into two builds reproduced exactly that stale-cache bug.
let css: string;
let source: string;
beforeAll(async () => {
  css = await buildAdminCss();
  source = readFileSync(new URL('../../lib/components/cairn-admin.css', import.meta.url), 'utf8');
}, 60_000);

// CONTRACT: grammar tokens are the admin's structural type and spacing vocabulary (the
// `--cairn-type-*` and `--cairn-gap-*` custom properties). They are theme-invariant: declared
// once, outside the light and dark theme blocks, because a role like "body text size" or
// "control-to-control gap" does not change with the palette. A consuming site re-tunes the
// palette tokens (`--color-*`) to its own brand and never redeclares a grammar token; the
// structural vocabulary stays fixed so the admin's layout rhythm holds across any theme.
describe('grammar tokens', () => {
  it('declares every grammar token exactly once in the compiled sheet', () => {
    for (const name of GRAMMAR_TOKENS) {
      const declarations = css.match(new RegExp(`${name}:`, 'g')) ?? [];
      expect(declarations, `expected exactly one declaration of ${name}`).toHaveLength(1);
    }
  });

  // The build's lightningcss pass (build-admin-css.mjs stage 1b) strips a leading zero from a
  // sub-1 value ("0.9375rem" becomes ".9375rem") even with minify: false, since that normalization
  // is syntax lowering, not minification. Comparing the parsed rem number rather than the literal
  // string keeps the assertion tied to the locked scale's actual value, not the minifier's
  // formatting choice.
  function declaredRem(name: string): number {
    const declaration = css.match(new RegExp(`${name}:\\s*([^;]+);`));
    if (!declaration) throw new Error(`expected a declaration of ${name} in the compiled sheet`);
    const value = declaration[1].trim();
    const rem = value.match(/^([\d.]+)rem$/);
    if (!rem) throw new Error(`expected ${name} to be a rem value, got "${value}"`);
    return Number.parseFloat(rem[1]);
  }

  it('matches the locked type-role scale', () => {
    const typeScale: Record<string, number> = {
      '--cairn-type-title': 1.5,
      '--cairn-type-subtitle': 0.9375,
      '--cairn-type-body': 0.875,
      '--cairn-type-meta': 0.8125,
      '--cairn-type-label': 0.6875,
      '--cairn-type-chip': 0.625,
    };
    for (const [name, expected] of Object.entries(typeScale)) {
      expect(declaredRem(name), `expected ${name} to be ${expected}rem`).toBe(expected);
    }
  });

  it('matches the locked spacing-role scale', () => {
    const gapScale: Record<string, number> = {
      '--cairn-gap-label': 0.25,
      '--cairn-gap-control': 0.5,
      '--cairn-gap-group': 1,
      '--cairn-gap-section': 1.5,
    };
    for (const [name, expected] of Object.entries(gapScale)) {
      expect(declaredRem(name), `expected ${name} to be ${expected}rem`).toBe(expected);
    }
  });

  // Brace-matched rather than regexed: a theme block holds nested rules, so a match to the first
  // closing brace would stop inside one and read a truncated body.
  function themeBlockBody(selector: string): string {
    const start = source.indexOf(`${selector} {`);
    if (start < 0) throw new Error(`expected to find the ${selector} block in cairn-admin.css`);
    const open = source.indexOf('{', start);
    let depth = 0;
    for (let i = open; i < source.length; i++) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') {
        depth--;
        if (depth === 0) return source.slice(open + 1, i);
      }
    }
    throw new Error(`expected a closing brace for the ${selector} block`);
  }

  // Asserting theme-invariance against the COMPILED sheet is meaningless: the build's scoper
  // (scripts/build-admin-css.mjs) rewrites every rule, including a bare `:root` grammar-token
  // block, so it lands under BOTH `:where([data-theme='cairn-admin'], [data-theme='cairn-admin-dark'])`
  // at compile time regardless of where it started. The invariant "grammar tokens are declared
  // once, outside either theme's own block" only exists in the SOURCE file, so this reads the
  // source directly and checks the two theme blocks by brace-matching.
  it('declares no grammar token inside a theme-specific block (source, not compiled)', () => {
    for (const themeSelector of ["[data-theme='cairn-admin']", "[data-theme='cairn-admin-dark']"]) {
      const body = themeBlockBody(themeSelector);
      for (const name of GRAMMAR_TOKENS) {
        expect(body, `${themeSelector} must not declare ${name}`).not.toContain(name);
      }
    }
  });
});

// CONTRACT: the role utilities are the authoring interface for the grammar tokens above. A
// component writes a named role (type-body, gap-control), never a pixel value or a bracketed
// var() wrapper. Each type-* utility carries font-size ONLY (no weight, case, tracking, or color;
// see the block comment in scripts/admin-css.input.css for why a full recipe would strand most of
// the 66 real call sites), and each gap-* utility carries gap only.
describe('grammar-token role utilities', () => {
  const typeUtilities: Record<string, string> = {
    'type-title': '--cairn-type-title',
    'type-subtitle': '--cairn-type-subtitle',
    'type-body': '--cairn-type-body',
    'type-meta': '--cairn-type-meta',
    'type-label': '--cairn-type-label',
    'type-chip': '--cairn-type-chip',
  };

  const gapUtilities: Record<string, string> = {
    'gap-control': '--cairn-gap-control',
    'gap-label': '--cairn-gap-label',
    'gap-group': '--cairn-gap-group',
    'gap-section': '--cairn-gap-section',
  };

  // The build's stage-1 PostCSS output is pretty-printed (newlines and indentation, no minify), so
  // a rule reads ".type-title {\n    font-size: var(--cairn-type-title);\n  }" rather than a compact
  // single line. Collapsing whitespace before comparing keeps the assertion tied to the declaration,
  // not the formatter's line breaks.
  function ruleBody(className: string): string | null {
    const match = css.match(new RegExp(`\\.${className}\\s*\\{([^}]*)\\}`));
    if (!match) return null;
    return match[1].replace(/\s+/g, ' ').trim();
  }

  it('ships every type-* utility in the sheet a consumer gets', () => {
    for (const className of Object.keys(typeUtilities)) {
      expect(ruleBody(className), `expected a rule body for .${className}`).not.toBeNull();
    }
  });

  it('ships every gap-* utility in the sheet a consumer gets', () => {
    for (const className of Object.keys(gapUtilities)) {
      expect(ruleBody(className), `expected a rule body for .${className}`).not.toBeNull();
    }
  });

  it("sets each type-* utility's font-size from its grammar token, and nothing else", () => {
    for (const [className, tokenName] of Object.entries(typeUtilities)) {
      const body = ruleBody(className);
      expect(body, `expected a rule body for .${className}`).not.toBeNull();
      expect(body).toBe(`font-size: var(${tokenName});`);
    }
  });

  it("sets each gap-* utility's gap from its grammar token, and nothing else", () => {
    for (const [className, tokenName] of Object.entries(gapUtilities)) {
      const body = ruleBody(className);
      expect(body, `expected a rule body for .${className}`).not.toBeNull();
      expect(body).toBe(`gap: var(${tokenName});`);
    }
  });

  it('leaves the existing numeric Tailwind gap-2 rule unchanged (the collision guard)', () => {
    const body = ruleBody('gap-2');
    expect(body, 'expected .gap-2 to compile in the sheet').not.toBeNull();
    // Tailwind's numeric gap-2 resolves against its own spacing scale, never a --cairn-gap-* token.
    expect(body).not.toContain('--cairn-gap');
  });
});
