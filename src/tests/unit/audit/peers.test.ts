import { describe, it, expect } from 'vitest';
import { loadDaisyThemeKeys, loadTailwindVariables, nodePeers } from '../../../lib/audit/peers.js';
import type { PeerAccess } from '../../../lib/audit/peers.js';

const STOCK = {
  light: { 'color-scheme': 'light', '--color-base-100': 'white', '--radius-box': '1rem', '--depth': '1' },
  nord: { 'color-scheme': 'light', '--color-base-100': 'grey', '--radius-box': '0.5rem', '--depth': '0' },
};

/** A peer access that resolves both packages and serves the given data. */
function access(over: Partial<PeerAccess> = {}): PeerAccess {
  return {
    resolve: (specifier) => `/x/${specifier}`,
    loadDefault: () => STOCK,
    readText: () => '@theme default { --color-red-500: red; --spacing: 0.25rem; }',
    ...over,
  };
}

describe('loadDaisyThemeKeys', () => {
  it('reads the key list and the built-in theme names from the theme object', () => {
    const { keys, builtInThemes } = loadDaisyThemeKeys('/site', access());
    expect(keys).toEqual(['color-scheme', '--color-base-100', '--radius-box', '--depth']);
    expect([...builtInThemes].sort()).toEqual(['light', 'nord']);
  });

  it('names daisyui and how to install it when it cannot be resolved', () => {
    const missing = access({ resolve: (specifier) => (specifier.startsWith('daisyui') ? undefined : `/x/${specifier}`) });
    expect(() => loadDaisyThemeKeys('/site', missing)).toThrow(/daisyui is not installed.*npm install --save-dev daisyui/);
  });

  it('fails loudly on an empty key list', () => {
    expect(() => loadDaisyThemeKeys('/site', access({ loadDefault: () => ({}) }))).toThrow(/empty/);
    expect(() => loadDaisyThemeKeys('/site', access({ loadDefault: () => ({ light: {} }) }))).toThrow(/empty/);
  });

  it('fails loudly on a list without --radius-box, and one without --color-base-100', () => {
    const noBox = { light: { 'color-scheme': 'light', '--color-base-100': 'white' } };
    expect(() => loadDaisyThemeKeys('/site', access({ loadDefault: () => noBox }))).toThrow(/--radius-box/);
    const noBase = { light: { 'color-scheme': 'light', '--radius-box': '1rem' } };
    expect(() => loadDaisyThemeKeys('/site', access({ loadDefault: () => noBase }))).toThrow(/--color-base-100/);
  });

  it('fails loudly when the module holds no theme object at all', () => {
    expect(() => loadDaisyThemeKeys('/site', access({ loadDefault: () => undefined }))).toThrow(/empty/);
  });
});

describe('loadTailwindVariables', () => {
  it('reads the custom properties tailwindcss/theme.css declares', () => {
    expect([...loadTailwindVariables('/site', access())].sort()).toEqual(['--color-red-500', '--spacing']);
  });

  it('names tailwindcss and how to install it when it cannot be resolved', () => {
    const missing = access({ resolve: (specifier) => (specifier.startsWith('tailwindcss') ? undefined : `/x/${specifier}`) });
    expect(() => loadTailwindVariables('/site', missing)).toThrow(/tailwindcss is not installed.*npm install --save-dev tailwindcss/);
  });

  it('fails loudly when the theme file declares no variable', () => {
    expect(() => loadTailwindVariables('/site', access({ readText: () => '' }))).toThrow(/no theme variable/);
    expect(() => loadTailwindVariables('/site', access({ readText: () => undefined }))).toThrow(/no theme variable/);
  });
});

describe('the installed peers', () => {
  it('resolve from the repository, with the real daisyUI list and Tailwind theme', () => {
    const { keys, builtInThemes } = loadDaisyThemeKeys(process.cwd(), nodePeers);
    expect(keys).toHaveLength(29);
    expect(keys).toContain('--radius-box');
    expect(builtInThemes.has('nord')).toBe(true);
    expect(loadTailwindVariables(process.cwd(), nodePeers).has('--color-red-500')).toBe(true);
  });
});
