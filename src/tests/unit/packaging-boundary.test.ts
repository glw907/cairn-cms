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
