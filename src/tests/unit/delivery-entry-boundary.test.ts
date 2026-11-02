// The /delivery entry must not pull the server backend into a public bundle. The delivery
// modules (including the public-routes loader the barrel re-exports) must import nothing from
// github, auth, or email. This reads the source statically rather than introspecting a built
// graph. A second walk proves the /delivery entry's plain-Node claim: nothing reachable from the
// barrel statically imports @sveltejs/kit or a .svelte component.
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
    expect(barrel).toContain('createSiteResolver');
    // CairnHead lives on /public so the barrel stays component-free and loads under node without
    // the Svelte vitest plugin. The header comment names it; no export may.
    expect(barrel).not.toMatch(/^export .*CairnHead/m);
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

  // The render pipeline runs in the public Worker and at prerender, so it must not reach into the
  // admin tree (its components and editor-only modules would ride into a public bundle).
  it('keeps render/ free of admin/ imports', () => {
    const renderFiles = readdirSync('src/lib/render')
      .filter((f) => f.endsWith('.ts') || f.endsWith('.svelte'))
      .map((f) => `src/lib/render/${f}`);
    expect(renderFiles.length).toBeGreaterThan(0);
    for (const file of renderFiles) {
      expect(readFileSync(file, 'utf8'), `${file} must not import from admin/`).not.toMatch(
        /from '\.\.\/admin\//,
      );
    }
  });

  // public-routes.ts resolves @sveltejs/kit with a dynamic import on its 404 paths, which the
  // `from` pattern deliberately does not match; only a static import would break plain Node.
  it('keeps the /delivery graph free of static @sveltejs/kit and .svelte imports', () => {
    const seen = new Set<string>();
    const queue = ['src/lib/delivery/index.ts'];
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
