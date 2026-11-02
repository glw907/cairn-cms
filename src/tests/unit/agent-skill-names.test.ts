import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const CLAUDE = join(ROOT, '.claude');

/** The `cairn-*` skill names in backticks that agents and rules mention and that have a skill directory here. */
function namedSkills(): Set<string> {
  const found = new Set<string>();
  for (const dir of ['agents', 'rules']) {
    for (const file of readdirSync(join(CLAUDE, dir))) {
      const text = readFileSync(join(CLAUDE, dir, file), 'utf8');
      for (const m of text.matchAll(/`(cairn-[a-z0-9-]+)`/g)) {
        if (existsSync(join(CLAUDE, 'skills', m[1], 'SKILL.md'))) found.add(m[1]);
      }
    }
  }
  return found;
}

describe('skills a dispatch names', () => {
  const named = namedSkills();

  it('include the three that were once path-gated', () => {
    for (const name of [
      'cairn-following-admin-design',
      'cairn-following-public-design',
      'cairn-writing-engine-code',
    ]) {
      expect(named.has(name)).toBe(true);
    }
  });

  it('declare no paths: key, since a path-gated skill is unknown to a fresh session', () => {
    for (const name of named) {
      const text = readFileSync(join(CLAUDE, 'skills', name, 'SKILL.md'), 'utf8');
      const frontmatter = text.split(/^---$/m)[1] ?? '';
      expect(frontmatter, name).not.toMatch(/^paths:/m);
    }
  });
});
