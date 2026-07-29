import { describe, it, expect, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  SKILL_INSTALL_DIR,
  hashFileTree,
  skillFreshnessResult,
  readInstalledSkillFiles,
  readPackagedSkillFiles,
  resolveSkillSourceRoot,
  installSkill,
  skillFreshness,
} from '../../lib/doctor/check-skill.js';
import type { DoctorContext } from '../../lib/doctor/types.js';

function ctx(files: Record<string, string>): DoctorContext {
  return {
    cwd: '/site',
    fetch: globalThis.fetch,
    readFile: async (relPath) => files[relPath] ?? null,
  };
}

describe('hashFileTree', () => {
  it('is order-independent', () => {
    const a = hashFileTree({ 'a.md': '1', 'b.md': '2' });
    const b = hashFileTree({ 'b.md': '2', 'a.md': '1' });
    expect(a).toBe(b);
  });

  it('differs when any file content differs', () => {
    const a = hashFileTree({ 'a.md': '1' });
    const b = hashFileTree({ 'a.md': '2' });
    expect(a).not.toBe(b);
  });

  it('differs when the file set differs', () => {
    const a = hashFileTree({ 'a.md': '1' });
    const b = hashFileTree({ 'a.md': '1', 'b.md': '2' });
    expect(a).not.toBe(b);
  });

  it('hashes an empty tree consistently', () => {
    expect(hashFileTree({})).toBe(hashFileTree({}));
  });
});

describe('skillFreshnessResult', () => {
  const packaged = { 'SKILL.md': 'core', 'references/README.md': 'index' };

  it('skips with install guidance when nothing is installed', () => {
    const result = skillFreshnessResult(null, packaged);
    expect(result.status).toBe('skip');
    expect(result.detail).toContain(SKILL_INSTALL_DIR);
    expect(result.detail).toMatch(/--fix/);
  });

  it('skips with refresh guidance when the installed tree hashes differently', () => {
    const result = skillFreshnessResult({ 'SKILL.md': 'stale core' }, packaged);
    expect(result.status).toBe('skip');
    expect(result.detail).toMatch(/stale/);
    expect(result.detail).toMatch(/--fix/);
  });

  it('passes when the installed tree matches the packaged tree byte for byte', () => {
    const result = skillFreshnessResult({ ...packaged }, packaged);
    expect(result.status).toBe('pass');
    expect(result.detail).toContain(SKILL_INSTALL_DIR);
  });
});

describe('readInstalledSkillFiles', () => {
  it('returns null when none of the packaged paths exist in the consumer repo', async () => {
    const result = await readInstalledSkillFiles(ctx({}), ['SKILL.md']);
    expect(result).toBeNull();
  });

  it('reads whichever of the packaged paths exist, prefixed under the install dir', async () => {
    const result = await readInstalledSkillFiles(
      ctx({ [`${SKILL_INSTALL_DIR}/SKILL.md`]: 'core text' }),
      ['SKILL.md', 'references/README.md']
    );
    expect(result).toEqual({ 'SKILL.md': 'core text' });
  });
});

describe('readPackagedSkillFiles (real filesystem, this repo\'s own skill)', () => {
  it('reads the real SKILL.md and references/README.md this repo ships', async () => {
    const files = await readPackagedSkillFiles();
    expect(Object.keys(files)).toContain('SKILL.md');
    expect(Object.keys(files)).toContain('references/README.md');
    expect(files['SKILL.md']).toContain('cairn-admin-screens');
  });
});

describe('resolveSkillSourceRoot', () => {
  it('resolves to a directory literally named skills/cairn-admin-screens', () => {
    expect(resolveSkillSourceRoot().replace(/\\/g, '/')).toMatch(
      /skills\/cairn-admin-screens$/
    );
  });
});

describe('installSkill', () => {
  it('copies the packaged tree into a destination directory, byte for byte', async () => {
    const dest = mkdtempSync(join(tmpdir(), 'cairn-skill-install-'));
    try {
      const packaged = await readPackagedSkillFiles();
      const count = await installSkill(dest);
      expect(count).toBe(Object.keys(packaged).length);
      const installedSkill = await readFile(join(dest, 'SKILL.md'), 'utf8');
      expect(installedSkill).toBe(packaged['SKILL.md']);
      const installedReadme = await readFile(join(dest, 'references/README.md'), 'utf8');
      expect(installedReadme).toBe(packaged['references/README.md']);
    } finally {
      rmSync(dest, { recursive: true, force: true });
    }
  });
});

describe('skillFreshness', () => {
  it('ties to the skill.admin-screens-stale condition', () => {
    expect(skillFreshness.conditionId).toBe('skill.admin-screens-stale');
  });

  it('skips a consumer with nothing installed', async () => {
    const result = await skillFreshness.run(ctx({}));
    expect(result.status).toBe('skip');
  });

  it('passes a consumer whose installed copy was just written by installSkill', async () => {
    const dest = mkdtempSync(join(tmpdir(), 'cairn-skill-fresh-'));
    try {
      await installSkill(dest);
      const packaged = await readPackagedSkillFiles();
      const files: Record<string, string> = {};
      for (const relPath of Object.keys(packaged)) {
        files[`${SKILL_INSTALL_DIR}/${relPath}`] = await readFile(join(dest, relPath), 'utf8');
      }
      const result = await skillFreshness.run(ctx(files));
      expect(result.status).toBe('pass');
    } finally {
      rmSync(dest, { recursive: true, force: true });
    }
  });

  it('skips rather than throws when the packaged tree cannot be read', async () => {
    vi.resetModules();
    vi.doMock('node:fs/promises', async () => {
      const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
      return {
        ...actual,
        readdir: async () => {
          throw new Error('EACCES: permission denied, scandir');
        },
      };
    });
    try {
      const { skillFreshness: guardedSkillFreshness } = await import('../../lib/doctor/check-skill.js');
      const result = await guardedSkillFreshness.run(ctx({}));
      expect(result.status).toBe('skip');
      expect(result.detail).toContain('could not read the packaged admin-screens skill');
    } finally {
      vi.doUnmock('node:fs/promises');
      vi.resetModules();
    }
  });
});
