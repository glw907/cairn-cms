// cairn-cms: check-dev-package.mjs is the gate that reads packages/cairn-cms-dev/package.json,
// so the version-match rule (the cairn-releasing skill has no step enforcing that the root
// package.json and the dev-package manifest carry the same version) lives here rather than in
// check-version.mjs, which never reads the dev-package manifest at all. This test drives the
// pure comparison function directly.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { checkVersionMatch, checkDistOnly, checkRepository } from '../../../scripts/checks/check-dev-package.mjs';

describe('checkVersionMatch', () => {
  it('fails a planted mismatch and names both versions', () => {
    const result = checkVersionMatch('0.97.0', '0.96.0');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/0\.97\.0/);
      expect(result.error).toMatch(/0\.96\.0/);
    }
  });

  it('passes when the two versions are equal', () => {
    expect(checkVersionMatch('0.97.0', '0.97.0')).toEqual({ ok: true });
  });
});

describe('checkDistOnly', () => {
  const good = {
    exports: { '.': { types: './dist/index.d.ts', svelte: './dist/index.js', default: './dist/index.js' } },
    files: ['dist', 'README.md']
  };

  it('passes a manifest that points only into dist/', () => {
    expect(checkDistOnly(good)).toEqual({ ok: true });
  });

  it.each(['types', 'svelte', 'default'])('fails when the %s condition points at src/', (condition) => {
    const manifest = {
      ...good,
      exports: { '.': { ...good.exports['.'], [condition]: './src/index.ts' } }
    };
    const result = checkDistOnly(manifest);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join('\n')).toMatch(/\.\/src\/index\.ts/);
  });

  it('fails a files entry outside dist/', () => {
    const result = checkDistOnly({ ...good, files: ['src', 'README.md'] });
    expect(result.ok).toBe(false);
  });
});

describe('checkRepository', () => {
  const url = 'git+https://github.com/glw907/cairn-cms.git';
  const good = { repository: { type: 'git', url, directory: 'packages/create-cairn-site' } };

  it('passes a manifest whose repository url matches', () => {
    expect(checkRepository(good, 'x/package.json')).toEqual({ ok: true });
  });

  it('fails a manifest with no repository and names the path', () => {
    const result = checkRepository({}, 'x/package.json');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/x\/package\.json/);
  });

  it('fails a url that disagrees', () => {
    expect(checkRepository({ repository: { url: 'git+https://github.com/other/repo.git' } }, 'x').ok).toBe(false);
  });

  it.each(['packages/cairn-cms-dev/package.json', 'packages/create-cairn-site/package.json'])(
    'passes the real manifest %s',
    (path) => {
      const manifest = JSON.parse(readFileSync(resolve(__dirname, '../../..', path), 'utf8'));
      expect(checkRepository(manifest, path)).toEqual({ ok: true });
    }
  );
});
