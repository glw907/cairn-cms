import { describe, it, expect } from 'vitest';
import { CONCEPT_ROUTING, normalizeConcepts, findConcept } from '../../lib/content/concepts.js';
import type { ConceptConfig, RoutingRule } from '../../lib/content/types.js';
import { fields } from '../../lib/content/fields.js';
import { fieldset } from '../../lib/content/fieldset.js';
import { testAdapter } from './_content-fixture.js';

describe('normalizeConcepts', () => {
  it('normalizes the declared concepts in declaration order', () => {
    const descriptors = normalizeConcepts(testAdapter.content);
    expect(descriptors.map((c) => c.id)).toEqual(['posts', 'pages']);
  });

  it('defaults the label from the id, and honors an explicit label', () => {
    const descriptors = normalizeConcepts(testAdapter.content);
    expect(descriptors.find((c) => c.id === 'posts')?.label).toBe('Posts');
    expect(descriptors.find((c) => c.id === 'pages')?.label).toBe('Site Pages');
  });

  it('attaches concept-fixed routing: posts are dated feed entries, pages are plain', () => {
    const descriptors = normalizeConcepts(testAdapter.content);
    expect(descriptors.find((c) => c.id === 'posts')?.routing).toEqual({
      routable: true,
      dated: true,
      inFeeds: true,
    });
    expect(descriptors.find((c) => c.id === 'pages')?.routing).toEqual({
      routable: true,
      dated: false,
      inFeeds: false,
    });
  });

  it('skips an undeclared concept', () => {
    const descriptors = normalizeConcepts({ posts: testAdapter.content.posts, pages: undefined });
    expect(descriptors.map((c) => c.id)).toEqual(['posts']);
  });

  it('derives the fields array as named descriptors from the fieldset record', () => {
    const [posts] = normalizeConcepts(testAdapter.content);
    expect(posts.fields.map((f) => f.name)).toEqual(['title', 'date', 'description', 'tags', 'draft']);
    const title = posts.fields[0];
    expect(title).toMatchObject({ name: 'title', type: 'text', label: 'Title', required: true });
  });

  it('carries the source fieldset through onto the descriptor', () => {
    const [posts] = normalizeConcepts(testAdapter.content);
    expect(posts.schema).toBe(testAdapter.content.posts?.schema);
  });

  // Seam 1 contract: a third concept attaches by adding one key under `content` and one
  // routing entry, with no reshape of the normalizer.
  it('attaches a Fragments concept additively without reshaping the contract', () => {
    const fragments: ConceptConfig = {
      dir: 'src/content/fragments',
      schema: fieldset({ title: fields.text({ label: 'Title' }) }),
    };
    const routing: Record<string, RoutingRule> = {
      ...CONCEPT_ROUTING,
      fragments: { routable: false, dated: false, inFeeds: false },
    };
    const descriptors = normalizeConcepts({ ...testAdapter.content, fragments }, {}, routing);

    expect(descriptors.map((c) => c.id)).toEqual(['posts', 'pages', 'fragments']);
    expect(descriptors.find((c) => c.id === 'fragments')?.routing.routable).toBe(false);
    // The existing concepts are untouched.
    expect(descriptors.find((c) => c.id === 'posts')?.routing.dated).toBe(true);
  });
});

const cfg = { dir: 'd', schema: fieldset({}) };

describe('normalizeConcepts URL policy', () => {
  it('defaults permalink and datePrefix when no policy is given', () => {
    const [posts] = normalizeConcepts({ posts: cfg });
    expect(posts.permalink).toBe('/posts/:slug');
    expect(posts.datePrefix).toBe('day');
  });
  it('defaults pages to a root permalink', () => {
    const [pages] = normalizeConcepts({ pages: cfg });
    expect(pages.permalink).toBe('/:slug');
  });
  it('takes permalink and datePrefix from the URL policy', () => {
    const [posts] = normalizeConcepts(
      { posts: cfg },
      { posts: { permalink: '/:year/:month/:slug', datePrefix: 'month' } },
    );
    expect(posts.permalink).toBe('/:year/:month/:slug');
    expect(posts.datePrefix).toBe('month');
  });

  it('carries summaryFields onto the descriptor and defaults it to empty', () => {
    const [withFields] = normalizeConcepts({
      posts: {
        dir: 'p',
        schema: fieldset({
          title: fields.text({ label: 'Title' }),
          description: fields.textarea({ label: 'Description' }),
          heroImage: fields.text({ label: 'Hero image' }),
        }),
        summaryFields: ['description', 'heroImage'],
      },
    });
    expect(withFields.summaryFields).toEqual(['description', 'heroImage']);

    const [withoutFields] = normalizeConcepts({
      pages: { dir: 'g', schema: fieldset({ title: fields.text({ label: 'Title' }) }) },
    });
    expect(withoutFields.summaryFields).toEqual([]);
  });

  it('throws when a summaryFields key is not a declared field', () => {
    expect(() =>
      normalizeConcepts({
        posts: {
          dir: 'p',
          schema: fieldset({ title: fields.text({ label: 'Title' }) }),
          summaryFields: ['description'],
        },
      }),
    ).toThrow('cairn: concept "posts" summaryFields key "description" is not a declared field');
  });

  it('accepts a summaryFields key that names a declared field, guarding the Set-of-keys derivation', () => {
    const [descriptor] = normalizeConcepts({
      posts: {
        dir: 'p',
        schema: fieldset({
          title: fields.text({ label: 'Title' }),
          description: fields.textarea({ label: 'Description' }),
        }),
        summaryFields: ['description'],
      },
    });
    expect(descriptor.summaryFields).toEqual(['description']);
  });

  it('throws when a reference field names a concept not declared under content', () => {
    expect(() =>
      normalizeConcepts({
        posts: {
          dir: 'p',
          schema: fieldset({
            title: fields.text({ label: 'Title' }),
            author: fields.reference({ concept: 'nope', label: 'Author' }),
          }),
        },
      }),
    ).toThrow('cairn: concept "posts" reference field "author" names concept "nope", which is not declared under content');
  });

  it('throws when an array(reference) field names a concept not declared under content', () => {
    expect(() =>
      normalizeConcepts({
        posts: {
          dir: 'p',
          schema: fieldset({
            title: fields.text({ label: 'Title' }),
            related: fields.array(fields.reference({ concept: 'nope', label: 'Post' }), { label: 'Related' }),
          }),
        },
      }),
    ).toThrow('cairn: concept "posts" reference field "related" names concept "nope", which is not declared under content');
  });

  it('accepts a reference field whose concept is a declared key', () => {
    expect(() =>
      normalizeConcepts({
        posts: {
          dir: 'p',
          schema: fieldset({
            title: fields.text({ label: 'Title' }),
            author: fields.reference({ concept: 'pages', label: 'Author' }),
          }),
        },
        pages: { dir: 'g', schema: fieldset({ title: fields.text({ label: 'Title' }) }) },
      }),
    ).not.toThrow();
  });

  it('throws when the URL policy names a concept that is not declared', () => {
    expect(() => normalizeConcepts({ posts: cfg }, { events: { permalink: '/:slug' } })).toThrow(
      'cairn: URL policy names concept "events", which is not declared under content',
    );
  });

  it('throws when the URL policy names a declared-but-undefined concept', () => {
    expect(() => normalizeConcepts({ posts: undefined }, { posts: { permalink: '/:slug' } })).toThrow(
      'cairn: URL policy names concept "posts", which is not declared under content',
    );
  });

  it('throws on a permalink without a leading slash', () => {
    expect(() => normalizeConcepts({ posts: cfg }, { posts: { permalink: 'posts/:slug' } })).toThrow(
      'must start with "/"',
    );
  });

  it('throws on an unknown permalink token', () => {
    expect(() => normalizeConcepts({ posts: cfg }, { posts: { permalink: '/:category/:slug' } })).toThrow(
      'unknown token ":category"',
    );
  });

  it('throws on a date token in a non-dated concept', () => {
    expect(() => normalizeConcepts({ pages: cfg }, { pages: { permalink: '/:year/:slug' } })).toThrow(
      'cannot use the date token ":year"',
    );
  });

  it('throws on an out-of-range datePrefix', () => {
    expect(() =>
      // @ts-expect-error the YAML is untyped at runtime, so an invalid datePrefix must be caught
      normalizeConcepts({ posts: cfg }, { posts: { datePrefix: 'weekly' } }),
    ).toThrow('datePrefix "weekly" must be one of year, month, day');
  });

  it('accepts the reference sites\' valid policies', () => {
    expect(() =>
      normalizeConcepts({ posts: cfg }, { posts: { permalink: '/:year/:month/:day/:slug', datePrefix: 'day' } }),
    ).not.toThrow();
    expect(() =>
      normalizeConcepts({ posts: cfg }, { posts: { permalink: '/:year/:month/:slug', datePrefix: 'month' } }),
    ).not.toThrow();
  });
});

describe('findConcept', () => {
  it('finds a normalized concept by id, undefined when absent', () => {
    const descriptors = normalizeConcepts(testAdapter.content);
    expect(findConcept(descriptors, 'pages')?.dir).toBe('src/content/pages');
    expect(findConcept(descriptors, 'events')).toBeUndefined();
  });
});
