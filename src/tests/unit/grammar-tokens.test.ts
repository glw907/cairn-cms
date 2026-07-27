import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
// The build script is plain ESM under scripts/; the unit project runs in Node.
import { buildAdminCss } from '../../../scripts/build-admin-css.mjs';
import { GRAMMAR_TOKENS } from '../../lib/design/grammar-tokens.js';

// CONTRACT: grammar tokens are the admin's structural type and spacing vocabulary (the
// `--cairn-type-*` and `--cairn-gap-*` custom properties). They are theme-invariant: declared
// once, outside the light and dark theme blocks, because a role like "body text size" or
// "control-to-control gap" does not change with the palette. A consuming site re-tunes the
// palette tokens (`--color-*`) to its own brand and never redeclares a grammar token; the
// structural vocabulary stays fixed so the admin's layout rhythm holds across any theme.
describe('grammar tokens', () => {
  let css: string;
  let source: string;
  beforeAll(async () => {
    css = await buildAdminCss();
    source = readFileSync(new URL('../../lib/components/cairn-admin.css', import.meta.url), 'utf8');
  }, 60_000);

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
  function remValue(declaration: string): number {
    const match = declaration.match(/^([\d.]+)rem$/);
    if (!match) throw new Error(`expected a rem value, got "${declaration}"`);
    return Number.parseFloat(match[1]);
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
    for (const [name, remValueExpected] of Object.entries(typeScale)) {
      const match = css.match(new RegExp(`${name}:\\s*([^;]+);`));
      expect(match, `expected a declaration of ${name}`).not.toBeNull();
      expect(remValue(match![1].trim())).toBe(remValueExpected);
    }
  });

  it('matches the locked spacing-role scale', () => {
    const gapScale: Record<string, number> = {
      '--cairn-gap-label': 0.25,
      '--cairn-gap-control': 0.5,
      '--cairn-gap-group': 1,
      '--cairn-gap-section': 1.5,
    };
    for (const [name, remValueExpected] of Object.entries(gapScale)) {
      const match = css.match(new RegExp(`${name}:\\s*([^;]+);`));
      expect(match, `expected a declaration of ${name}`).not.toBeNull();
      expect(remValue(match![1].trim())).toBe(remValueExpected);
    }
  });

  // Asserting theme-invariance against the COMPILED sheet is meaningless: the build's scoper
  // (scripts/build-admin-css.mjs) rewrites every rule, including a bare `:root` grammar-token
  // block, so it lands under BOTH `:where([data-theme='cairn-admin'], [data-theme='cairn-admin-dark'])`
  // at compile time regardless of where it started. The invariant "grammar tokens are declared
  // once, outside either theme's own block" only exists in the SOURCE file, so this reads the
  // source directly and checks the two theme blocks by brace-matching.
  it('declares no grammar token inside a theme-specific block (source, not compiled)', () => {
    for (const themeSelector of ["[data-theme='cairn-admin']", "[data-theme='cairn-admin-dark']"]) {
      const start = source.indexOf(`${themeSelector} {`);
      expect(start, `expected to find the ${themeSelector} block`).toBeGreaterThanOrEqual(0);
      const open = source.indexOf('{', start);
      let depth = 0;
      let end = -1;
      for (let i = open; i < source.length; i++) {
        if (source[i] === '{') depth++;
        else if (source[i] === '}' && --depth === 0) {
          end = i;
          break;
        }
      }
      expect(end, `expected to find the closing brace of ${themeSelector}`).toBeGreaterThan(open);
      const body = source.slice(open + 1, end);
      for (const name of GRAMMAR_TOKENS) {
        expect(body, `${themeSelector} must not declare ${name}`).not.toContain(name);
      }
    }
  });
});
