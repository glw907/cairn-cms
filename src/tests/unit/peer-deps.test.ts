import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')) as {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

describe('package dependency contract', () => {
  const peers = ['@sveltejs/kit', 'svelte'];
  // The bare `codemirror` meta-package is not itself in this list: nothing imports it (only the
  // scoped @codemirror/* subpackages below are ever value-imported), so it is not a dependency.
  const editorDeps = ['@codemirror/lang-markdown', '@codemirror/state', '@codemirror/view'];

  it('declares the framework packages as peers', () => {
    for (const p of peers) expect(pkg.peerDependencies?.[p], `${p} must be a peer`).toBeTruthy();
  });

  it('never lists a framework package as a hard dependency', () => {
    for (const p of peers) expect(pkg.dependencies?.[p], `${p} must not be a dependency`).toBeUndefined();
  });

  it('floors svelte at ^5.56.3, above the 5.56.1 guard-clause miscompile', () => {
    // svelte 5.56.1 misprints parenthesized boolean groupings when compiling the shipped
    // .svelte sources, so the floor is a correctness contract, not a feature minimum. The
    // doctor's dependency-floors check reads this same range at runtime; raise it knowingly.
    expect(pkg.peerDependencies?.svelte).toBe('^5.56.3');
  });

  it('keeps the @sveltejs/kit floor at ^2.12', () => {
    expect(pkg.peerDependencies?.['@sveltejs/kit']).toBe('^2.12');
  });

  it('no longer declares carta-md anywhere', () => {
    expect(pkg.peerDependencies?.['carta-md']).toBeUndefined();
    expect(pkg.dependencies?.['carta-md']).toBeUndefined();
  });

  it('bundles the codemirror packages as hard dependencies', () => {
    for (const d of editorDeps) expect(pkg.dependencies?.[d], `${d} must be a dependency`).toBeTruthy();
  });
});
