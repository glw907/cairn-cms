import { describe, it, expect } from 'vitest';
import { CONCEPT_ROUTING, normalizeConcepts, findConcept } from '../../lib/content/concepts.js';
import type { ConceptConfig, RoutingRule } from '../../lib/content/types.js';
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
      fields: [{ type: 'text', name: 'title', label: 'Title' }],
      validate: (frontmatter) => ({ ok: true, data: frontmatter }),
    };
    const routing: Record<string, RoutingRule> = {
      ...CONCEPT_ROUTING,
      fragments: { routable: false, dated: false, inFeeds: false },
    };
    const descriptors = normalizeConcepts({ ...testAdapter.content, fragments }, routing);

    expect(descriptors.map((c) => c.id)).toEqual(['posts', 'pages', 'fragments']);
    expect(descriptors.find((c) => c.id === 'fragments')?.routing.routable).toBe(false);
    // The existing concepts are untouched.
    expect(descriptors.find((c) => c.id === 'posts')?.routing.dated).toBe(true);
  });
});

describe('permalink defaults', () => {
  it('defaults pages to the root slug and other concepts to a prefixed slug', () => {
    const concepts = normalizeConcepts({
      posts: { dir: 'd', fields: [], validate: () => ({ ok: true, data: {} }) },
      pages: { dir: 'd', fields: [], validate: () => ({ ok: true, data: {} }) },
    });
    expect(concepts.find((c) => c.id === 'posts')!.permalink).toBe('/posts/:slug');
    expect(concepts.find((c) => c.id === 'pages')!.permalink).toBe('/:slug');
  });

  it('uses an explicit permalink when the config provides one', () => {
    const [concept] = normalizeConcepts({
      posts: { dir: 'd', fields: [], validate: () => ({ ok: true, data: {} }), permalink: '/:year/:month/:slug' },
    });
    expect(concept.permalink).toBe('/:year/:month/:slug');
  });
});

describe('findConcept', () => {
  it('finds a normalized concept by id, undefined when absent', () => {
    const descriptors = normalizeConcepts(testAdapter.content);
    expect(findConcept(descriptors, 'pages')?.dir).toBe('src/content/pages');
    expect(findConcept(descriptors, 'events')).toBeUndefined();
  });
});
