import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  checkPackageFiles,
  checkChannelMigrationPacked,
  checkDocsPacked,
  requiredDocsPaths,
  checkSkillPacked,
  checkWorkerCondition,
  checkRuleReachability,
  checkNoToolPathPacked,
  parseRelativeImportSpecifiers,
  walkModuleGraph,
  parsePackFilePaths
} from '../../../scripts/checks/check-package-files.mjs';

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

// The channel schema ships from its own directory, and that separation is the assertion: a shared
// migrations_dir applies AUTH_DB's migrations to a channel database and the channel's schema to the
// auth store, the first time either is applied.
describe('checkChannelMigrationPacked', () => {
  it('passes when the channel migration is packed in its own directory', () => {
    const files = ['dist/index.js', 'migrations/0000_auth.sql', 'migrations-channel/0000_channel.sql'];
    expect(checkChannelMigrationPacked(files)).toEqual({ ok: true });
  });

  it('fails naming the fix when the channel migration is absent', () => {
    const result = checkChannelMigrationPacked(['dist/index.js', 'migrations/0000_auth.sql']);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.error).toContain('migrations-channel');
    expect(result.error).toContain('files');
  });

  it("fails when the channel schema is packed under AUTH_DB's own migrations directory", () => {
    const result = checkChannelMigrationPacked([
      'migrations/0000_auth.sql',
      'migrations/0005_channel.sql',
      'migrations-channel/0000_channel.sql',
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.error).toContain('migrations_dir');
  });
});

// The version records, the schemas, the published docs directories, and the two front doors must
// reach the tarball, and the write-only-plan trees (internal, plans) and the rolling STATUS.md must
// not, so a future `files` edit cannot silently drop or leak either direction.
describe('checkDocsPacked', () => {
  const packedPaths = [
    'MIGRATION-NOTES.md',
    'schema/cairn-doctor.schema.json',
    'docs/architecture.md',
    'docs/why-cairn.md',
    'docs/admin/README.md',
    'docs/admin/create-your-site.md',
    'docs/editors/README.md',
    'docs/editors/write-in-the-editor.md'
  ];

  // What requiredDocsPaths asks for when both docs directories and the front door hold pages.
  const required = [
    'MIGRATION-NOTES.md',
    'schema/cairn-doctor.schema.json',
    'docs/admin/README.md',
    'docs/editors/README.md',
    'docs/architecture.md',
    'docs/why-cairn.md'
  ];
  const docsCount = packedPaths.filter((p) => p.startsWith('docs/')).length;

  it('passes when the records, both indexes, and both front doors are packed with no internal leak', () => {
    expect(checkDocsPacked(['dist/index.js', ...packedPaths], required)).toEqual({ ok: true, count: docsCount });
  });

  it('fails naming the missing migration notes', () => {
    const result = checkDocsPacked(packedPaths.filter((p) => p !== 'MIGRATION-NOTES.md'), required);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.error).toContain('MIGRATION-NOTES.md');
  });

  it('fails naming the missing why-cairn front door, which no directory prefix covers', () => {
    const result = checkDocsPacked(packedPaths.filter((p) => p !== 'docs/why-cairn.md'), required);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.error).toContain('docs/why-cairn.md');
  });

  // The technical pages left the package for the packaged skills. A tarball still carrying one is a
  // stale `files` entry, and the allowlist is what makes that a failure rather than a silent ship.
  it.each(['docs/reference/README.md', 'docs/extend/upgrade-cairn.md', 'docs/claude-code/README.md', 'docs/guides/x.md'])(
    'fails naming a path under a removed docs tree (%s)',
    (path) => {
      const result = checkDocsPacked([...packedPaths, path], required);
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected failure');
      expect(result.error).toContain(path);
    }
  );

  it.each(['docs/internal/some-plan.md', 'docs/plans/some-plan.md', 'docs/STATUS.md', 'docs/drafts/x.md'])(
    'fails naming a leaked path outside the allowlist (%s)',
    (path) => {
      const result = checkDocsPacked([...packedPaths, path], required);
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected failure');
      expect(result.error).toContain(path);
    }
  );
});

// The paths the tarball must carry follow the tree: the migration notes and every schema always, a
// docs directory's index once it holds any page, and both front-door files once either exists.
describe('requiredDocsPaths', () => {
  const roots: string[] = [];
  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  /** A temp repo root holding two schemas and `paths`. */
  function tree(...paths: string[]): string {
    const root = mkdtempSync(join(tmpdir(), 'cairn-package-files-'));
    roots.push(root);
    for (const path of ['schema/b.schema.json', 'schema/a.schema.json', ...paths]) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), path.endsWith('.json') ? '{}\n' : '# Page\n');
    }
    return root;
  }

  const RECORDS = ['MIGRATION-NOTES.md', 'schema/a.schema.json', 'schema/b.schema.json'];

  it('asks for the migration notes and every schema, sorted, when no docs page exists', () => {
    expect(requiredDocsPaths(tree())).toEqual(RECORDS);
  });

  it('asks for the admin index once docs/admin holds a page', () => {
    const root = tree('docs/admin/is-it-working.md');
    const result = checkDocsPacked(['docs/admin/is-it-working.md', ...RECORDS], requiredDocsPaths(root));
    expect(result).toMatchObject({ ok: false });
    if (result.ok) throw new Error('expected failure');
    expect(result.error).toContain('docs/admin/README.md');
  });

  it('asks for the editors index once docs/editors holds a nested page', () => {
    expect(requiredDocsPaths(tree('docs/editors/deep/page.md'))).toEqual([...RECORDS, 'docs/editors/README.md']);
  });

  it('asks for both front-door files once either exists', () => {
    expect(requiredDocsPaths(tree('docs/architecture.md'))).toEqual([...RECORDS, 'docs/why-cairn.md', 'docs/architecture.md']);
  });

  it('fails closed when schema/ holds no schema', () => {
    const root = mkdtempSync(join(tmpdir(), 'cairn-package-files-'));
    roots.push(root);
    expect(() => requiredDocsPaths(root)).toThrow(/schema\/ holds no \*\.schema\.json/);
  });
});

// The packaged cairn-building-admin-screens skill must reach the tarball, or cairn-guidance install has
// nothing to install into a consumer's .claude/skills/.
describe('checkSkillPacked', () => {
  it('passes when the skill core is packed', () => {
    expect(
      checkSkillPacked(['dist/index.js', 'skills/cairn-building-admin-screens/SKILL.md'])
    ).toEqual({ ok: true });
  });

  it('fails naming the fix when the skill core is not packed', () => {
    const result = checkSkillPacked(['dist/index.js', 'CHANGELOG.md']);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.error).toContain('skills/cairn-building-admin-screens/SKILL.md');
    expect(result.error).toContain('files');
  });
});

// The Workers-runtime resolver defect (2026-08-05 RC1 filing): Wrangler re-bundles the adapter
// output with esbuild for workerd and applies the "browser" condition to the SERVER bundle, so a
// subpath that ships a "browser" stub without a preceding "worker" condition sends the throwing
// browser-only stub into the Worker. "worker" must be present, declared before "browser", and
// resolve to something other than the stub. It is deliberately not required to equal "default",
// which leaves an entry free to ship a workerd-specific build later. Each case spells its entry
// out in full, since the declaration order of the conditions is itself what is under test.
describe('checkWorkerCondition', () => {
  it('fails an entry declaring browser with no worker condition', () => {
    const result = checkWorkerCondition({
      './auth-crypto': {
        types: './dist/auth-crypto/index.d.ts',
        browser: './dist/auth-crypto/browser.js',
        default: './dist/auth-crypto/index.js'
      }
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.error).toContain('./auth-crypto');
    expect(result.error).toContain('worker');
  });

  it('passes the shipped shape, worker ahead of browser and matching default', () => {
    expect(
      checkWorkerCondition({
        './auth-crypto': {
          types: './dist/auth-crypto/index.d.ts',
          worker: './dist/auth-crypto/index.js',
          browser: './dist/auth-crypto/browser.js',
          default: './dist/auth-crypto/index.js'
        }
      })
    ).toEqual({ ok: true, count: 1 });
  });

  it('passes an entry with no browser condition at all, unaffected by the defect', () => {
    expect(
      checkWorkerCondition({
        './auth-store': {
          types: './dist/auth-store/index.d.ts',
          default: './dist/auth-store/index.js'
        }
      })
    ).toEqual({ ok: true, count: 0 });
  });

  it('fails when worker is declared after browser', () => {
    const result = checkWorkerCondition({
      './auth-crypto': {
        types: './dist/auth-crypto/index.d.ts',
        browser: './dist/auth-crypto/browser.js',
        worker: './dist/auth-crypto/index.js',
        default: './dist/auth-crypto/index.js'
      }
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.error).toContain('./auth-crypto');
    expect(result.error).toContain('order');
  });

  it('passes a worker target that differs from default, a workerd-specific build', () => {
    expect(
      checkWorkerCondition({
        './cloudflare': {
          types: './dist/cloudflare/index.d.ts',
          worker: './dist/cloudflare/workerd.js',
          browser: './dist/cloudflare/browser.js',
          default: './dist/cloudflare/index.js'
        }
      })
    ).toEqual({ ok: true, count: 1 });
  });

  it('fails when worker points at the browser stub rather than the real module', () => {
    const result = checkWorkerCondition({
      './auth-crypto': {
        types: './dist/auth-crypto/index.d.ts',
        worker: './dist/auth-crypto/browser.js',
        browser: './dist/auth-crypto/browser.js',
        default: './dist/auth-crypto/index.js'
      }
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.error).toContain('./auth-crypto');
  });
});

// The tool/ module is a separate Go module with its own gate, never a package export, so a
// `files` entry that swept it in would ship a whole standalone codebase inside the npm tarball.
describe('checkNoToolPathPacked', () => {
  it('passes when no packed path begins with tool/', () => {
    expect(checkNoToolPathPacked(['dist/index.js', 'CHANGELOG.md'])).toEqual({ ok: true });
  });

  it('fails naming a packed path under tool/', () => {
    const result = checkNoToolPathPacked(['dist/index.js', 'tool/cmd/cairn/main.go']);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.error).toContain('tool/cmd/cairn/main.go');
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

// The anti-leak gate: `vertical-metrics` is the worked example (66.6 KB of dist, unregistered).
// Every module under a packed rule directory must be reachable from that directory's registry
// index, so an unregistered module can never ship again.
describe('checkRuleReachability', () => {
  it('passes a file list of only registered rules and the helpers they import', () => {
    const result = checkRuleReachability(
      ['dist/index.js', 'dist/audit/rules/static/index.js', 'dist/audit/rules/static/gap-scale.js'],
      new Set(['index', 'gap-scale', 'utility']),
      new Set(['index'])
    );
    expect(result).toEqual({ ok: true, count: 2 });
  });

  it('fails naming the offending file when a registry does not reach it', () => {
    const result = checkRuleReachability(
      ['dist/index.js', 'dist/audit/rules/rendered/one-filled-action.js', 'dist/audit/rules/rendered/vertical-metrics.js'],
      new Set(['index']),
      new Set(['index', 'one-filled-action'])
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.error).toContain('dist/audit/rules/rendered/vertical-metrics.js');
    expect(result.error).toContain('register');
  });

  it('ignores files outside the two packed rule directories', () => {
    expect(checkRuleReachability(['dist/index.js', 'CHANGELOG.md'], new Set(), new Set())).toEqual({
      ok: true,
      count: 0
    });
  });
});

// The graph walk that computes what a registry reaches, over a synthetic file map so it needs no
// real filesystem to prove itself.
describe('walkModuleGraph', () => {
  it('reaches an entry file and every relative import from it, transitively', () => {
    const files = new Map([
      ['a/index.ts', "import { x } from './sibling.js';\nimport { y } from '../shared.js';\n"],
      ['a/sibling.ts', "export const x = 1;\n"],
      ['shared.ts', "export const y = 2;\n"],
    ]);
    const seen = walkModuleGraph('a/index.ts', (path) => files.get(path) ?? null);
    expect(seen).toEqual(new Set(['a/index.ts', 'a/sibling.ts', 'shared.ts']));
  });

  it('does not reach a file nothing in the graph imports', () => {
    const files = new Map([
      ['a/index.ts', "import { x } from './sibling.js';\n"],
      ['a/sibling.ts', "export const x = 1;\n"],
      ['a/orphan.ts', "export const z = 3;\n"],
    ]);
    const seen = walkModuleGraph('a/index.ts', (path) => files.get(path) ?? null);
    expect(seen.has('a/orphan.ts')).toBe(false);
  });

  it('does not loop forever on a cycle', () => {
    const files = new Map([
      ['a/one.ts', "import { b } from './two.js';\n"],
      ['a/two.ts', "import { a } from './one.js';\n"],
    ]);
    const seen = walkModuleGraph('a/one.ts', (path) => files.get(path) ?? null);
    expect(seen).toEqual(new Set(['a/one.ts', 'a/two.ts']));
  });

  it('ignores a non-relative package specifier', () => {
    const files = new Map([['a/index.ts', "import { chromium } from 'playwright';\n"]]);
    const seen = walkModuleGraph('a/index.ts', (path) => files.get(path) ?? null);
    expect(seen).toEqual(new Set(['a/index.ts']));
  });
});

describe('parseRelativeImportSpecifiers', () => {
  it('extracts a relative specifier from a single-line import', () => {
    expect(parseRelativeImportSpecifiers("import { x } from '../../rendered.js';\n")).toEqual([
      '../../rendered.js'
    ]);
  });

  it('extracts a relative specifier from a multi-line destructured import', () => {
    const source = "import {\n  a,\n  b,\n} from './helpers.js';\n";
    expect(parseRelativeImportSpecifiers(source)).toEqual(['./helpers.js']);
  });

  it('ignores a bare package specifier', () => {
    expect(parseRelativeImportSpecifiers("import { chromium } from 'playwright';\n")).toEqual([]);
  });
});
