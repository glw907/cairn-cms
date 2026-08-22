import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')) as {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional: boolean }>;
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

  it('floors svelte at ^5.56.10, the version cairn develops and tests against', () => {
    // Geoff's 2026-08-21 ruling: the floor tracks the versions cairn actually develops and
    // tests against, not a historical minimum, so the engine may use their full capabilities
    // with no guards for older minors. ^5.56.3 was itself raised past the 5.56.1 guard-clause
    // miscompile (svelte 5.56.1 misprints parenthesized boolean groupings when compiling the
    // shipped .svelte sources); that correctness floor still holds, just below this newer one.
    // The doctor's dependency-floors check reads this same range at runtime; raise it knowingly.
    expect(pkg.peerDependencies?.svelte).toBe('^5.56.10');
  });

  it('floors @sveltejs/kit at ^2.70, the version cairn develops and tests against', () => {
    expect(pkg.peerDependencies?.['@sveltejs/kit']).toBe('^2.70');
  });

  it('no longer declares carta-md anywhere', () => {
    expect(pkg.peerDependencies?.['carta-md']).toBeUndefined();
    expect(pkg.dependencies?.['carta-md']).toBeUndefined();
  });

  it('bundles the codemirror packages as hard dependencies', () => {
    for (const d of editorDeps) expect(pkg.dependencies?.[d], `${d} must be a dependency`).toBeTruthy();
  });

  it('widens the optional @anthropic-ai/sdk peer range to admit both 0.105.0 and 0.120.0', () => {
    // No @types/semver is installed, so this pins the exact range string rather than parsing it:
    // '>=0.105.0 <1' admits both versions by construction, and a narrower range (back to a caret
    // that stops at the next minor) would fail this exact-string check the moment it regresses.
    expect(pkg.peerDependenciesMeta?.['@anthropic-ai/sdk']).toEqual({ optional: true });
    expect(pkg.peerDependencies?.['@anthropic-ai/sdk']).toBe('>=0.105.0 <1');
  });
});
