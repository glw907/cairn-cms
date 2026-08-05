// The /delivery entry must not pull the server backend into a public bundle. The delivery
// modules (including the public-routes loader the barrel re-exports) must import nothing from
// github, auth, or email. This reads the source statically rather than introspecting a built
// graph. A second walk proves the docs/reference/delivery-data.md claim: nothing reachable
// from the node-safe data barrel imports @sveltejs/kit or a .svelte component.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const files = readdirSync('src/lib/delivery')
  .filter((f) => f.endsWith('.ts'))
  .map((f) => `src/lib/delivery/${f}`);
const forbidden = [/from '\.\.\/github/, /from '\.\.\/auth/, /from '\.\.\/email/, /from '\.\.\/\.\.\/lib\/(github|auth|email)/];

describe('/delivery backend-free boundary', () => {
  it('exposes a barrel', () => {
    const barrel = readFileSync('src/lib/delivery/index.ts', 'utf8');
    expect(barrel).toContain("export * from './data.js'");
    // The pure projections live in the node-safe ./delivery/data barrel that index.ts re-exports.
    const data = readFileSync('src/lib/delivery/data.ts', 'utf8');
    expect(data).toContain('createSiteIndexes');
    // CairnHead moved to the dedicated ./delivery/head entry so the data barrel stays
    // component-free and loads under node without the Svelte vitest plugin.
    expect(barrel).not.toContain('CairnHead');
    expect(data).not.toContain('CairnHead');
  });

  it('imports no github, auth, or email module', () => {
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      for (const pattern of forbidden) {
        expect(src, `${file} must not import a backend module`).not.toMatch(pattern);
      }
    }
  });

  // The markdown twin's disclosure hazard, asserted directly rather than argued: public-routes.ts
  // is already one of the files the walk above covers, so markdownLoad and markdownEntries already
  // carry the same forbidden-import proof. This test names the file and the reason explicitly, so
  // the guarantee is legible without tracing back through the generic walk: nothing on the path a
  // pending cairn/* branch would reach (github, auth) is importable from the module that builds the
  // markdown route, so no in-flight edit can surface through it.
  it('keeps the markdown twin path (public-routes.ts) free of a branch-aware import', () => {
    const src = readFileSync('src/lib/delivery/public-routes.ts', 'utf8');
    for (const pattern of forbidden) {
      expect(src, 'public-routes.ts (markdownLoad/markdownEntries) must not import a backend module').not.toMatch(
        pattern,
      );
    }
  });

  // delivery/index.ts and delivery/public-routes.ts import @sveltejs/kit by design; neither is
  // reachable from data.ts, so the walk proves the kit-free claim without special-casing them.
  it('keeps the /delivery/data graph free of @sveltejs/kit and .svelte imports', () => {
    const seen = new Set<string>();
    const queue = ['src/lib/delivery/data.ts'];
    while (queue.length > 0) {
      const file = queue.pop()!;
      if (seen.has(file)) continue;
      seen.add(file);
      const src = readFileSync(file, 'utf8');
      expect(src, `${file} must not import @sveltejs/kit`).not.toMatch(/from '@sveltejs\/kit'/);
      for (const match of src.matchAll(/from '(\.[^']+)'/g)) {
        const resolved = join(dirname(file), match[1]);
        expect(resolved, `${file} must not import a .svelte component`).not.toMatch(/\.svelte$/);
        queue.push(resolved.replace(/\.js$/, '.ts'));
      }
    }
    // The walk must actually cross module boundaries, or a refactor that empties the
    // barrel would pass vacuously.
    expect(seen.size).toBeGreaterThan(10);
  });
});
