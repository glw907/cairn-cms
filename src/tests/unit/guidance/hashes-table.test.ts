import { describe, it, expect } from 'vitest';
import { readShippedHashes } from '../../../lib/guidance/install.js';

describe('guidance-hashes.json', () => {
  it('carries the four retired skill directories and the shipped agent from the first shipping release', async () => {
    const files = await readShippedHashes();
    for (const dir of ['cairn-extend', 'cairn-public', 'cairn-admin-screens', 'cairn-consult']) {
      expect(Object.keys(files)).toContain(`.claude/skills/${dir}/SKILL.md`);
    }
    expect(files['.claude/agents/cairn-extension-reviewer.md']?.length).toBeGreaterThan(0);
  });
});
