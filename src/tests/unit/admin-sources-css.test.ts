// cairn-cms: the engine-owned Tailwind sources file. A site's own admin.css
// imports one exported subpath instead of naming the engine's dist layout with a literal
// `@source "../node_modules/@glw907/cairn-cms/dist";` line. Three of the four assertions need the
// real package build (dist/admin-sources.css and the exports map), so they skip when unbuilt, the
// same skipIf precedent packaging-boundary.test.ts uses; the fourth scans tracked source, so it
// always runs.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const DIST_FILE = resolve(ROOT, 'dist/admin-sources.css');
const BUILT = existsSync(resolve(ROOT, 'dist/index.js'));

describe('admin-sources.css (needs dist; run npm run package to unskip)', () => {
  it.skipIf(!BUILT)('is exported from package.json at ./admin-sources.css', () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
    expect(pkg.exports['./admin-sources.css']).toBe('./dist/admin-sources.css');
    expect(existsSync(DIST_FILE)).toBe(true);
  });

  it.skipIf(!BUILT)('is listed in the packed tarball at the exported subpath', () => {
    const out = execSync('npm pack --dry-run --json --ignore-scripts --offline --loglevel=silent', {
      cwd: ROOT,
      encoding: 'utf8',
    });
    const [manifest] = JSON.parse(out.slice(out.indexOf('[')));
    const paths = manifest.files.map((f: { path: string }) => f.path);
    expect(paths).toContain('dist/admin-sources.css');
  });

  it.skipIf(!BUILT)('every @source path resolves to a directory that exists, relative to the file itself', () => {
    const body = readFileSync(DIST_FILE, 'utf8');
    const sourceLines = [...body.matchAll(/@source\s+"([^"]+)";/g)].map((m) => m[1]);
    expect(sourceLines.length).toBeGreaterThan(0);
    for (const path of sourceLines) {
      const resolved = resolve(dirname(DIST_FILE), path);
      expect(existsSync(resolved)).toBe(true);
      expect(statSync(resolved).isDirectory()).toBe(true);
    }
  });
});

describe('no tracked admin.css names the engine dist layout', () => {
  it('scans every admin.css under the switched trees for a literal cairn-cms/dist reference', () => {
    const roots = [
      resolve(ROOT, 'examples/showcase/src'),
      resolve(ROOT, 'packages/create-cairn-site/template'),
      resolve(ROOT, 'templates/waymark'),
      resolve(ROOT, 'claude'),
    ];
    const offenders: string[] = [];
    for (const root of roots) {
      if (!existsSync(root)) continue;
      walk(root, (file) => {
        if (!file.endsWith('admin.css')) return;
        const text = readFileSync(file, 'utf8');
        if (text.includes('cairn-cms/dist')) offenders.push(file);
      });
    }
    expect(offenders).toEqual([]);
  });
});

/** Recursively visit every file under `dir`, calling `visit` with its absolute path. */
function walk(dir: string, visit: (file: string) => void): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) walk(full, visit);
    else visit(full);
  }
}
