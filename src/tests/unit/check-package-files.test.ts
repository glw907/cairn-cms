import { describe, it, expect } from 'vitest';
import { checkPackageFiles } from '../../../scripts/check-package-files.mjs';

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
