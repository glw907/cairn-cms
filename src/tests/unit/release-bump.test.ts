import { describe, it, expect, afterEach } from 'vitest';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { bump } from '../../../scripts/release/bump.mjs';
import { checkStableSource } from '../../../scripts/checks/check-stable-source.mjs';

const FIXTURE = resolve(__dirname, 'fixtures/release-bump/rc3');
const VERSION_FILE = 'templates/waymark/.claude/cairn/VERSION';
const SEVEN = [
  'CHANGELOG.md',
  'MIGRATION-NOTES.md',
  'package-lock.json',
  'package.json',
  'packages/cairn-cms-dev/package.json',
  VERSION_FILE,
  'templates/waymark/package.json'
];

const roots: string[] = [];
afterEach(() => {
  for (const r of roots.splice(0)) rmSync(r, { recursive: true, force: true });
});

/** A copy of the rc3 fixture, plus the VERSION file the fixtures keep out of the repo's `.claude`. */
function tree(): string {
  const root = mkdtempSync(join(tmpdir(), 'release-bump-'));
  roots.push(root);
  cpSync(FIXTURE, root, { recursive: true });
  mkdirSync(join(root, 'templates/waymark/.claude/cairn'), { recursive: true });
  writeFileSync(join(root, VERSION_FILE), '0.99.0-rc.3');
  return root;
}

function snapshot(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === '.git') continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else out[p.slice(root.length + 1)] = readFileSync(p, 'utf8');
    }
  };
  walk(root);
  return out;
}

interface Fake {
  dirty?: boolean;
  emitStatus?: number;
}

/** A runner whose `emit:template` derives the template pins and VERSION from the root manifest. */
function runner(root: string, fake: Fake = {}) {
  const calls: string[] = [];
  const run = (cmd: string, args: string[]) => {
    const key = [cmd, ...args].join(' ');
    calls.push(key);
    if (key === 'git status --porcelain') return { status: 0, stdout: fake.dirty ? ' M package.json\n' : '' };
    if (key === 'npm run emit:template') {
      if (fake.emitStatus) return { status: fake.emitStatus, stdout: 'emit exploded' };
      const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
      writeFileSync(join(root, VERSION_FILE), version);
      const pkgPath = join(root, 'templates/waymark/package.json');
      writeFileSync(pkgPath, readFileSync(pkgPath, 'utf8').replace(/\^[^"]+/g, `^${version}`));
      return { status: 0, stdout: '' };
    }
    return { status: 1, stdout: '' };
  };
  return { run, calls };
}

const DATE = '2026-11-04';

describe('bump', () => {
  it('changes exactly the seven files, emitting the template after the manifests are written', () => {
    const root = tree();
    const before = snapshot(root);
    const { run, calls } = runner(root);
    const result = bump(run, { root, version: '0.99.0-rc.4', date: DATE });
    expect(result.ok).toBe(true);
    expect(result.next).toMatch(/^Next: /);
    const after = snapshot(root);
    const changed = Object.keys(after).filter((p) => after[p] !== before[p]).sort();
    expect(changed).toEqual(SEVEN);
    expect(after['CHANGELOG.md']).toMatch(/^## 0\.99\.0-rc\.4\n\nReleased 2026-11-04\.\n\n<!-- release-size: minor -->/);
    expect(after['MIGRATION-NOTES.md']).toContain('## 0.99.0-rc.4');
    expect(after['MIGRATION-NOTES.md']).toContain('(./CHANGELOG.md#0990-rc4)');
    expect(after['MIGRATION-NOTES.md']).not.toContain('0990-rc3');
    const lock = JSON.parse(after['package-lock.json']);
    expect(lock.version).toBe('0.99.0-rc.4');
    expect(lock.packages['node_modules/other'].version).toBe('1.2.3');
    expect(after[VERSION_FILE]).toBe('0.99.0-rc.4');
    expect(calls.at(-1)).toBe('npm run emit:template');
  });

  it('writes nothing on a second run', () => {
    const root = tree();
    bump(runner(root).run, { root, version: '0.99.0-rc.4', date: DATE });
    const once = snapshot(root);
    const result = bump(runner(root).run, { root, version: '0.99.0-rc.4', date: DATE });
    expect(result.ok).toBe(true);
    expect(result.changed).toEqual([]);
    expect(snapshot(root)).toEqual(once);
  });

  it('refuses a dirty tree and names git restore', () => {
    const root = tree();
    const before = snapshot(root);
    const result = bump(runner(root, { dirty: true }).run, { root, version: '0.99.0-rc.4', date: DATE });
    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('git restore');
    expect(snapshot(root)).toEqual(before);
  });

  it('refuses an Unreleased window above a heading on the same numeric core', () => {
    const root = tree();
    const path = join(root, 'CHANGELOG.md');
    writeFileSync(path, `## Unreleased\n\nNew work.\n\n${readFileSync(path, 'utf8')}`);
    const before = snapshot(root);
    const result = bump(runner(root).run, { root, version: '0.99.0-rc.4', date: DATE });
    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('Unreleased');
    expect(snapshot(root)).toEqual(before);
  });

  it('restores every written file when the emit fails', () => {
    const root = tree();
    const before = snapshot(root);
    const result = bump(runner(root, { emitStatus: 1 }).run, { root, version: '0.99.0-rc.4', date: DATE });
    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('emit:template');
    expect(snapshot(root)).toEqual(before);
  });

  it('yields a stable cut that the stable-source gate accepts', () => {
    const root = tree();
    bump(runner(root).run, { root, version: '0.99.0-rc.4', date: DATE });
    const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
    git('init', '-q');
    git('add', '-A');
    git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'candidate');
    const bumped = bump(runner(root).run, { root, version: '0.99.0', date: '2026-11-05' });
    expect(bumped.ok).toBe(true);

    const raw = git('diff', '--raw', '--no-abbrev', 'HEAD');
    const result = checkStableSource((cmd, args) => {
      const key = [cmd, ...args].join(' ');
      if (key === 'git fetch origin main') return { status: 0, stdout: '' };
      if (key === 'git rev-parse HEAD' || key === 'git rev-parse origin/main') return { status: 0, stdout: 'abc' };
      if (cmd === 'npm') return { status: 0, stdout: '0.99.0-rc.4' };
      if (key.startsWith('git rev-parse -q --verify')) return { status: 0, stdout: '' };
      if (key.startsWith('git diff --raw')) return { status: 0, stdout: raw };
      if (key.startsWith('git diff --text')) return { status: 0, stdout: git('diff', '--text', 'HEAD', '--', args.at(-1)!) };
      return { status: 1, stdout: '' };
    });
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(readFileSync(join(root, 'CHANGELOG.md'), 'utf8')).toMatch(/^## 0\.99\.0\n\nReleased 2026-11-05\.\n/);
  });
});
