import { describe, it, expect } from 'vitest';
import { entryIdentity, asDate, asString, asTags } from '../../lib/content/identity.js';
import type { ConceptDescriptor } from '../../lib/content/types.js';
import { defineFields } from '../../lib/content/schema.js';

// A minimal descriptor for the identity unit. Only id, routing, permalink, and datePrefix matter here.
function descriptor(over: Partial<ConceptDescriptor> = {}): ConceptDescriptor {
  return {
    id: 'posts',
    label: 'Posts',
    singular: 'Posts',
    dir: 'src/content/posts',
    routing: { routable: true, dated: true, inFeeds: true },
    permalink: '/posts/:slug',
    datePrefix: 'day',
    fields: defineFields([{ type: 'text', name: 'title', label: 'Title' }]).fields,
    summaryFields: [],
    validate: () => ({ ok: true, data: {} }),
    ...over,
  };
}

describe('entryIdentity', () => {
  it('strips the leading date prefix from a dated concept slug', () => {
    const identity = entryIdentity(descriptor(), 'src/content/posts/2026-05-01-hello.md', {
      date: '2026-05-01',
    });
    expect(identity.id).toBe('2026-05-01-hello');
    expect(identity.slug).toBe('hello');
    expect(identity.permalink).toBe('/posts/hello');
    expect(identity.date).toBe('2026-05-01');
  });

  it('keeps the id as the slug for a non-dated concept', () => {
    const pages = descriptor({
      id: 'pages',
      routing: { routable: true, dated: false, inFeeds: false },
      permalink: '/:slug',
      datePrefix: 'day',
    });
    const identity = entryIdentity(pages, 'src/content/pages/about.md', {});
    expect(identity.id).toBe('about');
    expect(identity.slug).toBe('about');
    expect(identity.permalink).toBe('/about');
    expect(identity.date).toBeUndefined();
  });

  it('substitutes date tokens from the frontmatter date', () => {
    const identity = entryIdentity(
      descriptor({ permalink: '/:year/:month/:day/:slug' }),
      'src/content/posts/2026-05-01-hello.md',
      { date: '2026-05-01' },
    );
    expect(identity.permalink).toBe('/2026/05/01/hello');
  });

  it('coerces an unquoted YAML date (a JS Date) to YYYY-MM-DD', () => {
    const identity = entryIdentity(descriptor(), 'src/content/posts/2026-05-01-hello.md', {
      date: new Date('2026-05-01T00:00:00Z'),
    });
    expect(identity.date).toBe('2026-05-01');
  });

  it('strips by the configured datePrefix granularity', () => {
    const monthly = descriptor({ datePrefix: 'month', permalink: '/:year/:month/:slug' });
    const identity = entryIdentity(monthly, 'src/content/posts/2026-05-hello.md', { date: '2026-05-01' });
    expect(identity.slug).toBe('hello');
    expect(identity.permalink).toBe('/2026/05/hello');
  });
});

describe('coercion helpers', () => {
  it('asString returns a non-empty string, else undefined', () => {
    expect(asString('hi')).toBe('hi');
    expect(asString('   ')).toBeUndefined();
    expect(asString(42)).toBeUndefined();
  });

  it('asDate slices a string date and reads a JS Date', () => {
    expect(asDate('2026-05-01')).toBe('2026-05-01');
    expect(asDate('2026-05-01T12:00:00Z')).toBe('2026-05-01');
    expect(asDate(new Date('2026-05-01T00:00:00Z'))).toBe('2026-05-01');
    expect(asDate('nope')).toBeUndefined();
    expect(asDate(undefined)).toBeUndefined();
  });

  it('asTags returns an array, empty when absent', () => {
    expect(asTags(['a', 'b'])).toEqual(['a', 'b']);
    expect(asTags(undefined)).toEqual([]);
  });
});
