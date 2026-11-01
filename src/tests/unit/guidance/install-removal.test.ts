import { describe, it, expect } from 'vitest';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  MANIFEST_DEST,
  hashContent,
  installGuidance,
  type GuidanceSource,
} from '../../../lib/guidance/install.js';

// The removal rules: a previously installed path the package stopped shipping goes only when the
// file's hash is one the package shipped, and everything else is kept and named.

const OLD_SKILL = '.claude/skills/old/SKILL.md';
const OLD_REF = '.claude/skills/old/references/README.md';
const OLD_AGENT = '.claude/agents/old-reviewer.md';

const SHIPPED: Record<string, string[]> = {
  [OLD_SKILL]: [hashContent('old core v1'), hashContent('old core v0')],
  [OLD_REF]: [hashContent('old index')],
  [OLD_AGENT]: [hashContent('old agent')],
};

function source(overrides: Partial<GuidanceSource> = {}): GuidanceSource {
  return {
    skills: { fresh: { 'SKILL.md': 'fresh core' } },
    agents: {},
    fragment: 'fragment',
    version: '2.0.0',
    snippets: {},
    refused: [],
    shippedHashes: SHIPPED,
    ...overrides,
  };
}

function tmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'cairn-guidance-removal-'));
}

function put(dir: string, rel: string, content: string): void {
  mkdirSync(join(dir, rel, '..'), { recursive: true });
  writeFileSync(join(dir, rel), content);
}

function manifest(dir: string, lines: string[]): void {
  put(dir, MANIFEST_DEST, `${lines.join('\n')}\n`);
}

function manifestLines(dir: string): string[] {
  return readFileSync(join(dir, MANIFEST_DEST), 'utf8').split('\n').filter(Boolean);
}

function withDir<T>(run: (dir: string) => Promise<T>): Promise<T> {
  const dir = tmpDir();
  return run(dir).finally(() => rmSync(dir, { recursive: true, force: true }));
}

describe('installGuidance removal', () => {
  it('deletes a listed path whose hash matches a shipped version, and the directories it empties', () =>
    withDir(async (dir) => {
      put(dir, OLD_SKILL, 'old core v0');
      put(dir, OLD_REF, 'old index');
      put(dir, OLD_AGENT, 'old agent');
      manifest(dir, [OLD_SKILL, OLD_REF, OLD_AGENT]);

      const report = await installGuidance(dir, source());

      expect(report.removed.sort()).toEqual([OLD_AGENT, OLD_REF, OLD_SKILL].sort());
      expect(existsSync(join(dir, '.claude/skills/old'))).toBe(false);
      expect(existsSync(join(dir, OLD_AGENT))).toBe(false);
      expect(existsSync(join(dir, '.claude/agents'))).toBe(true);
      expect(existsSync(join(dir, '.claude/skills/fresh/SKILL.md'))).toBe(true);
      expect(report.kept).toEqual([]);
      expect(manifestLines(dir)).not.toContain(OLD_SKILL);
    }));

  it('keeps an edited file, names it, and names it again on a second run', () =>
    withDir(async (dir) => {
      put(dir, OLD_SKILL, 'old core v1');
      put(dir, OLD_REF, 'the developer rewrote this');
      manifest(dir, [OLD_SKILL, OLD_REF]);

      const first = await installGuidance(dir, source());
      expect(first.removed).toEqual([OLD_SKILL]);
      expect(first.kept).toEqual([{ path: OLD_REF, reason: 'edited' }]);
      expect(readFileSync(join(dir, OLD_REF), 'utf8')).toBe('the developer rewrote this');
      expect(manifestLines(dir)).toContain(OLD_REF);
      // The directory holds the kept file, so it stays.
      expect(existsSync(join(dir, '.claude/skills/old'))).toBe(true);

      const second = await installGuidance(dir, source());
      expect(second.removed).toEqual([]);
      expect(second.kept).toEqual([{ path: OLD_REF, reason: 'edited' }]);
    }));

  it('drops a listed path that is already gone without reporting it', () =>
    withDir(async (dir) => {
      manifest(dir, [OLD_SKILL]);
      const report = await installGuidance(dir, source());
      expect(report.removed).toEqual([]);
      expect(report.kept).toEqual([]);
      expect(manifestLines(dir)).not.toContain(OLD_SKILL);
    }));

  it('lets a tampered MANIFEST authorize nothing: a path outside the shipped table is kept', () =>
    withDir(async (dir) => {
      put(dir, '.claude/skills/mine/SKILL.md', 'the developer wrote this');
      put(dir, '.claude/settings.json', '{"keep":true}');
      put(dir, 'package.json', '{"name":"site"}');
      manifest(dir, ['.claude/skills/mine/SKILL.md', '.claude/settings.json', 'package.json', '/etc/passwd', '../../x']);

      const report = await installGuidance(dir, source());

      expect(report.removed).toEqual([]);
      expect(report.kept).toEqual([{ path: '.claude/skills/mine/SKILL.md', reason: 'unrecognized' }]);
      expect(readFileSync(join(dir, '.claude/skills/mine/SKILL.md'), 'utf8')).toBe('the developer wrote this');
      expect(readFileSync(join(dir, '.claude/settings.json'), 'utf8')).toBe('{"keep":true}');
      expect(readFileSync(join(dir, 'package.json'), 'utf8')).toBe('{"name":"site"}');
    }));

  it('never acts on a bare .claude line or a path outside skills and agents', () =>
    withDir(async (dir) => {
      put(dir, '.claude/cairn/CLAUDE.md', 'fragment');
      manifest(dir, ['.claude', '.claude/skills', '.claude/agents', '.claude/cairn/old.md']);
      const report = await installGuidance(dir, source());
      expect(report.removed).toEqual([]);
      expect(report.kept).toEqual([]);
      expect(existsSync(join(dir, '.claude/skills'))).toBe(true);
    }));

  it('keeps a symlink at a listed path and never follows it', () =>
    withDir(async (dir) => {
      const outside = tmpDir();
      try {
        put(outside, 'target.md', 'old core v1');
        mkdirSync(join(dir, '.claude/skills/old'), { recursive: true });
        symlinkSync(join(outside, 'target.md'), join(dir, OLD_SKILL));
        manifest(dir, [OLD_SKILL]);

        const report = await installGuidance(dir, source());

        expect(report.removed).toEqual([]);
        expect(report.kept).toEqual([{ path: OLD_SKILL, reason: 'not-a-file' }]);
        expect(lstatSync(join(dir, OLD_SKILL)).isSymbolicLink()).toBe(true);
        expect(readFileSync(join(outside, 'target.md'), 'utf8')).toBe('old core v1');
      } finally {
        rmSync(outside, { recursive: true, force: true });
      }
    }));

  it('keeps a symlinked parent directory and what lies behind it', () =>
    withDir(async (dir) => {
      const outside = tmpDir();
      try {
        put(outside, 'SKILL.md', 'old core v1');
        mkdirSync(join(dir, '.claude/skills'), { recursive: true });
        symlinkSync(outside, join(dir, '.claude/skills/old'));
        manifest(dir, [OLD_SKILL]);

        const report = await installGuidance(dir, source());

        expect(report.removed).toEqual([]);
        expect(report.kept).toEqual([{ path: OLD_SKILL, reason: 'not-a-file' }]);
        expect(existsSync(join(outside, 'SKILL.md'))).toBe(true);
      } finally {
        rmSync(outside, { recursive: true, force: true });
      }
    }));

  it('keeps a directory sitting where a listed file was', () =>
    withDir(async (dir) => {
      mkdirSync(join(dir, OLD_SKILL), { recursive: true });
      manifest(dir, [OLD_SKILL]);
      const report = await installGuidance(dir, source());
      expect(report.removed).toEqual([]);
      expect(report.kept).toEqual([{ path: OLD_SKILL, reason: 'not-a-file' }]);
      expect(lstatSync(join(dir, OLD_SKILL)).isDirectory()).toBe(true);
    }));

  it('reports an old-name skill directory when there is no MANIFEST, and deletes nothing', () =>
    withDir(async (dir) => {
      put(dir, OLD_SKILL, 'old core v1');
      const report = await installGuidance(dir, source());
      expect(report.removed).toEqual([]);
      expect(report.unmanaged).toEqual(['.claude/skills/old']);
      expect(readFileSync(join(dir, OLD_SKILL), 'utf8')).toBe('old core v1');
    }));

  it('leaves .orig files in place and does not remove a directory that holds one', () =>
    withDir(async (dir) => {
      put(dir, OLD_SKILL, 'old core v1');
      put(dir, `${OLD_SKILL}.orig`, 'earlier edit');
      manifest(dir, [OLD_SKILL]);
      const report = await installGuidance(dir, source());
      expect(report.removed).toEqual([OLD_SKILL]);
      expect(readFileSync(join(dir, `${OLD_SKILL}.orig`), 'utf8')).toBe('earlier edit');
      expect(readdirSync(join(dir, '.claude/skills/old'))).toEqual(['SKILL.md.orig']);
    }));

  it('survives a crash between the deletes and the MANIFEST write: a rerun finishes the job', () =>
    withDir(async (dir) => {
      // The state a crash leaves: the old MANIFEST still lists a path whose file is gone, and a
      // half-written temp file sits beside it.
      put(dir, OLD_REF, 'old index');
      manifest(dir, [OLD_SKILL, OLD_REF]);
      put(dir, `${MANIFEST_DEST}.tmp`, 'half written');

      const report = await installGuidance(dir, source());

      expect(report.removed).toEqual([OLD_REF]);
      expect(manifestLines(dir)).not.toContain(OLD_SKILL);
      expect(existsSync(join(dir, `${MANIFEST_DEST}.tmp`))).toBe(false);
    }));

  it('is a no-op on rerun once everything removable is gone', () =>
    withDir(async (dir) => {
      put(dir, OLD_SKILL, 'old core v1');
      manifest(dir, [OLD_SKILL]);
      await installGuidance(dir, source());
      const again = await installGuidance(dir, source());
      expect(again.removed).toEqual([]);
      expect(again.kept).toEqual([]);
      expect(again.written).toEqual([]);
    }));

  it('writes nothing and deletes nothing under dryRun, and lists what a real run would do', () =>
    withDir(async (dir) => {
      put(dir, OLD_SKILL, 'old core v1');
      put(dir, OLD_REF, 'edited');
      manifest(dir, [OLD_SKILL, OLD_REF]);
      const before = readFileSync(join(dir, MANIFEST_DEST), 'utf8');

      const report = await installGuidance(dir, source(), { dryRun: true });

      expect(report.removed).toEqual([OLD_SKILL]);
      expect(report.kept).toEqual([{ path: OLD_REF, reason: 'edited' }]);
      expect(report.written).toContain('.claude/skills/fresh/SKILL.md');
      expect(existsSync(join(dir, OLD_SKILL))).toBe(true);
      expect(existsSync(join(dir, '.claude/skills/fresh'))).toBe(false);
      expect(readFileSync(join(dir, MANIFEST_DEST), 'utf8')).toBe(before);
    }));
});
