import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  assertNoExcludedPaths,
  assertSiteAnswerKeyAbsent,
  copyDocsSet,
  installAndStrip,
  packEngineTarballs,
  packTarball,
  prepareDocsAndSite,
  prepareRepositoryExport,
  scaffoldSite,
  stripInstalledEngineExtras,
  type CommandRunner,
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
