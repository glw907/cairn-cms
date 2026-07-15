import { describe, it, expect } from 'vitest';
import { checkPackageFiles, parsePackFilePaths } from '../../../scripts/check-package-files.mjs';

// The gate's core comparison, against synthetic file lists. The script's main() wires the same
// function to the real `npm pack --dry-run` output.
describe('checkPackageFiles', () => {
  it('passes when a migrations/*.sql file is packed', () => {
    const files = ['dist/index.js', 'migrations/0000_auth.sql', 'CHANGELOG.md'];
    expect(checkPackageFiles(files)).toEqual({ ok: true, count: 1 });
  });

  it('counts every migration file', () => {
    const files = ['migrations/0000_auth.sql', 'migrations/0001_roles.sql'];
    expect(checkPackageFiles(files)).toEqual({ ok: true, count: 2 });
  });

  it('fails naming the fix when no migrations directory is packed', () => {
    const result = checkPackageFiles(['dist/index.js', 'CHANGELOG.md']);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.error).toContain('migrations');
    expect(result.error).toContain('files');
  });

  it('does not count a non-sql file under migrations', () => {
    expect(checkPackageFiles(['migrations/README.md']).ok).toBe(false);
  });
});

// The CLI parses `npm pack --json` stdout, which on some npm versions carries the `prepare`
// lifecycle's own stdout (svelte-package's `src/lib -> dist`) ahead of the JSON array. This is the
// exact shape that failed CI while passing locally on a cleaner npm.
describe('parsePackFilePaths', () => {
  const packJson = JSON.stringify([
    { files: [{ path: 'dist/index.js' }, { path: 'migrations/0000_auth.sql' }] },
  ]);

  it('parses clean JSON stdout', () => {
    expect(parsePackFilePaths(packJson)).toEqual(['dist/index.js', 'migrations/0000_auth.sql']);
  });

  it('parses JSON prefixed by lifecycle-script noise on stdout', () => {
    const noisy = `src/lib -> dist\n> @glw907/cairn-cms prepare\n${packJson}`;
    expect(parsePackFilePaths(noisy)).toEqual(['dist/index.js', 'migrations/0000_auth.sql']);
  });

  it('throws a diagnostic when no JSON array is present', () => {
    expect(() => parsePackFilePaths('src/lib -> dist\n')).toThrow('no JSON array');
  });
});
