import { describe, it, expect } from 'vitest';
import { permalink } from '../../lib/content/permalink.js';
import type { ConceptDescriptor } from '../../lib/content/types.js';

function descriptor(pattern: string, dated = true): ConceptDescriptor {
  return {
    id: 'posts',
    label: 'Posts',
    dir: 'd',
    routing: { routable: true, dated, inFeeds: dated },
    permalink: pattern,
    fields: [],
    validate: () => ({ ok: true, data: {} }),
  };
}

describe('permalink', () => {
  it('substitutes the slug token from the id', () => {
    expect(permalink(descriptor('/blog/:slug'), { id: 'first' })).toBe('/blog/first');
  });

  it('substitutes zero-padded date tokens from the frontmatter date', () => {
    expect(permalink(descriptor('/:year/:month/:slug'), { id: 'first', date: '2026-05-09' })).toBe(
      '/2026/05/first',
    );
  });

  it('supports a day token', () => {
    expect(permalink(descriptor('/:year/:month/:day/:slug'), { id: 'x', date: '2026-01-02' })).toBe(
      '/2026/01/02/x',
    );
  });

  it('resolves a flat root pattern', () => {
    expect(permalink(descriptor('/:slug', false), { id: 'about' })).toBe('/about');
  });

  it('throws when a date token has no date', () => {
    expect(() => permalink(descriptor('/:year/:slug'), { id: 'x' })).toThrow(/date/);
  });

  it('throws on an unknown token', () => {
    expect(() => permalink(descriptor('/:nope/:slug'), { id: 'x' })).toThrow(/unknown token/);
  });
});
