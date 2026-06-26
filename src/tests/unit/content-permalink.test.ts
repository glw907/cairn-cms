import { describe, it, expect } from 'vitest';
import { permalink } from '../../lib/content/permalink.js';
import type { ConceptDescriptor } from '../../lib/content/types.js';
import { fieldset } from '../../lib/content/fieldset.js';

const base: Omit<ConceptDescriptor, 'permalink'> = {
  id: 'posts', label: 'Posts', singular: 'Posts', dir: 'd', datePrefix: 'day',
  routing: { routable: true, dated: true, inFeeds: true },
  fields: [], schema: fieldset({}), summaryFields: [], validate: () => ({ ok: true, data: {} }),
};
const desc = (permalink: string): ConceptDescriptor => ({ ...base, permalink });

describe('permalink', () => {
  it('resolves :slug to the derived slug, not the id', () => {
    const url = permalink(desc('/:year/:month/:day/:slug'), {
      id: '2026-05-31-snowball', slug: 'snowball', date: '2026-05-31',
    });
    expect(url).toBe('/2026/05/31/snowball');
  });
  it('resolves a flat pattern to the slug', () => {
    expect(permalink(desc('/:slug'), { id: 'about', slug: 'about' })).toBe('/about');
  });
  it('throws when a date token has no date', () => {
    expect(() => permalink(desc('/:year/:slug'), { id: 'x', slug: 'x' })).toThrow();
  });
  it('throws on an unknown token', () => {
    expect(() => permalink(desc('/:nope'), { id: 'x', slug: 'x' })).toThrow();
  });
});
