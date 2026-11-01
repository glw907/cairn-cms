import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { SKILL_TREES, checkSkillForm } from '../../../scripts/checks/check-skill-budget.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const roots: string[] = [];

/** A fixture repo with a short CLAUDE.md and one clean skill in the first skill tree. */
function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'skill-form-'));
  roots.push(root);
  write(root, 'CLAUDE.md', lines(10));
  write(root, `${SKILL_TREES[0]}/demo/SKILL.md`, '---\nname: demo\n---\n' + lines(20));
  return root;
}

function write(root: string, path: string, text: string) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
}

function lines(n: number): string {
  return Array.from({ length: n }, (_, i) => `line ${i + 1}`).join('\n') + '\n';
}

afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

describe('checkSkillForm', () => {
  it('passes a clean fixture', () => {
    expect(checkSkillForm(fixture())).toEqual([]);
  });

  it('fails a CLAUDE.md of 200 lines or more', () => {
    const root = fixture();
    write(root, 'CLAUDE.md', lines(200));
    expect(checkSkillForm(root)).toEqual([expect.stringContaining('CLAUDE.md has 200 lines')]);
  });

  it('fails a SKILL.md over 500 lines in each of the three trees', () => {
    for (const tree of SKILL_TREES) {
      const root = fixture();
      write(root, `${tree}/long/SKILL.md`, '---\nname: long\n---\n' + lines(501));
      expect(checkSkillForm(root)).toEqual([expect.stringContaining(`${tree}/long/SKILL.md`)]);
    }
  });

  it('fails a reference over 100 lines that does not open with contents', () => {
    const root = fixture();
    write(root, `${SKILL_TREES[0]}/demo/references/big.md`, '# Big\n\n' + lines(120));
    expect(checkSkillForm(root)).toEqual([expect.stringContaining('references/big.md')]);
  });

  it('passes a long reference that opens with a contents list', () => {
    const root = fixture();
    write(root, `${SKILL_TREES[0]}/demo/references/big.md`, '# Big\n\n## Contents\n\n- [A](#a)\n\n' + lines(120));
    expect(checkSkillForm(root)).toEqual([]);
  });

  it('leaves a captured third-party page verbatim, with no contents list required', () => {
    const root = fixture();
    write(root, `${SKILL_TREES[0]}/demo/references/captured.md`, '<!-- Source: https://example.com -->\n\n' + lines(120));
    expect(checkSkillForm(root)).toEqual([]);
  });

  it('fails a reference nested a second level below the skill', () => {
    const root = fixture();
    write(root, `${SKILL_TREES[0]}/demo/references/deep/more.md`, '# More\n');
    expect(checkSkillForm(root)).toEqual([expect.stringContaining('references/deep/more.md')]);
  });

  it('does not hold evals, assets, or scripts directories to the reference form', () => {
    const root = fixture();
    write(root, `${SKILL_TREES[0]}/demo/evals/cases/x.md`, lines(300));
    write(root, `${SKILL_TREES[0]}/demo/assets/a/b/c.md`, lines(300));
    expect(checkSkillForm(root)).toEqual([]);
  });
});

describe('the real tree', () => {
  it('meets the form rules', () => {
    expect(checkSkillForm(ROOT)).toEqual([]);
  });
});
