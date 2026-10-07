// The cairnManifest plugin's nested verify server must come from the site's own Vite, the one its
// SvelteKit plugin imported. SvelteKit checks the server's SSR environment with an `instanceof`
// against its own Vite module, so a server built from a second Vite copy (the engine's own, when
// the engine is linked rather than installed) fails that check and the build with it.
import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveConsumerVite } from '../../lib/vite/internal.js';

describe('resolveConsumerVite', () => {
  it("resolves the vite package installed under the site's own root, not the engine's", () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'cairn-consumer-vite-')));
    try {
      const viteDir = join(root, 'node_modules', 'vite');
      mkdirSync(join(viteDir, 'dist', 'node'), { recursive: true });
      writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'site', type: 'module' }));
      writeFileSync(
        join(viteDir, 'package.json'),
        JSON.stringify({ name: 'vite', type: 'module', exports: { '.': './dist/node/index.js' } }),
      );
      writeFileSync(join(viteDir, 'dist', 'node', 'index.js'), 'export const marker = true;\n');

      expect(resolveConsumerVite(root)).toBe(join(viteDir, 'dist', 'node', 'index.js'));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
