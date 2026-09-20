import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  CAIRN_DIR,
  FRAGMENT_DEST,
  MANIFEST_DEST,
  VERSION_DEST,
  GUIDANCE_ROOT,
  flattenGuidanceTree,
  hashFileTree,
  installGuidance,
  isContained,
  readPackagedSkills,
  resolveInstalledVersion,
  resolveSourceRoot,
  walkPackagedTree,
  type GuidanceSource,
} from '../../../lib/guidance/install.js';

function tmpDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

describe('hashFileTree', () => {
  it('is order-independent', () => {
    const a = hashFileTree({ 'a.md': '1', 'b.md': '2' });
    const b = hashFileTree({ 'b.md': '2', 'a.md': '1' });
    expect(a).toBe(b);
  });

  it('differs when any file content differs', () => {
    expect(hashFileTree({ 'a.md': '1' })).not.toBe(hashFileTree({ 'a.md': '2' }));
  });

  it('differs when the file set differs', () => {
    expect(hashFileTree({ 'a.md': '1' })).not.toBe(hashFileTree({ 'a.md': '1', 'b.md': '2' }));
  });

  it('hashes an empty tree consistently', () => {
    expect(hashFileTree({})).toBe(hashFileTree({}));
  });
});

describe('resolveSourceRoot', () => {
  it('resolves a packaged subdirectory against this repo\'s own installed package', () => {
    expect(resolveSourceRoot('skills').replace(/\\/g, '/')).toMatch(/\/skills$/);
  });
});

describe('resolveInstalledVersion', () => {
  it('reads a semver-shaped string off the installed package.json', () => {
    expect(resolveInstalledVersion()).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe('walkPackagedTree (real filesystem)', () => {
  it('reads this repo\'s own cairn-admin-screens skill tree', async () => {
    const { files, refused } = await walkPackagedTree(resolveSourceRoot('skills/cairn-admin-screens'));
    expect(Object.keys(files)).toContain('SKILL.md');
    expect(files['SKILL.md']).toContain('cairn-admin-screens');
    expect(refused).toEqual([]);
  });

  it('refuses a symlink entry by name, without following it, and reads every regular file', async () => {
    const root = tmpDir('cairn-guidance-walk-');
    const outside = tmpDir('cairn-guidance-outside-');
    try {
      writeFileSync(join(outside, 'secret.md'), 'host content');
      writeFileSync(join(root, 'SKILL.md'), 'a real skill file');
      symlinkSync(join(outside, 'secret.md'), join(root, 'linked.md'));

      const { files, refused } = await walkPackagedTree(root);

      expect(files['SKILL.md']).toBe('a real skill file');
      expect(files['linked.md']).toBeUndefined();
      expect(Object.values(files)).not.toContain('host content');
      expect(refused).toEqual(['linked.md']);
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });
});

describe('readPackagedSkills (real filesystem)', () => {
  it('enumerates every directory under skills/, fixtured by whatever the repo actually ships', async () => {
    const skills = await readPackagedSkills();
    expect(Object.keys(skills)).toContain('cairn-admin-screens');
    expect(skills['cairn-admin-screens']['SKILL.md']).toContain('cairn-admin-screens');
  });
});

describe('isContained', () => {
  it('accepts a destination under .claude', () => {
    expect(isContained('/site', '.claude/skills/foo/SKILL.md')).toBe(true);
  });

  it('refuses a destination that escapes .claude via traversal', () => {
    expect(isContained('/site', '.claude/skills/foo/../../../evil.md')).toBe(false);
  });

  it('refuses a destination entirely outside .claude', () => {
    expect(isContained('/site', 'package.json')).toBe(false);
  });
});

describe('flattenGuidanceTree', () => {
  const source: GuidanceSource = {
    skills: { foo: { 'SKILL.md': 'core' } },
    agents: { 'cairn-extension-reviewer.md': 'agent' },
    fragment: 'fragment text',
    version: '1.2.3',
  };

  it('maps every packaged tree to its destination under .claude', () => {
    const tree = flattenGuidanceTree(source);
    expect(tree['.claude/skills/foo/SKILL.md']).toBe('core');
    expect(tree['.claude/agents/cairn-extension-reviewer.md']).toBe('agent');
    expect(tree[FRAGMENT_DEST]).toBe('fragment text');
    expect(tree[VERSION_DEST]).toBe('1.2.3');
  });
});

describe('installGuidance', () => {
  function source(overrides: Partial<GuidanceSource> = {}): GuidanceSource {
    return {
      skills: { foo: { 'SKILL.md': 'core v1', 'references/README.md': 'index' } },
      agents: { 'cairn-extension-reviewer.md': 'agent v1' },
      fragment: 'fragment v1',
      version: '1.0.0',
      ...overrides,
    };
  }

  it('installs into an empty tree: one .claude/skills/<dir>/ per packaged skill, the agent, the fragment, VERSION, and MANIFEST', async () => {
    const dir = tmpDir('cairn-guidance-fresh-');
    try {
      const report = await installGuidance(dir, source());
      expect(report.refused).toEqual([]);
      expect(readFileSync(join(dir, '.claude/skills/foo/SKILL.md'), 'utf8')).toBe('core v1');
      expect(readFileSync(join(dir, '.claude/skills/foo/references/README.md'), 'utf8')).toBe('index');
      expect(readFileSync(join(dir, '.claude/agents/cairn-extension-reviewer.md'), 'utf8')).toBe('agent v1');
      expect(readFileSync(join(dir, FRAGMENT_DEST), 'utf8')).toBe('fragment v1');
      expect(readFileSync(join(dir, VERSION_DEST), 'utf8')).toBe('1.0.0');
      const manifest = readFileSync(join(dir, MANIFEST_DEST), 'utf8');
      expect(manifest).toContain('.claude/skills/foo/SKILL.md');
      expect(manifest).toContain(FRAGMENT_DEST);
      expect(report.origWritten).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('writes .orig beside a destination an edit diverged from, and lists it', async () => {
    const dir = tmpDir('cairn-guidance-edited-');
    try {
      mkdirSync(join(dir, '.claude/skills/foo'), { recursive: true });
      writeFileSync(join(dir, '.claude/skills/foo/SKILL.md'), 'hand-edited content');

      const report = await installGuidance(dir, source());

      expect(report.origWritten).toContain('.claude/skills/foo/SKILL.md.orig');
      expect(readFileSync(join(dir, '.claude/skills/foo/SKILL.md.orig'), 'utf8')).toBe('hand-edited content');
      expect(readFileSync(join(dir, '.claude/skills/foo/SKILL.md'), 'utf8')).toBe('core v1');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('never rewrites an existing .orig on a later install, even when the destination is edited again', async () => {
    const dir = tmpDir('cairn-guidance-reedit-');
    try {
      // First install with no prior content: writes the file fresh, no .orig.
      await installGuidance(dir, source());
      // The site edits the installed file, then installs again: the FIRST divergence is preserved.
      writeFileSync(join(dir, '.claude/skills/foo/SKILL.md'), 'edit one');
      const second = await installGuidance(dir, source());
      expect(second.origWritten).toContain('.claude/skills/foo/SKILL.md.orig');
      expect(readFileSync(join(dir, '.claude/skills/foo/SKILL.md.orig'), 'utf8')).toBe('edit one');

      // The site edits again; a third install must leave the .orig from edit one untouched.
      writeFileSync(join(dir, '.claude/skills/foo/SKILL.md'), 'edit two');
      const third = await installGuidance(dir, source({ skills: { foo: { 'SKILL.md': 'core v2', 'references/README.md': 'index' } } }));
      expect(third.origPresent).toContain('.claude/skills/foo/SKILL.md.orig');
      expect(third.origWritten).not.toContain('.claude/skills/foo/SKILL.md.orig');
      expect(readFileSync(join(dir, '.claude/skills/foo/SKILL.md.orig'), 'utf8')).toBe('edit one');
      expect(readFileSync(join(dir, '.claude/skills/foo/SKILL.md'), 'utf8')).toBe('core v2');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('refuses a packaged entry whose relative path escapes .claude, writing nothing outside it, and leaves untouched sentinel files byte-identical', async () => {
    const dir = tmpDir('cairn-guidance-traversal-');
    try {
      // Four files the bin must never touch, per the write-containment rule.
      mkdirSync(join(dir, '.claude'), { recursive: true });
      mkdirSync(join(dir, '.github/workflows'), { recursive: true });
      writeFileSync(join(dir, '.claude/settings.json'), '{"known":true}');
      writeFileSync(join(dir, 'CLAUDE.md'), '# root claude md');
      writeFileSync(join(dir, 'package.json'), '{"name":"site"}');
      writeFileSync(join(dir, '.github/workflows/check.yml'), 'name: check\n');

      const evil = source({ skills: { foo: { '../../../evil.md': 'escape attempt' } } });
      const report = await installGuidance(dir, evil);

      expect(report.refused).toContain('.claude/skills/foo/../../../evil.md');
      expect(existsSync(join(dir, 'evil.md'))).toBe(false);
      expect(readFileSync(join(dir, '.claude/settings.json'), 'utf8')).toBe('{"known":true}');
      expect(readFileSync(join(dir, 'CLAUDE.md'), 'utf8')).toBe('# root claude md');
      expect(readFileSync(join(dir, 'package.json'), 'utf8')).toBe('{"name":"site"}');
      expect(readFileSync(join(dir, '.github/workflows/check.yml'), 'utf8')).toBe('name: check\n');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('never deletes a path a previous MANIFEST listed; a package that stops shipping it reports it removable', async () => {
    const dir = tmpDir('cairn-guidance-removable-');
    try {
      await installGuidance(dir, source());
      expect(existsSync(join(dir, '.claude/skills/foo/SKILL.md'))).toBe(true);

      const shrunk = source({ skills: {} });
      const second = await installGuidance(dir, shrunk);

      expect(second.removable).toContain('.claude/skills/foo/SKILL.md');
      expect(second.removable).toContain('.claude/skills/foo/references/README.md');
      // Never deletes: the retired file is still on disk.
      expect(existsSync(join(dir, '.claude/skills/foo/SKILL.md'))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('GUIDANCE_ROOT and CAIRN_DIR', () => {
  it('nest CAIRN_DIR under GUIDANCE_ROOT', () => {
    expect(CAIRN_DIR.startsWith(`${GUIDANCE_ROOT}/`)).toBe(true);
  });
});
