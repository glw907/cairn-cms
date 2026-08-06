// cairn-cms: lock the npm packaging boundary two ways. First, the tarball `npm pack` would
// publish must not carry `src/lib`; only `dist` (the built, exports-mapped output) and
// `CHANGELOG.md` (plus npm's own README/LICENSE/package.json) ship. Second, Node's own package
// resolver must refuse a deep import of shipped source or of a `dist/` path the `exports` map
// does not name, so a consumer cannot route around the public subpaths (`.`, `/sveltekit`,
// `/components`, and so on). Both checks run against the built package, not the source tree, so
// they need `dist/index.js`; they skip (via skipIf) when the package has not been built, the
// same precedent as delivery-data-dist-spawn.test.ts.
import { describe, it, expect } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, symlinkSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parsePackManifest } from './_pack-manifest.js';

const ROOT = resolve(process.cwd());
const BUILT = resolve(ROOT, 'dist/index.js');
const built = existsSync(BUILT);

interface PackedFile {
  path: string;
}

interface PackManifest {
  files: PackedFile[];
}

describe('packaging boundary (needs dist/index.js; run npm run package to unskip)', () => {
  it.skipIf(!built)('the npm pack tarball carries no src/lib path', () => {
    // --ignore-scripts is meant to skip the `prepare` rebuild (dist is already built by the
    // gate that runs this suite); on npm 10.x it does not, and the rebuild's own stdout lands
    // ahead of the `--json` manifest (see _pack-manifest.ts). --loglevel=silent trims npm's own
    // log lines, and --offline guarantees no registry round trip, but the manifest still has to
    // be extracted defensively from `out.stdout`, never `out.stderr`, since a script's own
    // output is not an npm log line and ignores --loglevel.
    const out = spawnSync(
      'npm',
      ['pack', '--dry-run', '--json', '--ignore-scripts', '--offline', '--loglevel=silent'],
      { cwd: ROOT, encoding: 'utf8' }
    );
    expect(out.status).toBe(0);

    const [manifest] = parsePackManifest(out.stdout) as PackManifest[];
    const srcLibPaths = manifest.files.map((f) => f.path).filter((p) => p.startsWith('src/lib'));
    expect(srcLibPaths).toEqual([]);

    // The built output the exports map actually points at still ships.
    expect(manifest.files.some((f) => f.path === 'dist/index.js')).toBe(true);
  });

  it.skipIf(!built)(
    'a deep import of shipped source, or of a dist path outside the exports map, fails closed',
    () => {
      const probeDir = mkdtempSync(join(tmpdir(), 'cairn-pack-boundary-'));
      try {
        mkdirSync(join(probeDir, 'node_modules', '@glw907'), { recursive: true });
        symlinkSync(ROOT, join(probeDir, 'node_modules', '@glw907', 'cairn-cms'), 'dir');

        // Node's own exports-map resolver is the enforcement mechanism, not vitest; this spawns
        // a plain Node process so the check exercises the real resolver a consumer hits.
        const script = `
          const specifiers = [
            '@glw907/cairn-cms/src/lib/index.js',
            '@glw907/cairn-cms/dist/index.js',
          ];
          for (const specifier of specifiers) {
            try {
              import.meta.resolve(specifier);
              console.log('RESOLVED:' + specifier);
            } catch (err) {
              console.log('REJECTED:' + specifier + ':' + err.code);
            }
          }
        `;
        const out = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
          cwd: probeDir,
          env: { PATH: process.env.PATH },
          encoding: 'utf8',
        });

        expect(out.status).toBe(0);
        expect(out.stdout).toContain(
          'REJECTED:@glw907/cairn-cms/src/lib/index.js:ERR_PACKAGE_PATH_NOT_EXPORTED'
        );
        expect(out.stdout).toContain(
          'REJECTED:@glw907/cairn-cms/dist/index.js:ERR_PACKAGE_PATH_NOT_EXPORTED'
        );
      } finally {
        rmSync(probeDir, { recursive: true, force: true });
      }
    }
  );

  // The worker-condition regression that shipped in 0.94.0-rc.1. Both `./auth-crypto` and
  // `./cloudflare` declare a `browser` condition pointing at a stub that throws `is server-only`,
  // and Wrangler's own esbuild bundler resolves that condition for the deployed Worker too: its
  // build conditions are `["workerd", "worker", "browser"]` (`getBuildConditions()` in
  // `node_modules/wrangler/wrangler-dist/cli.js`). The server bundle got the throwing stub and the
  // Worker never started.
  //
  // A shape check on the exports map can look right and still resolve wrong, so these probes ask
  // Node's own resolver under the conditions Wrangler applies. Both conditions have to be active
  // together: Node never activates `browser` unless it is explicitly requested, so a `worker`-only
  // probe falls through to `default` even on the broken map and cannot reproduce the regression.
  // The fix is a `worker` condition declared ahead of `browser`, pointing at the same target as
  // `default`, since declaration order is what lets `worker` win once both are active.
  describe('worker-condition resolution for ./auth-crypto and ./cloudflare', () => {
    const subpaths = [
      { specifier: '@glw907/cairn-cms/auth-crypto', realExport: 'generateToken' },
      { specifier: '@glw907/cairn-cms/cloudflare', realExport: 'verifyTurnstile' },
    ];
    const allSpecifiers = subpaths.map((s) => s.specifier);
    const wranglerConditions = ['workerd', 'worker', 'browser'];

    /** Import each specifier in a throwaway consumer, under the given active conditions. */
    function resolveInProbeDir(specifiers: string[], conditions: string[]): string {
      const probeDir = mkdtempSync(join(tmpdir(), 'cairn-worker-condition-'));
      try {
        mkdirSync(join(probeDir, 'node_modules', '@glw907'), { recursive: true });
        symlinkSync(ROOT, join(probeDir, 'node_modules', '@glw907', 'cairn-cms'), 'dir');

        const script = `
          const specifiers = ${JSON.stringify(specifiers)};
          for (const specifier of specifiers) {
            try {
              const mod = await import(specifier);
              console.log('RESOLVED:' + specifier + ':' + Object.keys(mod).sort().join(','));
            } catch (err) {
              console.log('REJECTED:' + specifier + ':' + err.message);
            }
          }
        `;
        const args = [
          ...conditions.map((c) => `--conditions=${c}`),
          '--input-type=module',
          '-e',
          script,
        ];
        const out = spawnSync(process.execPath, args, {
          cwd: probeDir,
          env: { PATH: process.env.PATH },
          encoding: 'utf8',
        });
        expect(out.status).toBe(0);
        return out.stdout;
      } finally {
        rmSync(probeDir, { recursive: true, force: true });
      }
    }

    /** Read the export names the probe printed for one specifier's RESOLVED line. */
    function resolvedExportNames(stdout: string, specifier: string): string[] {
      const prefix = `RESOLVED:${specifier}:`;
      const line = stdout.split('\n').find((l) => l.startsWith(prefix));
      if (!line) {
        throw new Error(`the probe printed no RESOLVED line for ${specifier}; got: ${stdout}`);
      }
      return line.slice(prefix.length).split(',');
    }

    it.skipIf(!built)(
      `a Workers build (Wrangler's ${wranglerConditions.join(', ')} conditions) resolves the real module, not the throwing stub`,
      () => {
        const stdout = resolveInProbeDir(allSpecifiers, wranglerConditions);
        for (const { specifier, realExport } of subpaths) {
          expect(stdout).toContain(`RESOLVED:${specifier}:`);
          expect(stdout).not.toContain(`REJECTED:${specifier}`);
          expect(resolvedExportNames(stdout, specifier)).toContain(realExport);
        }
      }
    );

    it.skipIf(!built)(
      'a plain Node import, with no extra conditions, resolves the real module',
      () => {
        const stdout = resolveInProbeDir(allSpecifiers, []);
        for (const { specifier, realExport } of subpaths) {
          expect(stdout).toContain(`RESOLVED:${specifier}:`);
          expect(resolvedExportNames(stdout, specifier)).toContain(realExport);
        }
      }
    );

    it.skipIf(!built)(
      'a browser-only build (the client guard, with no worker condition active) still fails closed',
      () => {
        const stdout = resolveInProbeDir(allSpecifiers, ['browser']);
        for (const { specifier } of subpaths) {
          expect(stdout).toContain(`REJECTED:${specifier}:`);
          expect(stdout).toContain(`${specifier} is server-only`);
        }
      }
    );
  });

  // A regression for the extraction helper itself, run unconditionally (not skipIf(!built)): it
  // needs no dist build, only a fixture reproducing the npm 10.x pollution (a script's own
  // stdout, such as svelte-package's "src/lib -> dist" notice, landing ahead of the `--json`
  // manifest).
  describe('parsePackManifest', () => {
    it('extracts the JSON document past a prepended npm log-pollution line', () => {
      const polluted =
        'src/lib -> dist\n' +
        '@sveltejs/package found the following issues while packaging your library:\n' +
        JSON.stringify([{ files: [{ path: 'dist/index.js' }] }]);

      expect(parsePackManifest(polluted)).toEqual([{ files: [{ path: 'dist/index.js' }] }]);
    });

    it('throws when no parseable JSON document is present', () => {
      expect(() => parsePackManifest('src/lib -> dist\nno json here')).toThrow(SyntaxError);
    });
  });
});
