import { describe, it, expect, vi } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync, readFileSync, existsSync, lstatSync } from 'node:fs';
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
  isGuidancePath,
  readPackagedSkills,
  readPackagedSnippets,
  resolveInstalledVersion,
  resolveSourceRoot,
  walkPackagedTree,
  type GuidanceSource,
} from '../../../lib/guidance/install.js';

// A mocked `open` failure for one write test below, so a disk-error assertion runs
// deterministically on every CI runner rather than depending on an environment-specific
// permission trick. `vi.hoisted` is required because the mock factory below runs before this
// module's own top-level statements, so it cannot close over a plain `let`.
const writeFailures = vi.hoisted(() => new Map<string, string>());

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    open: async (path: string, flags: number) => {
      const code = writeFailures.get(path);
      if (code !== undefined) {
        writeFailures.delete(path);
        const err = new Error(`mocked ${code}`) as NodeJS.ErrnoException;
        err.code = code;
        throw err;
      }
      return actual.open(path, flags);
    },
  };
});

function tmpDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

// A Windows host without Developer Mode cannot create a symlink at all, so the symlink cases
// below announce that reason rather than failing as if the refusal had not happened.
function canSymlink(): boolean {
  const probe = mkdtempSync(join(tmpdir(), 'cairn-guidance-symlink-probe-'));
  try {
    symlinkSync(join(probe, 'target'), join(probe, 'link'));
    return true;
  } catch {
    return false;
  } finally {
    rmSync(probe, { recursive: true, force: true });
  }
}

const SYMLINKS = canSymlink();

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
    const { skills, refused } = await readPackagedSkills();
    expect(Object.keys(skills)).toContain('cairn-admin-screens');
    expect(skills['cairn-admin-screens']['SKILL.md']).toContain('cairn-admin-screens');
    expect(refused).toEqual([]);
  });
});

describe('readPackagedSnippets (real filesystem)', () => {
  it('returns a flat map of snippet contents, empty when claude/snippets/ is not shipped', async () => {
    const { files: snippets } = await readPackagedSnippets();
    for (const value of Object.values(snippets)) {
      expect(typeof value).toBe('string');
    }
    if (!existsSync(resolveSourceRoot('claude/snippets'))) {
      expect(snippets).toEqual({});
    }
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

describe('isGuidancePath', () => {
  it('accepts a relative path under .claude', () => {
    expect(isGuidancePath('.claude/cairn/CLAUDE.md')).toBe(true);
  });

  it('refuses an absolute path', () => {
    expect(isGuidancePath('/etc/passwd')).toBe(false);
  });

  it('refuses a relative path that traverses out of .claude', () => {
    expect(isGuidancePath('../../x')).toBe(false);
    expect(isGuidancePath('.claude/../../x')).toBe(false);
  });
});

describe('flattenGuidanceTree', () => {
  const source: GuidanceSource = {
    skills: { foo: { 'SKILL.md': 'core' } },
    agents: { 'cairn-extension-reviewer.md': 'agent' },
    fragment: 'fragment text',
    version: '1.2.3',
    snippets: {},
    refused: [],
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
      snippets: {},
      refused: [],
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

  it('drops a previous MANIFEST line that is absolute or traverses out, printing neither as removable', async () => {
    const dir = tmpDir('cairn-guidance-manifest-lines-');
    try {
      mkdirSync(join(dir, CAIRN_DIR), { recursive: true });
      writeFileSync(
        join(dir, MANIFEST_DEST),
        ['/etc/passwd', '../../x', '.claude/skills/retired/SKILL.md', ''].join('\n')
      );

      const report = await installGuidance(dir, source());

      expect(report.removable).toEqual(['.claude/skills/retired/SKILL.md']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reports packaged entries the source walk refused, so a non-regular file in the package is named', async () => {
    const dir = tmpDir('cairn-guidance-source-refused-');
    try {
      const report = await installGuidance(dir, source({ refused: ['skills/foo/linked.md'] }));
      expect(report.sourceRefused).toEqual(['skills/foo/linked.md']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('refuses a destination that exists as a directory, and installs everything else', async () => {
    const dir = tmpDir('cairn-guidance-eisdir-');
    try {
      mkdirSync(join(dir, '.claude/skills/foo/SKILL.md'), { recursive: true });

      const report = await installGuidance(dir, source());

      expect(report.refused).toContain('.claude/skills/foo/SKILL.md');
      expect(report.written).toContain(FRAGMENT_DEST);
      expect(readFileSync(join(dir, FRAGMENT_DEST), 'utf8')).toBe('fragment v1');
      expect(readFileSync(join(dir, '.claude/skills/foo/references/README.md'), 'utf8')).toBe('index');
      expect(readFileSync(join(dir, MANIFEST_DEST), 'utf8')).not.toContain('.claude/skills/foo/SKILL.md\n');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reports a failed write as an error carrying its errno code, not a containment refusal', async () => {
    const dir = tmpDir('cairn-guidance-write-error-');
    try {
      const destAbs = join(dir, '.claude/skills/foo/SKILL.md');
      writeFailures.set(destAbs, 'ENOSPC');

      const report = await installGuidance(dir, source());

      expect(report.refused).not.toContain('.claude/skills/foo/SKILL.md');
      expect(report.writeErrors).toContainEqual({
        path: '.claude/skills/foo/SKILL.md',
        code: 'ENOSPC',
      });
    } finally {
      writeFailures.clear();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it.skipIf(!SYMLINKS)('installs normally when the project directory is reached through a symlinked parent', async () => {
    const parent = tmpDir('cairn-guidance-linked-parent-');
    try {
      const real = join(parent, 'real-site');
      mkdirSync(real);
      symlinkSync(real, join(parent, 'site'));

      const report = await installGuidance(join(parent, 'site'), source());

      expect(report.refused).toEqual([]);
      expect(readFileSync(join(real, '.claude/skills/foo/SKILL.md'), 'utf8')).toBe('core v1');
      expect(existsSync(join(real, MANIFEST_DEST))).toBe(true);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it.skipIf(!SYMLINKS)('refuses every destination when .claude itself is a symlink, writing nothing through it', async () => {
    const dir = tmpDir('cairn-guidance-link-root-');
    const outside = tmpDir('cairn-guidance-link-root-target-');
    try {
      symlinkSync(outside, join(dir, GUIDANCE_ROOT));

      const report = await installGuidance(dir, source());

      expect(report.written).toEqual([]);
      expect(report.refused).toContain('.claude/skills/foo/SKILL.md');
      expect(report.refused).toContain(FRAGMENT_DEST);
      expect(report.refused).toContain(VERSION_DEST);
      expect(report.refused).toContain(MANIFEST_DEST);
      expect(existsSync(join(outside, 'skills'))).toBe(false);
      expect(existsSync(join(outside, 'cairn'))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it.skipIf(!SYMLINKS)('refuses destinations under a symlinked .claude/skills, and installs the rest', async () => {
    const dir = tmpDir('cairn-guidance-link-skills-');
    const outside = tmpDir('cairn-guidance-link-skills-target-');
    try {
      mkdirSync(join(dir, GUIDANCE_ROOT));
      symlinkSync(outside, join(dir, `${GUIDANCE_ROOT}/skills`));

      const report = await installGuidance(dir, source());

      expect(report.refused).toContain('.claude/skills/foo/SKILL.md');
      expect(report.refused).toContain('.claude/skills/foo/references/README.md');
      expect(existsSync(join(outside, 'foo'))).toBe(false);
      expect(readFileSync(join(dir, FRAGMENT_DEST), 'utf8')).toBe('fragment v1');
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it.skipIf(!SYMLINKS)('refuses a destination that is itself a symlink, leaving the link and its target untouched', async () => {
    const dir = tmpDir('cairn-guidance-link-dest-');
    const outside = tmpDir('cairn-guidance-link-dest-target-');
    try {
      const target = join(outside, 'settings.json');
      writeFileSync(target, '{"host":true}');
      mkdirSync(join(dir, '.claude/skills/foo'), { recursive: true });
      symlinkSync(target, join(dir, '.claude/skills/foo/SKILL.md'));

      const report = await installGuidance(dir, source());

      expect(report.refused).toContain('.claude/skills/foo/SKILL.md');
      expect(readFileSync(target, 'utf8')).toBe('{"host":true}');
      expect(lstatSync(join(dir, '.claude/skills/foo/SKILL.md')).isSymbolicLink()).toBe(true);
      expect(existsSync(join(dir, '.claude/skills/foo/SKILL.md.orig'))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it.skipIf(!SYMLINKS)('refuses a symlink at the .orig path, creating nothing at its target and leaving the edited destination as it was', async () => {
    const dir = tmpDir('cairn-guidance-link-orig-');
    const outside = tmpDir('cairn-guidance-link-orig-target-');
    try {
      await installGuidance(dir, source());
      const dest = join(dir, '.claude/skills/foo/SKILL.md');
      writeFileSync(dest, 'the site edit');
      const victim = join(outside, 'victim.json');
      symlinkSync(victim, `${dest}.orig`);

      const report = await installGuidance(dir, source());

      expect(report.refused).toContain('.claude/skills/foo/SKILL.md.orig');
      // The destination itself is also refused, not just its .orig sibling: without a recovery
      // copy the destination must not be overwritten, and an operator reading the report needs
      // to see which destination was left stale.
      expect(report.refused).toContain('.claude/skills/foo/SKILL.md');
      expect(existsSync(victim)).toBe(false);
      expect(readFileSync(dest, 'utf8')).toBe('the site edit');
      expect(lstatSync(`${dest}.orig`).isSymbolicLink()).toBe(true);
      expect(report.origWritten).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });
});

describe('GUIDANCE_ROOT and CAIRN_DIR', () => {
  it('nest CAIRN_DIR under GUIDANCE_ROOT', () => {
    expect(CAIRN_DIR.startsWith(`${GUIDANCE_ROOT}/`)).toBe(true);
  });
});
