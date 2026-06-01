import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')) as {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

describe('package dependency contract', () => {
  const peers = ['@sveltejs/kit', 'svelte'];
  const editorDeps = ['codemirror', '@codemirror/lang-markdown', '@codemirror/state', '@codemirror/view'];

  it('declares the framework packages as peers', () => {
    for (const p of peers) expect(pkg.peerDependencies?.[p], `${p} must be a peer`).toBeTruthy();
  });

  it('never lists a framework package as a hard dependency', () => {
    for (const p of peers) expect(pkg.dependencies?.[p], `${p} must not be a dependency`).toBeUndefined();
  });

  it('no longer declares carta-md anywhere', () => {
    expect(pkg.peerDependencies?.['carta-md']).toBeUndefined();
    expect(pkg.dependencies?.['carta-md']).toBeUndefined();
  });

  it('bundles the codemirror packages as hard dependencies', () => {
    for (const d of editorDeps) expect(pkg.dependencies?.[d], `${d} must be a dependency`).toBeTruthy();
  });
});
