import { describe, it, expect } from 'vitest';
import { markdownReference } from '../../lib/components/markdown-reference.js';

describe('markdownReference', () => {
  it('carries every cheat-sheet row with a syntax, a gloss, and a group', () => {
    expect(markdownReference.length).toBeGreaterThanOrEqual(14);
    for (const row of markdownReference) {
      expect(row.syntax.length).toBeGreaterThan(0);
      expect(row.makes.length).toBeGreaterThan(0);
      expect(['text', 'links', 'blocks']).toContain(row.group);
    }
  });
  it('documents the cairn wikilink as a links-group row', () => {
    const wiki = markdownReference.find((r) => r.syntax.includes('[[page-name]]'));
    expect(wiki).toBeDefined();
    expect(wiki?.group).toBe('links');
    expect(wiki?.makes.toLowerCase()).toContain('link');
  });
  it('exposes the nine everyday rows the Help home shows (text + links groups)', () => {
    const everyday = markdownReference.filter((r) => r.group === 'text' || r.group === 'links');
    expect(everyday).toHaveLength(9);
  });
});
