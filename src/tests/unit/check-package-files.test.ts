import { describe, it, expect } from 'vitest';
import {
  checkPackageFiles,
  checkDocsPacked,
  parsePackFilePaths
} from '../../../scripts/check-package-files.mjs';

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

// The published docs arms (reference, guides, explanation, tutorial) plus the docs index must
// reach the tarball, and the write-only-plan trees (internal, superpowers) and the rolling
// STATUS.md must not, so a future `files` edit cannot silently drop or leak either direction.
describe('checkDocsPacked', () => {
  const arms = [
    'docs/README.md',
    'docs/reference/README.md',
    'docs/reference/render.md',
    'docs/guides/README.md',
    'docs/guides/deploy.md',
    'docs/explanation/README.md',
    'docs/explanation/why-cairn.md',
    'docs/tutorial/build-your-first-cairn-site.md'
  ];

  it('passes when the four arm indexes and docs index are packed with no internal leak', () => {
    expect(checkDocsPacked(['dist/index.js', ...arms])).toEqual({ ok: true, count: arms.length });
  });

  it('fails naming a missing arm index', () => {
    const missingReference = arms.filter((p) => p !== 'docs/reference/README.md');
    const result = checkDocsPacked(missingReference);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.error).toContain('docs/reference/README.md');
  });

  it('fails naming a leaked docs/internal path', () => {
    const result = checkDocsPacked([...arms, 'docs/internal/some-plan.md']);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.error).toContain('docs/internal/some-plan.md');
  });

  it('fails naming a leaked docs/superpowers path', () => {
    const result = checkDocsPacked([...arms, 'docs/superpowers/plans/some-plan.md']);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.error).toContain('docs/superpowers/plans/some-plan.md');
  });

  it('fails naming a leaked docs/STATUS.md', () => {
    const result = checkDocsPacked([...arms, 'docs/STATUS.md']);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.error).toContain('docs/STATUS.md');
  });

  it('fails naming a hypothetical docs path outside the allowlist, unnamed by any prior denylist', () => {
    const result = checkDocsPacked([...arms, 'docs/drafts/x.md']);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.error).toContain('docs/drafts/x.md');
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
