import { describe, it, expect } from 'vitest';
import { defineConcept } from '../../lib/content/concepts.js';
import { fieldset, fields } from '../../lib/index.js';

describe('defineConcept', () => {
  const base = { dir: 'src/content/posts', fields: fieldset({ title: fields.text({ label: 'Title' }) }) };

  it('returns the concept unchanged and preserves the fieldset type', () => {
    const c = defineConcept({ ...base, routing: 'feed', permalink: '/blog/:year/:slug', datePrefix: 'day' });
    expect(c.permalink).toBe('/blog/:year/:slug');
  });
  it('throws at declaration on a permalink missing the leading slash', () => {
    expect(() => defineConcept({ ...base, permalink: 'blog/:slug' })).toThrow(/must start with/);
  });
  it('throws when a non-dated concept uses a date token', () => {
    expect(() => defineConcept({ ...base, routing: 'page', permalink: '/:year/:slug' })).toThrow(/date token/);
  });
  it('throws on an out-of-range datePrefix', () => {
    expect(() => defineConcept({ ...base, datePrefix: 'week' as never })).toThrow(/year, month, day/);
  });
  it('throws on an unknown permalink token', () => {
    expect(() => defineConcept({ ...base, permalink: '/:category/:slug' })).toThrow('unknown token ":category"');
  });
  it("accepts the reference sites' valid dated policies", () => {
    expect(() =>
      defineConcept({ ...base, routing: 'feed', permalink: '/:year/:month/:day/:slug', datePrefix: 'day' }),
    ).not.toThrow();
    expect(() =>
      defineConcept({ ...base, routing: 'feed', permalink: '/:year/:month/:slug', datePrefix: 'month' }),
    ).not.toThrow();
  });
});
