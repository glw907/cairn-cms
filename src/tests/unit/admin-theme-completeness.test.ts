// cairn-cms: the admin themes' `@plugin "daisyui/theme"` blocks carry exactly daisyUI's own theme
// keys, read from daisyUI's theme object so the list tracks a daisyUI upgrade. Everything else a
// theme root sets lives in the plain unlayered root rule beside the block. Two value hazards are
// also barred: Tailwind's `@plugin` option parser splits a value at a top-level comma and keeps
// only the last part, silently, and grammar-tokens.test.ts and role-layer-contrast.test.ts read
// the oklch literals as source text that a single quote would break.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import daisyuiThemes from 'daisyui/theme/object';

const SOURCE = readFileSync(new URL('../../lib/components/cairn-admin.css', import.meta.url), 'utf8');
const THEME_NAMES = ['cairn-admin', 'cairn-admin-dark'];

/** The keys every daisyUI theme defines, taken from the first theme in daisyUI's own object. */
const DAISYUI_THEME_KEYS = Object.keys(Object.values(daisyuiThemes)[0]).sort();

/** The `name` option is the block's identity, not a theme variable. */
const IDENTITY_KEY = 'name';

/** Each `@plugin "daisyui/theme"` block's declarations, in source order, keyed by the block. */
function pluginThemeBlocks(source: string): { property: string; value: string }[][] {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks: { property: string; value: string }[][] = [];
  const opener = /@plugin\s+"daisyui\/theme"\s*\{/g;
  for (const match of css.matchAll(opener)) {
    const start = match.index + match[0].length;
    const end = css.indexOf('}', start);
    if (end === -1) throw new Error('unterminated @plugin "daisyui/theme" block');
    const body = css.slice(start, end);
    blocks.push(
      body
        .split(';')
        .map((decl) => decl.trim())
        .filter(Boolean)
        .map((decl) => {
          const colon = decl.indexOf(':');
          return { property: decl.slice(0, colon).trim(), value: decl.slice(colon + 1).trim() };
        }),
    );
  }
  return blocks;
}

/** True when `value` carries a comma outside any parentheses. */
function hasTopLevelComma(value: string): boolean {
  let depth = 0;
  for (const ch of value) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ',' && depth === 0) return true;
  }
  return false;
}

/** Every way the source's admin theme blocks break the contract, one message per problem. */
function themeBlockProblems(source: string, keys: string[]): string[] {
  const problems: string[] = [];
  const byName = new Map<string, { property: string; value: string }[]>();
  for (const decls of pluginThemeBlocks(source)) {
    const name = decls.find((d) => d.property === IDENTITY_KEY)?.value.replace(/^"|"$/g, '');
    if (name) byName.set(name, decls);
  }
  for (const name of THEME_NAMES) {
    const decls = byName.get(name);
    if (!decls) {
      problems.push(`${name}: no @plugin "daisyui/theme" block`);
      continue;
    }
    const declared = decls.map((d) => d.property).filter((p) => p !== IDENTITY_KEY);
    for (const key of keys) if (!declared.includes(key)) problems.push(`${name}: missing ${key}`);
    for (const prop of declared) if (!keys.includes(prop)) problems.push(`${name}: extra ${prop}`);
    for (const { property, value } of decls) {
      if (property === IDENTITY_KEY) continue;
      if (hasTopLevelComma(value)) problems.push(`${name}: ${property} has a top-level comma`);
      if (value.includes("'")) problems.push(`${name}: ${property} has a single quote`);
    }
  }
  return problems;
}

/** A well-formed block for `name`, every key set to a plain value, for the planted cases. */
function plantedBlock(name: string, overrides: Record<string, string | null> = {}): string {
  const values: Record<string, string | null> = Object.fromEntries(
    DAISYUI_THEME_KEYS.map((k) => [k, k === 'color-scheme' ? 'light' : 'oklch(50% 0.1 75)']),
  );
  Object.assign(values, overrides);
  const decls = Object.entries(values)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `  ${k}: ${v};`);
  return `@plugin "daisyui/theme" {\n  name: "${name}";\n${decls.join('\n')}\n}\n`;
}

describe('the admin theme blocks', () => {
  it("reads daisyUI's own theme key list", () => {
    // color-scheme, twenty color roles, three radii, two sizes, border, depth, noise.
    expect(DAISYUI_THEME_KEYS).toHaveLength(29);
    expect(DAISYUI_THEME_KEYS).toContain('--color-primary');
  });

  it("define exactly daisyUI's theme keys, with no top-level comma or single quote in a value", () => {
    expect(themeBlockProblems(SOURCE, DAISYUI_THEME_KEYS)).toEqual([]);
  });

  it('pass a well-formed planted pair', () => {
    const planted = plantedBlock('cairn-admin') + plantedBlock('cairn-admin-dark');
    expect(themeBlockProblems(planted, DAISYUI_THEME_KEYS)).toEqual([]);
  });

  it('fail on a planted missing key', () => {
    const planted = plantedBlock('cairn-admin', { '--noise': null }) + plantedBlock('cairn-admin-dark');
    expect(themeBlockProblems(planted, DAISYUI_THEME_KEYS)).toEqual(['cairn-admin: missing --noise']);
  });

  it('fail on a planted extra key', () => {
    const planted = plantedBlock('cairn-admin') + plantedBlock('cairn-admin-dark', { '--cairn-shadow': '0 1px 2px black' });
    expect(themeBlockProblems(planted, DAISYUI_THEME_KEYS)).toEqual(['cairn-admin-dark: extra --cairn-shadow']);
  });

  it('fail on a planted daisyUI flag, which is an extra key', () => {
    const planted = plantedBlock('cairn-admin', { default: 'true' }) + plantedBlock('cairn-admin-dark');
    expect(themeBlockProblems(planted, DAISYUI_THEME_KEYS)).toEqual(['cairn-admin: extra default']);
  });

  it('fail on a planted comma-bearing value, and pass a comma inside parentheses', () => {
    const planted =
      plantedBlock('cairn-admin', { '--color-primary': 'oklch(50% 0.1 75), red' }) +
      plantedBlock('cairn-admin-dark', { '--color-accent': 'color-mix(in oklab, red, blue)' });
    expect(themeBlockProblems(planted, DAISYUI_THEME_KEYS)).toEqual(['cairn-admin: --color-primary has a top-level comma']);
  });

  it('fail on a planted single quote', () => {
    const planted = plantedBlock('cairn-admin') + plantedBlock('cairn-admin-dark', { '--color-base-100': "'oklch(50% 0.1 75)'" });
    expect(themeBlockProblems(planted, DAISYUI_THEME_KEYS)).toEqual(['cairn-admin-dark: --color-base-100 has a single quote']);
  });

  it('fail when a theme has no block at all', () => {
    expect(themeBlockProblems(plantedBlock('cairn-admin'), DAISYUI_THEME_KEYS)).toEqual([
      'cairn-admin-dark: no @plugin "daisyui/theme" block',
    ]);
  });
});
