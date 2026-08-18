// cairn-cms: rot-proof the reproduction manifest's node-safety against the EMITTED dist, through
// the public specifier a consumer actually writes.
//
// reproductions-manifest.test.ts walks the SOURCE import graph and asserts no module reachable from
// the manifest is a `.svelte` component. That walk passes vacuously if svelte-package later
// rewrites or inlines an import in a way that drags Svelte into the built manifest.js, and it says
// nothing at all about whether `@glw907/cairn-cms/reproductions/manifest` resolves: Node's exports
// map is exclusive, so a missing map entry makes the subpath unreachable no matter how clean the
// graph is. This spec closes both gaps by importing the specifier in a fresh plain-Node process
// against a throwaway consumer, outside the vitest transform, so Node's own ESM resolver does the
// work that a consumer's resolver will do.
//
// It needs the built package, so it skips (via skipIf) when dist/index.js is absent, the same
// precedent as packaging-boundary.test.ts.
import { describe, it, expect } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, symlinkSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const BUILT = resolve(ROOT, 'dist/index.js');
const built = existsSync(BUILT);

const SPECIFIER = '@glw907/cairn-cms/reproductions/manifest';

describe('packaged /reproductions/manifest (needs dist/index.js; run npm run package to unskip)', () => {
  it.skipIf(!built)('resolves under plain Node and reports 25 shaped entries', () => {
    const probeDir = mkdtempSync(join(tmpdir(), 'cairn-repro-manifest-'));
    try {
      mkdirSync(join(probeDir, 'node_modules', '@glw907'), { recursive: true });
      symlinkSync(ROOT, join(probeDir, 'node_modules', '@glw907', 'cairn-cms'), 'dir');

      // A plain Node process, so the real resolver is the enforcement mechanism rather than
      // vitest's. The entry shape is checked here too: an import that resolves but yields
      // undefined ids would satisfy a bare length assertion while carrying nothing a gate can use.
      const script = `
        const m = await import(${JSON.stringify(SPECIFIER)});
        if (!Array.isArray(m.manifest)) { console.error('no manifest array'); process.exit(3); }
        const shaped = m.manifest.every(
          (e) => typeof e.id === 'string' && (e.host === 'shell' || e.host === 'bare'),
        );
        if (!shaped) { console.error('an entry is missing its id or host'); process.exit(4); }
        console.log('REPRO_MANIFEST_OK:' + m.manifest.length);
      `;
      const out = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
        cwd: probeDir,
        env: { PATH: process.env.PATH },
        encoding: 'utf8',
      });

      expect(out.stderr).toBe('');
      expect(out.status).toBe(0);
      expect(out.stdout.trim()).toBe('REPRO_MANIFEST_OK:25');
    } finally {
      rmSync(probeDir, { recursive: true, force: true });
    }
  });
});
