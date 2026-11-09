// Build the template exactly as a new site gets it, the showcase's emitter plus the starter overlay,
// and prove the build serves every starter route. SvelteKit's prerender fails the build on any
// response that is not a 2xx, so a green build is the "200 for every page" check, and the files it
// writes show which routes it reached. This file lives in the showcase's `scripts/`, which the
// template excludes, and runs under the showcase's own `vitest run`, where its dependencies are
// installed. It needs the engine built (`npm run package` at the repo root).
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, test } from 'vitest';
import { emitTemplate, STARTER_OVERLAY_DIR } from '../../../scripts/build/emit-template.mjs';
import { EXPECTED_STARTER_ROUTES } from '../../../scripts/build/starter-content.mjs';

const showcase = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The file SvelteKit's prerender writes for a route.
 * @param {string} route a route such as `/about` or `/`
 * @returns {string} its path under `.svelte-kit/output/prerendered/pages`
 */
function prerenderedFile(route) {
  return route === '/' ? 'index.html' : `${route.slice(1)}.html`;
}

test(
  'the template build prerenders every starter route with a 200',
  { timeout: 10 * 60 * 1000 },
  async () => {
    const to = await mkdtemp(path.join(tmpdir(), 'cairn-starter-build-'));
    try {
      await emitTemplate({
        from: showcase,
        to,
        engineSpec: 'file:../..',
        devSpec: 'file:../../packages/cairn-cms-dev',
        starterOverlay: STARTER_OVERLAY_DIR,
      });
      await symlink(path.join(showcase, 'node_modules'), path.join(to, 'node_modules'));
      await promisify(execFile)('npm', ['run', 'build'], { cwd: to, maxBuffer: 64 * 1024 * 1024 });

      const pages = path.join(to, '.svelte-kit', 'output', 'prerendered', 'pages');
      for (const route of EXPECTED_STARTER_ROUTES) {
        const file = path.join(pages, prerenderedFile(route));
        expect(existsSync(file), `the build did not prerender ${route}`).toBe(true);
        expect(await readFile(file, 'utf8'), `${route} prerendered empty`).toContain('<h1');
      }
      expect(existsSync(path.join(to, '.svelte-kit', 'cloudflare', 'images', 'starter-cairn.svg'))).toBe(true);
    } finally {
      await rm(to, { recursive: true, force: true });
    }
  },
);
