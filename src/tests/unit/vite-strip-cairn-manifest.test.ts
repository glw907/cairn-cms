import { describe, it, expect } from 'vitest';
import type { Plugin } from 'vite';
import { stripCairnManifest } from '../../lib/vite/index.js';

const named = (name: string): Plugin => ({ name });

describe('stripCairnManifest', () => {
  it('drops a cairnManifest plugin nested inside a sub-array and keeps the others', () => {
    const cairn = named('cairn-manifest');
    const sveltekit = named('vite-plugin-svelte');
    const other = named('other-plugin');
    // A shared preset can nest the cairnManifest plugin inside a sub-array, the form Vite flattens.
    const plugins = [sveltekit, [cairn, other]];

    const stripped = stripCairnManifest(plugins);

    const names = stripped.map((p) => (p as Plugin | null)?.name);
    expect(names).not.toContain('cairn-manifest');
    expect(names).toContain('vite-plugin-svelte');
    expect(names).toContain('other-plugin');
  });

  it('drops a top-level cairnManifest plugin too', () => {
    const stripped = stripCairnManifest([named('cairn-manifest'), named('keep')]);
    const names = stripped.map((p) => (p as Plugin).name);
    expect(names).toEqual(['keep']);
  });

  it('passes falsy slots through without crashing', () => {
    const stripped = stripCairnManifest([null, undefined, false, named('keep')]);
    expect(stripped).toContain(null);
    expect(stripped).toContain(undefined);
    expect(stripped).toContain(false);
    expect((stripped.find((p) => !!p) as Plugin).name).toBe('keep');
  });
});
