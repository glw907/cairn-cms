import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, utimesSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  assertNoExcludedPaths,
  assertSiteAnswerKeyAbsent,
  copyDocsSet,
  installAndStrip,
  packEngineTarballs,
  packTarball,
  packageInputPaths,
  prepareDocsAndBinary,
  prepareDocsAndSite,
  prepareRepositoryExport,
  restrictStateDirPermissions,
  scaffoldSite,
  stripInstalledEngineExtras,
  writeScratchSiteRecord,
  type CommandRunner,
  type ScratchSiteRecord,
} from '../../../scripts/docs-readers/lib/prepare-class.js';

/** A fresh scratch directory, removed by the caller. */
function tmp(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `docs-readers-prepare-${prefix}-`));
}

/** Write a small text file, creating its parent directories. */
function write(file: string, content: string): void {
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, content);
}

/** Commit every file under `repoRoot` to a fresh git history, for a real `git archive` round trip. */
function commitAll(repoRoot: string): void {
  const git = (args: string[]) => execFileSync('git', args, { cwd: repoRoot });
  git(['init', '-q']);
  git(['config', 'user.email', 'test@example.com']);
  git(['config', 'user.name', 'Test']);
  git(['add', '.']);
  git(['commit', '-q', '-m', 'initial']);
}

describe('copyDocsSet', () => {
  it('copies each docs-set page to its doc-relative path', () => {
    const sourceRoot = tmp('source');
    const dest = tmp('dest');
    try {
      write(join(sourceRoot, 'docs/admin/is-it-working.md'), '# working\n');
      copyDocsSet(sourceRoot, ['docs/admin/is-it-working.md'], dest);
      expect(readFileSync(join(dest, 'docs/admin/is-it-working.md'), 'utf8')).toBe('# working\n');
    } finally {
      rmSync(sourceRoot, { recursive: true, force: true });
      rmSync(dest, { recursive: true, force: true });
    }
  });

  it('throws when a named page does not exist', () => {
    const sourceRoot = tmp('source-missing');
    const dest = tmp('dest-missing');
    try {
      expect(() => copyDocsSet(sourceRoot, ['docs/missing.md'], dest)).toThrow(/does not exist/);
    } finally {
      rmSync(sourceRoot, { recursive: true, force: true });
      rmSync(dest, { recursive: true, force: true });
    }
  });
});

describe('stripInstalledEngineExtras', () => {
  it('removes docs, claude, and skills, leaving dist and package.json', () => {
    const installedDir = tmp('installed');
    try {
      for (const name of ['docs', 'claude', 'skills']) write(join(installedDir, name, 'x.md'), 'x');
      write(join(installedDir, 'dist/index.js'), 'export {};');
      write(join(installedDir, 'package.json'), '{}');
      stripInstalledEngineExtras(installedDir);
      for (const name of ['docs', 'claude', 'skills']) expect(existsSync(join(installedDir, name))).toBe(false);
      expect(existsSync(join(installedDir, 'dist/index.js'))).toBe(true);
      expect(existsSync(join(installedDir, 'package.json'))).toBe(true);
    } finally {
      rmSync(installedDir, { recursive: true, force: true });
    }
  });
});

describe('assertSiteAnswerKeyAbsent', () => {
  it('passes when the site carries none of the forbidden paths', () => {
    const siteDir = tmp('site-clean');
    try {
      write(join(siteDir, 'package.json'), '{}');
      write(join(siteDir, 'node_modules/@glw907/cairn-cms/dist/index.js'), 'export {};');
      expect(() => assertSiteAnswerKeyAbsent(siteDir)).not.toThrow();
    } finally {
      rmSync(siteDir, { recursive: true, force: true });
    }
  });

  it('lists every forbidden path that survived', () => {
    const siteDir = tmp('site-dirty');
    try {
      write(join(siteDir, 'CLAUDE.md'), 'setup guidance');
      write(join(siteDir, '.claude/agents/x.md'), 'agent');
      write(join(siteDir, 'node_modules/@glw907/cairn-cms/docs/index.md'), 'answer key');
      expect(() => assertSiteAnswerKeyAbsent(siteDir)).toThrow(/CLAUDE\.md/);
    } finally {
      rmSync(siteDir, { recursive: true, force: true });
    }
  });
});

describe('scaffoldSite', () => {
  it('exports templates/waymark, drops its own guidance, and repoints both engine dependencies at their tarballs', () => {
    const repoRoot = tmp('waymark-repo');
    const dest = tmp('waymark-dest');
    try {
      write(
        join(repoRoot, 'templates/waymark/package.json'),
        JSON.stringify({
          name: 'site',
          dependencies: { '@glw907/cairn-cms': '^0.97.0' },
          devDependencies: { '@glw907/cairn-cms-dev': '^0.97.0', other: '^1.0.0' },
        }),
      );
      write(join(repoRoot, 'templates/waymark/src/routes/+page.svelte'), '<h1>hi</h1>');
      write(join(repoRoot, 'templates/waymark/CLAUDE.md'), 'setup guidance');
      write(join(repoRoot, 'templates/waymark/.claude/agents/x.md'), 'agent');
      commitAll(repoRoot);
      scaffoldSite({ repoRoot, dest, tarballs: { engine: '/cache/engine-abc123.tgz', dev: '/cache/dev-def456.tgz' } });
      expect(existsSync(join(dest, 'CLAUDE.md'))).toBe(false);
      expect(existsSync(join(dest, '.claude'))).toBe(false);
      expect(readFileSync(join(dest, 'src/routes/+page.svelte'), 'utf8')).toBe('<h1>hi</h1>');
      const pkg = JSON.parse(readFileSync(join(dest, 'package.json'), 'utf8'));
      expect(pkg.dependencies).toEqual({ '@glw907/cairn-cms': 'file:/cache/engine-abc123.tgz' });
      expect(pkg.devDependencies).toEqual({ '@glw907/cairn-cms-dev': 'file:/cache/dev-def456.tgz', other: '^1.0.0' });
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
      rmSync(dest, { recursive: true, force: true });
    }
  });

  it('throws when the archive step fails', () => {
    const dest = tmp('waymark-fail');
    try {
      const runner: CommandRunner = () => ({ status: 128, stdout: Buffer.alloc(0), stderr: 'unknown revision' });
      expect(() => scaffoldSite({ repoRoot: '/unused', dest, tarballs: { engine: 'e', dev: 'd' }, runner })).toThrow(/unknown revision/);
    } finally {
      rmSync(dest, { recursive: true, force: true });
    }
  });
});

describe('installAndStrip', () => {
  it('installs, then strips the installed engine copy, leaving the rest of node_modules', () => {
    const siteDir = tmp('install-site');
    try {
      write(join(siteDir, 'package.json'), '{}');
      const calls: Array<{ command: string; args: string[] }> = [];
      const runner: CommandRunner = (command, args, { cwd }) => {
        calls.push({ command, args });
        // A real `npm install` would populate node_modules; simulate the shape stripping acts on.
        for (const name of ['docs', 'claude', 'skills', 'dist']) write(join(cwd, 'node_modules/@glw907/cairn-cms', name, 'x'), 'x');
        write(join(cwd, 'node_modules/other-package/index.js'), 'kept');
        return { status: 0, stdout: Buffer.alloc(0), stderr: '' };
      };
      installAndStrip(siteDir, { runner });
      expect(calls).toEqual([{ command: 'npm', args: ['install', '--no-audit', '--no-fund'] }]);
      for (const name of ['docs', 'claude', 'skills']) {
        expect(existsSync(join(siteDir, 'node_modules/@glw907/cairn-cms', name))).toBe(false);
      }
      expect(existsSync(join(siteDir, 'node_modules/@glw907/cairn-cms/dist/x'))).toBe(true);
      expect(existsSync(join(siteDir, 'node_modules/other-package/index.js'))).toBe(true);
    } finally {
      rmSync(siteDir, { recursive: true, force: true });
    }
  });

  it('throws with the runner stderr when the install fails', () => {
    const siteDir = tmp('install-fail');
    try {
      const runner: CommandRunner = () => ({ status: 1, stdout: Buffer.alloc(0), stderr: 'ETARGET no matching version' });
      expect(() => installAndStrip(siteDir, { runner })).toThrow(/ETARGET no matching version/);
    } finally {
      rmSync(siteDir, { recursive: true, force: true });
    }
  });
});

describe('packTarball', () => {
  it('throws when the pack itself fails', () => {
    const packageDir = tmp('pkg-fail');
    const destDir = tmp('pkg-fail-dest');
    try {
      const runner: CommandRunner = () => ({ status: 1, stdout: Buffer.alloc(0), stderr: 'ENOENT' });
      expect(() => packTarball(packageDir, destDir, runner)).toThrow(/ENOENT/);
    } finally {
      rmSync(packageDir, { recursive: true, force: true });
      rmSync(destDir, { recursive: true, force: true });
    }
  });
});

describe('packEngineTarballs', () => {
  it('builds once, then packs the engine and the dev backend to content-addressed names', () => {
    const repoRoot = tmp('repo');
    const destDir = tmp('pack-dest');
    const devDir = join(repoRoot, 'packages/cairn-cms-dev');
    try {
      const calls: string[] = [];
      const runner: CommandRunner = (command, args, { cwd }) => {
        calls.push(`${command} ${args.join(' ')} (in ${cwd})`);
        if (command === 'npm' && args[0] === 'run') return { status: 0, stdout: Buffer.alloc(0), stderr: '' };
        if (command === 'npm' && args[0] === 'pack') {
          const destArg = args[args.indexOf('--pack-destination') + 1];
          const name = cwd === devDir ? 'glw907-cairn-cms-dev-0.97.0.tgz' : 'glw907-cairn-cms-0.97.0.tgz';
          writeFileSync(join(destArg, name), `fake-tarball-bytes-${name}`);
          return { status: 0, stdout: Buffer.from(`${name}\n`), stderr: '' };
        }
        throw new Error(`unexpected command in ${cwd}: ${command} ${args.join(' ')}`);
      };
      const tarballs = packEngineTarballs(repoRoot, destDir, runner);
      expect(calls).toEqual([
        `npm run package (in ${repoRoot})`,
        `npm pack --ignore-scripts --pack-destination ${destDir} --silent (in ${repoRoot})`,
        `npm pack --ignore-scripts --pack-destination ${destDir} --silent (in ${devDir})`,
      ]);
      expect(tarballs.engine).toMatch(/glw907-cairn-cms-0\.97\.0-[0-9a-f]{12}\.tgz$/);
      expect(tarballs.dev).toMatch(/glw907-cairn-cms-dev-0\.97\.0-[0-9a-f]{12}\.tgz$/);
      expect(existsSync(tarballs.engine)).toBe(true);
      expect(existsSync(tarballs.dev)).toBe(true);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
      rmSync(destDir, { recursive: true, force: true });
    }
  });

  it('throws when the build step fails, without attempting either pack', () => {
    const repoRoot = tmp('repo-build-fail');
    const destDir = tmp('pack-dest-fail');
    try {
      const runner: CommandRunner = () => ({ status: 1, stdout: Buffer.alloc(0), stderr: 'svelte-package failed' });
      expect(() => packEngineTarballs(repoRoot, destDir, runner)).toThrow(/svelte-package failed/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
      rmSync(destDir, { recursive: true, force: true });
    }
  });
});

/**
 * Write a minimal `package.json` with a `files` field, so `packageInputPaths`'s real read of it
 * (inside `tarballCacheKey`) finds something rather than throwing `ENOENT` against a bare tmp
 * directory.
 */
function writeFakePackageJson(repoRoot: string, files: string[] = ['dist', 'docs/admin', 'migrations']): void {
  writeFileSync(join(repoRoot, 'package.json'), JSON.stringify({ name: '@glw907/cairn-cms', files }));
}

/**
 * A runner that fakes `git rev-parse HEAD`, `git status --porcelain`, and a real `npm run
 * package` plus two `npm pack` calls, for the tarball-cache tests below. `head` is HEAD's own
 * commit; `dirty` lists the porcelain lines `git status` reports (empty for a clean tree).
 */
function fakeCacheableRunner({ head, dirty = [] as string[] }: { head: string; dirty?: string[] }): { runner: CommandRunner; calls: string[] } {
  const calls: string[] = [];
  const runner: CommandRunner = (command, args, { cwd }) => {
    calls.push(`${command} ${args.join(' ')}`);
    if (command === 'git' && args[0] === 'rev-parse') return { status: 0, stdout: Buffer.from(`${head}\n`), stderr: '' };
    if (command === 'git' && args[0] === 'status') return { status: 0, stdout: Buffer.from(dirty.length ? `${dirty.join('\n')}\n` : ''), stderr: '' };
    if (command === 'npm' && args[0] === 'run') return { status: 0, stdout: Buffer.alloc(0), stderr: '' };
    if (command === 'npm' && args[0] === 'pack') {
      const destArg = args[args.indexOf('--pack-destination') + 1];
      const name = cwd.endsWith('cairn-cms-dev') ? 'glw907-cairn-cms-dev-0.97.0.tgz' : 'glw907-cairn-cms-0.97.0.tgz';
      writeFileSync(join(destArg, name), `fake-tarball-bytes-${name}-${head}`);
      return { status: 0, stdout: Buffer.from(`${name}\n`), stderr: '' };
    }
    throw new Error(`unexpected command in ${cwd}: ${command} ${args.join(' ')}`);
  };
  return { runner, calls };
}

describe('packageInputPaths', () => {
  it('adds every package.json "files" entry except dist to the fixed build inputs', () => {
    const repoRoot = tmp('input-paths');
    try {
      writeFakePackageJson(repoRoot, ['dist', 'docs/admin', 'docs/editors', 'migrations', 'skills', 'claude', 'CHANGELOG.md']);
      const paths = packageInputPaths(repoRoot);
      expect(paths).toEqual(
        expect.arrayContaining([
          'src/lib',
          'packages/cairn-cms-dev',
          'package.json',
          'package-lock.json',
          'svelte.config.js',
          'tsconfig.json',
          'scripts/build',
          'README.md',
          'LICENSE',
          'docs/admin',
          'docs/editors',
          'migrations',
          'skills',
          'claude',
          'CHANGELOG.md',
        ]),
      );
      expect(paths).not.toContain('dist');
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});

describe('packEngineTarballs: the tarball cache', () => {
  it('builds on a cache miss, then skips npm run package and both packs on a hit for the same clean HEAD', () => {
    const repoRoot = tmp('cache-repo');
    const destDir = tmp('cache-dest');
    const cacheRoot = tmp('cache-root');
    try {
      writeFakePackageJson(repoRoot);
      const first = fakeCacheableRunner({ head: 'abc123' });
      const built = packEngineTarballs(repoRoot, destDir, first.runner, cacheRoot);
      expect(first.calls.some((c) => c.startsWith('npm run package'))).toBe(true);
      expect(first.calls.filter((c) => c.startsWith('npm pack'))).toHaveLength(2);

      const second = fakeCacheableRunner({ head: 'abc123' });
      const cached = packEngineTarballs(repoRoot, destDir, second.runner, cacheRoot);
      expect(second.calls.some((c) => c.startsWith('npm run package'))).toBe(false);
      expect(second.calls.some((c) => c.startsWith('npm pack'))).toBe(false);
      expect(readFileSync(cached.engine, 'utf8')).toBe(readFileSync(built.engine, 'utf8'));
      expect(readFileSync(cached.dev, 'utf8')).toBe(readFileSync(built.dev, 'utf8'));
    } finally {
      for (const dir of [repoRoot, destDir, cacheRoot]) rmSync(dir, { recursive: true, force: true });
    }
  });

  it('bypasses the cache when the tree is dirty in a path that feeds the build, even for a key already cached', () => {
    const repoRoot = tmp('cache-repo-dirty');
    const destDir = tmp('cache-dest-dirty');
    const cacheRoot = tmp('cache-root-dirty');
    try {
      writeFakePackageJson(repoRoot);
      const clean = fakeCacheableRunner({ head: 'abc123' });
      packEngineTarballs(repoRoot, destDir, clean.runner, cacheRoot);

      const dirty = fakeCacheableRunner({ head: 'abc123', dirty: [' M src/lib/index.ts'] });
      packEngineTarballs(repoRoot, destDir, dirty.runner, cacheRoot);
      expect(dirty.calls.some((c) => c.startsWith('npm run package'))).toBe(true);
      expect(dirty.calls.filter((c) => c.startsWith('npm pack'))).toHaveLength(2);
    } finally {
      for (const dir of [repoRoot, destDir, cacheRoot]) rmSync(dir, { recursive: true, force: true });
    }
  });

  it('checks every package.json "files" entry (docs pages included) for dirtiness, and a dirty docs page bypasses the cache', () => {
    const repoRoot = tmp('cache-repo-docs');
    const destDir = tmp('cache-dest-docs');
    const cacheRoot = tmp('cache-root-docs');
    try {
      writeFakePackageJson(repoRoot, ['dist', 'docs/admin', 'migrations']);
      const clean = fakeCacheableRunner({ head: 'abc123' });
      packEngineTarballs(repoRoot, destDir, clean.runner, cacheRoot);
      const statusCall = clean.calls.find((c) => c.startsWith('git status'));
      expect(statusCall).toContain('docs/admin');
      expect(statusCall).toContain('migrations');
      expect(statusCall?.split(' ')).not.toContain('dist');

      const dirty = fakeCacheableRunner({ head: 'abc123', dirty: [' M docs/admin/troubleshooting.md'] });
      packEngineTarballs(repoRoot, destDir, dirty.runner, cacheRoot);
      expect(dirty.calls.some((c) => c.startsWith('npm run package'))).toBe(true);
      expect(dirty.calls.filter((c) => c.startsWith('npm pack'))).toHaveLength(2);
    } finally {
      for (const dir of [repoRoot, destDir, cacheRoot]) rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rebuilds under a new key when HEAD moves, keeping the old key cached alongside it', () => {
    const repoRoot = tmp('cache-repo-key');
    const destDir = tmp('cache-dest-key');
    const cacheRoot = tmp('cache-root-key');
    try {
      writeFakePackageJson(repoRoot);
      const atFirstHead = fakeCacheableRunner({ head: 'abc123' });
      packEngineTarballs(repoRoot, destDir, atFirstHead.runner, cacheRoot);

      const atSecondHead = fakeCacheableRunner({ head: 'def456' });
      packEngineTarballs(repoRoot, destDir, atSecondHead.runner, cacheRoot);
      expect(atSecondHead.calls.some((c) => c.startsWith('npm run package'))).toBe(true);

      const atFirstHeadAgain = fakeCacheableRunner({ head: 'abc123' });
      packEngineTarballs(repoRoot, destDir, atFirstHeadAgain.runner, cacheRoot);
      expect(atFirstHeadAgain.calls.some((c) => c.startsWith('npm run package'))).toBe(false);
    } finally {
      for (const dir of [repoRoot, destDir, cacheRoot]) rmSync(dir, { recursive: true, force: true });
    }
  });

  it('keeps only the newest few keys, pruning an older one once the cache grows past that bound', () => {
    const repoRoot = tmp('cache-repo-prune');
    const destDir = tmp('cache-dest-prune');
    const cacheRoot = tmp('cache-root-prune');
    try {
      writeFakePackageJson(repoRoot);
      for (const head of ['h1', 'h2', 'h3', 'h4']) {
        const { runner } = fakeCacheableRunner({ head });
        packEngineTarballs(repoRoot, destDir, runner, cacheRoot);
      }
      const keys = readdirSync(join(cacheRoot, 'tarballs'));
      expect(keys).toHaveLength(3);
      expect(keys).not.toContain('h1');
      expect(keys).toEqual(expect.arrayContaining(['h2', 'h3', 'h4']));
    } finally {
      for (const dir of [repoRoot, destDir, cacheRoot]) rmSync(dir, { recursive: true, force: true });
    }
  });

  it('touches a key’s directory mtime on a cache hit, so eviction follows use rather than build order alone', () => {
    const repoRoot = tmp('cache-repo-touch');
    const destDir = tmp('cache-dest-touch');
    const cacheRoot = tmp('cache-root-touch');
    try {
      writeFakePackageJson(repoRoot);
      for (const head of ['h1', 'h2', 'h3']) {
        const { runner } = fakeCacheableRunner({ head });
        packEngineTarballs(repoRoot, destDir, runner, cacheRoot);
      }
      // Backdate all three, oldest to newest, so a plain build-order prune (ignoring use) would
      // evict h1 next, exactly the case a real cache hit on h1 must prevent.
      const tarballsDir = join(cacheRoot, 'tarballs');
      const old = new Date(Date.now() - 60_000);
      utimesSync(join(tarballsDir, 'h1'), old, new Date(old.getTime() + 1000));
      utimesSync(join(tarballsDir, 'h2'), old, new Date(old.getTime() + 2000));
      utimesSync(join(tarballsDir, 'h3'), old, new Date(old.getTime() + 3000));

      // A cache hit on h1 (same head, already cached): reading it back must touch its mtime to now.
      const hit = fakeCacheableRunner({ head: 'h1' });
      packEngineTarballs(repoRoot, destDir, hit.runner, cacheRoot);
      expect(hit.calls.some((c) => c.startsWith('npm run package'))).toBe(false);

      // A fourth, genuinely new key pushes the cache past its bound of three.
      const fresh = fakeCacheableRunner({ head: 'h4' });
      packEngineTarballs(repoRoot, destDir, fresh.runner, cacheRoot);

      const keys = readdirSync(tarballsDir);
      expect(keys).toHaveLength(3);
      expect(keys).not.toContain('h2'); // the true oldest, once h1's use bumped it out of that spot
      expect(keys).toEqual(expect.arrayContaining(['h1', 'h3', 'h4']));
    } finally {
      for (const dir of [repoRoot, destDir, cacheRoot]) rmSync(dir, { recursive: true, force: true });
    }
  });
});

/** A runner that fakes the templates/waymark export and a clean install, for `prepareDocsAndSite`. */
function fakeSiteRunner(): CommandRunner {
  return (command, args, { cwd }) => {
    if (command === 'git') return { status: 0, stdout: Buffer.from('fake-archive'), stderr: '' };
    if (command === 'tar') {
      // What the real `git archive templates/waymark | tar --strip-components=2` would leave.
      write(join(cwd, 'package.json'), JSON.stringify({ name: 'site', dependencies: {}, devDependencies: {} }));
      write(join(cwd, 'CLAUDE.md'), 'setup guidance');
      write(join(cwd, '.claude/agents/x.md'), 'agent');
      write(join(cwd, 'src/routes/+page.svelte'), '<h1>hi</h1>');
      return { status: 0, stdout: Buffer.alloc(0), stderr: '' };
    }
    if (command === 'npm' && args[0] === 'install') {
      write(join(cwd, 'node_modules/@glw907/cairn-cms/dist/index.js'), 'export {};');
      write(join(cwd, 'node_modules/@glw907/cairn-cms/docs/index.md'), 'answer key');
      return { status: 0, stdout: Buffer.alloc(0), stderr: '' };
    }
    throw new Error(`unexpected command: ${command} ${args.join(' ')}`);
  };
}

describe('prepareDocsAndSite', () => {
  it('builds the docs subtree and the scaffolded, installed site together, with the answer key stripped', () => {
    const sourceRoot = tmp('source-int');
    const dest = tmp('dest-int');
    try {
      write(join(sourceRoot, 'docs/extend/design-your-site.md'), '# design\n');
      prepareDocsAndSite({
        sourceRoot,
        docsSet: ['docs/extend/design-your-site.md'],
        tarballs: { engine: '/cache/engine-x.tgz', dev: '/cache/dev-y.tgz' },
        dest,
        runner: fakeSiteRunner(),
      });
      expect(readFileSync(join(dest, 'docs/extend/design-your-site.md'), 'utf8')).toBe('# design\n');
      expect(existsSync(join(dest, 'site/CLAUDE.md'))).toBe(false);
      expect(existsSync(join(dest, 'site/.claude'))).toBe(false);
      expect(existsSync(join(dest, 'site/node_modules/@glw907/cairn-cms/dist/index.js'))).toBe(true);
      expect(existsSync(join(dest, 'site/node_modules/@glw907/cairn-cms/docs'))).toBe(false);
      const pkg = JSON.parse(readFileSync(join(dest, 'site/package.json'), 'utf8'));
      expect(pkg.dependencies['@glw907/cairn-cms']).toBe('file:/cache/engine-x.tgz');
      expect(pkg.devDependencies['@glw907/cairn-cms-dev']).toBe('file:/cache/dev-y.tgz');
    } finally {
      for (const dir of [sourceRoot, dest]) rmSync(dir, { recursive: true, force: true });
    }
  });

  it('removes dest before rethrowing when a step fails partway through', () => {
    const sourceRoot = tmp('source-fail');
    const dest = tmp('dest-fail');
    try {
      write(join(sourceRoot, 'docs/extend/design-your-site.md'), '# design\n');
      const runner: CommandRunner = (command, args, { cwd }) => {
        if (command === 'git') return { status: 0, stdout: Buffer.from('fake-archive'), stderr: '' };
        if (command === 'tar') {
          // The scaffold's package.json lands before the install that fails next, so this proves
          // cleanup removes a partially built tree, not only one that never started.
          write(join(cwd, 'package.json'), JSON.stringify({ name: 'site' }));
          return { status: 0, stdout: Buffer.alloc(0), stderr: '' };
        }
        return { status: 1, stdout: Buffer.alloc(0), stderr: 'ETARGET' };
      };
      expect(() =>
        prepareDocsAndSite({
          sourceRoot,
          docsSet: ['docs/extend/design-your-site.md'],
          tarballs: { engine: '/cache/engine-x.tgz', dev: '/cache/dev-y.tgz' },
          dest,
          runner,
        }),
      ).toThrow(/ETARGET/);
      expect(existsSync(dest)).toBe(false);
    } finally {
      for (const dir of [sourceRoot, dest]) rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('assertNoExcludedPaths', () => {
  it('passes when none of the excluded paths exist', () => {
    const dir = tmp('clean-export');
    try {
      write(join(dir, 'README.md'), '# ok\n');
      expect(() => assertNoExcludedPaths(dir)).not.toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('lists every excluded path that survived', () => {
    const dir = tmp('dirty-export');
    try {
      write(join(dir, 'docs/superpowers/plan.md'), 'answer key');
      write(join(dir, '.git/HEAD'), 'ref: refs/heads/main');
      expect(() => assertNoExcludedPaths(dir)).toThrow(/docs\/superpowers.*\.git|\.git.*docs\/superpowers/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('prepareRepositoryExport', () => {
  it('exports a real commit and excludes the internal record and superpowers subtrees', () => {
    const repoRoot = tmp('git-repo');
    const dest = tmp('git-export');
    try {
      write(join(repoRoot, 'README.md'), '# a project\n');
      write(join(repoRoot, 'docs/internal/record/2026-01-01-note.md'), 'harvest note');
      write(join(repoRoot, 'docs/superpowers/plans/plan.md'), 'the answer key');
      commitAll(repoRoot);
      prepareRepositoryExport({ repoRoot, commit: 'HEAD', dest });
      expect(readFileSync(join(dest, 'README.md'), 'utf8')).toBe('# a project\n');
      expect(existsSync(join(dest, 'docs/internal/record'))).toBe(false);
      expect(existsSync(join(dest, 'docs/superpowers'))).toBe(false);
      expect(existsSync(join(dest, '.git'))).toBe(false);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
      rmSync(dest, { recursive: true, force: true });
    }
  });

  it('fails preparation when a planted docs/superpowers path survives the export, and removes dest', () => {
    // A test double for a pathspec exclusion that did not take: the runner ignores the exclude
    // arguments and plants the excluded path anyway, so this proves the post-export check, not
    // git's own exclusion syntax, is what fails preparation.
    const dest = tmp('survives-export');
    try {
      const runner: CommandRunner = (command, args) => {
        if (command === 'git') return { status: 0, stdout: Buffer.from('fake-archive'), stderr: '' };
        if (command === 'tar') {
          write(join(dest, 'docs/superpowers/plan.md'), 'answer key');
          write(join(dest, 'README.md'), '# a project\n');
          return { status: 0, stdout: Buffer.alloc(0), stderr: '' };
        }
        throw new Error(`unexpected command: ${command} ${args.join(' ')}`);
      };
      expect(() => prepareRepositoryExport({ repoRoot: '/unused', commit: 'HEAD', dest, runner })).toThrow(/docs\/superpowers/);
      expect(existsSync(dest)).toBe(false);
    } finally {
      rmSync(dest, { recursive: true, force: true });
    }
  });

  it('throws when the archive step fails, and removes dest', () => {
    const dest = tmp('archive-fail');
    try {
      const runner: CommandRunner = (command) => (command === 'git' ? { status: 128, stdout: Buffer.alloc(0), stderr: 'bad revision' } : { status: 0, stdout: Buffer.alloc(0), stderr: '' });
      expect(() => prepareRepositoryExport({ repoRoot: '/unused', commit: 'not-a-commit', dest, runner })).toThrow(/bad revision/);
      expect(existsSync(dest)).toBe(false);
    } finally {
      rmSync(dest, { recursive: true, force: true });
    }
  });
});

/** A minimal, well-formed scratch site record for the tests below. */
const scratchRecord: ScratchSiteRecord = {
  name: 'Cairn Scratch B',
  step: 'live',
  domain: 'cairn-scratch-b.glw907.workers.dev',
  schemaVersion: 1,
  adopted: true,
  github: { repo: { id: 1384270163, owner: 'glw907', repo: 'cairn-scratch-b', defaultBranch: 'main' }, installationId: 135372268 },
  cloudflare: { accountId: '120c269ad6d3dfbe6d63a0bb53758ca0', workerName: 'cairn-scratch-b' },
};

describe('writeScratchSiteRecord', () => {
  it('writes the record at owner-only permissions, the same mode the Node CLI itself writes', () => {
    const stateDir = join(tmp('state'), 'state');
    try {
      writeScratchSiteRecord(stateDir, 'cairn-scratch-b-9f21ac', scratchRecord);
      const file = join(stateDir, 'cairn-scratch-b-9f21ac.json');
      expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(scratchRecord);
      expect(statSync(stateDir).mode & 0o777).toBe(0o700);
      expect(statSync(file).mode & 0o777).toBe(0o600);
    } finally {
      rmSync(stateDir, { recursive: true, force: true });
    }
  });
});

describe('restrictStateDirPermissions', () => {
  it('re-tightens a state/ directory and its files that a plain cpSync left world-readable', () => {
    const root = tmp('restrict-source');
    const copy = tmp('restrict-copy');
    try {
      writeScratchSiteRecord(join(root, 'state'), 'cairn-scratch-b-9f21ac', scratchRecord);
      // cpSync preserves a copied file's mode but not a copied directory's, the exact drift a
      // job's two cpSync hops (prepare, then the mount copy) leave behind.
      cpSync(root, copy, { recursive: true });
      expect(statSync(join(copy, 'state')).mode & 0o777).not.toBe(0o700);
      restrictStateDirPermissions(copy);
      expect(statSync(join(copy, 'state')).mode & 0o777).toBe(0o700);
      expect(statSync(join(copy, 'state', 'cairn-scratch-b-9f21ac.json')).mode & 0o777).toBe(0o600);
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(copy, { recursive: true, force: true });
    }
  });

  it('does nothing when the tree carries no state/ directory', () => {
    const root = tmp('no-state');
    try {
      write(join(root, 'docs/page.md'), '# x\n');
      expect(() => restrictStateDirPermissions(root)).not.toThrow();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('prepareDocsAndBinary', () => {
  it('builds the docs subtree and a state/ registry holding exactly the one scratch-site record', () => {
    const sourceRoot = tmp('binary-source');
    const dest = tmp('binary-dest');
    try {
      write(join(sourceRoot, 'docs/admin/troubleshooting.md'), '# troubleshooting\n');
      prepareDocsAndBinary({
        sourceRoot,
        docsSet: ['docs/admin/troubleshooting.md'],
        siteId: 'cairn-scratch-b-9f21ac',
        record: scratchRecord,
        dest,
      });
      expect(readFileSync(join(dest, 'docs/admin/troubleshooting.md'), 'utf8')).toBe('# troubleshooting\n');
      const files = readFileSync(join(dest, 'state', 'cairn-scratch-b-9f21ac.json'), 'utf8');
      expect(JSON.parse(files)).toEqual(scratchRecord);
    } finally {
      rmSync(sourceRoot, { recursive: true, force: true });
      rmSync(dest, { recursive: true, force: true });
    }
  });

  it('removes dest before rethrowing when a named docs-set page is missing', () => {
    const sourceRoot = tmp('binary-source-fail');
    const dest = tmp('binary-dest-fail');
    try {
      expect(() =>
        prepareDocsAndBinary({
          sourceRoot,
          docsSet: ['docs/admin/missing.md'],
          siteId: 'cairn-scratch-b-9f21ac',
          record: scratchRecord,
          dest,
        }),
      ).toThrow(/does not exist/);
      expect(existsSync(dest)).toBe(false);
    } finally {
      rmSync(sourceRoot, { recursive: true, force: true });
      rmSync(dest, { recursive: true, force: true });
    }
  });
});
