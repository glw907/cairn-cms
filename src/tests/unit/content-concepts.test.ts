import { describe, it, expect } from 'vitest';
import { CONCEPT_ROUTING, normalizeConcepts, findConcept } from '../../lib/content/concepts.js';
import type { ConceptConfig, RoutingRule } from '../../lib/content/types.js';
import { defineFields } from '../../lib/content/schema.js';
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

  // Seam 1 contract: a third concept attaches by adding one key under `content` and one
  // routing entry, with no reshape of the normalizer.
  it('attaches a Fragments concept additively without reshaping the contract', () => {
    const fragments: ConceptConfig = {
      dir: 'src/content/fragments',
      schema: defineFields([{ type: 'text', name: 'title', label: 'Title' }]),
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

const cfg = { dir: 'd', schema: defineFields([]) };

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
        schema: defineFields([
          { type: 'text', name: 'title', label: 'Title' },
          { type: 'textarea', name: 'description', label: 'Description' },
          { type: 'text', name: 'heroImage', label: 'Hero image' },
        ]),
        summaryFields: ['description', 'heroImage'],
      },
    });
    expect(withFields.summaryFields).toEqual(['description', 'heroImage']);

    const [withoutFields] = normalizeConcepts({
      pages: { dir: 'g', schema: defineFields([{ type: 'text', name: 'title', label: 'Title' }]) },
    });
    expect(withoutFields.summaryFields).toEqual([]);
  });

  it('throws when a summaryFields key is not a declared field', () => {
    expect(() =>
      normalizeConcepts({
        posts: {
          dir: 'p',
          schema: defineFields([{ type: 'text', name: 'title', label: 'Title' }]),
          summaryFields: ['description'],
        },
      }),
    ).toThrow('cairn: concept "posts" summaryFields key "description" is not a declared field');
  });

  it('accepts a summaryFields key that names a declared field', () => {
    const [descriptor] = normalizeConcepts({
      posts: {
        dir: 'p',
        schema: defineFields([
          { type: 'text', name: 'title', label: 'Title' },
          { type: 'textarea', name: 'description', label: 'Description' },
        ]),
        summaryFields: ['description'],
      },
    });
    expect(descriptor.summaryFields).toEqual(['description']);
  });
});

describe('findConcept', () => {
  it('finds a normalized concept by id, undefined when absent', () => {
    const descriptors = normalizeConcepts(testAdapter.content);
    expect(findConcept(descriptors, 'pages')?.dir).toBe('src/content/pages');
    expect(findConcept(descriptors, 'events')).toBeUndefined();
  });
});
