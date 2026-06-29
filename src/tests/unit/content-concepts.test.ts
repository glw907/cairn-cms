import { describe, it, expect } from 'vitest';
import { normalizeConcepts, findConcept } from '../../lib/content/concepts.js';
import { composeRuntime } from '../../lib/content/compose.js';
import { siteDescriptors } from '../../lib/delivery/site-descriptors.js';
import type { ConceptConfig, RoutingRule } from '../../lib/content/types.js';
import { fields } from '../../lib/content/fields.js';
import { fieldset } from '../../lib/content/fieldset.js';
import { testAdapter, testSiteConfig } from './_content-fixture.js';

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

  it('resolves a declared routing shorthand: a feed concept is a dated feed entry, a page is plain', () => {
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

  it('produces byte-identical routing through composeRuntime and siteDescriptors for one shorthand', () => {
    const runtime = composeRuntime({ adapter: testAdapter, siteConfig: testSiteConfig });
    const delivery = siteDescriptors(testAdapter, testSiteConfig);
    const fromRuntime = runtime.concepts.find((c) => c.id === 'posts')?.routing;
    const fromDelivery = delivery.find((c) => c.id === 'posts')?.routing;
    expect(fromRuntime).toEqual({ routable: true, dated: true, inFeeds: true });
    expect(fromDelivery).toEqual(fromRuntime);
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
    expect(posts.schema).toBe(testAdapter.content.posts?.fields);
  });

  // Seam 1 contract: a third concept attaches by adding one key under `content` and declaring its own
  // routing, with no reshape of the normalizer.
  it('attaches a Fragments concept additively without reshaping the contract', () => {
    const fragments: ConceptConfig = {
      dir: 'src/content/fragments',
      routing: { routable: false, dated: false, inFeeds: false },
      fields: fieldset({ title: fields.text({ label: 'Title' }) }),
    };
    const descriptors = normalizeConcepts({ ...testAdapter.content, fragments });

    expect(descriptors.map((c) => c.id)).toEqual(['posts', 'pages', 'fragments']);
    expect(descriptors.find((c) => c.id === 'fragments')?.routing.routable).toBe(false);
    // The existing concepts are untouched.
    expect(descriptors.find((c) => c.id === 'posts')?.routing.dated).toBe(true);
  });
});

const cfg = { dir: 'd', fields: fieldset({}) };

describe('normalizeConcepts URL policy', () => {
  it('defaults permalink and datePrefix when the concept declares no policy', () => {
    const [posts] = normalizeConcepts({ posts: cfg });
    expect(posts.permalink).toBe('/posts/:slug');
    expect(posts.datePrefix).toBe('day');
  });
  it('defaults pages to a root permalink', () => {
    const [pages] = normalizeConcepts({ pages: cfg });
    expect(pages.permalink).toBe('/:slug');
  });
  it('takes permalink and datePrefix from the concept declaration', () => {
    const [posts] = normalizeConcepts({
      posts: { ...cfg, routing: 'feed', permalink: '/:year/:month/:slug', datePrefix: 'month' },
    });
    expect(posts.permalink).toBe('/:year/:month/:slug');
    expect(posts.datePrefix).toBe('month');
  });

  // normalizeConcepts keeps its own validateUrlPolicy call (defense-in-depth beside defineConcept), so a
  // bad concept-declared permalink still fails here with an id-keyed message.
  it('validates the concept-declared permalink with an id-keyed message', () => {
    const rule: RoutingRule = { routable: true, dated: false, inFeeds: false };
    expect(() => normalizeConcepts({ pages: { ...cfg, routing: rule, permalink: '/:year/:slug' } })).toThrow(
      'cairn: concept "pages" is not dated, so permalink "/:year/:slug" cannot use the date token ":year"',
    );
  });

  it('carries summaryFields onto the descriptor and defaults it to empty', () => {
    const [withFields] = normalizeConcepts({
      posts: {
        dir: 'p',
        fields: fieldset({
          title: fields.text({ label: 'Title' }),
          description: fields.textarea({ label: 'Description' }),
          heroImage: fields.text({ label: 'Hero image' }),
        }),
        summaryFields: ['description', 'heroImage'],
      },
    });
    expect(withFields.summaryFields).toEqual(['description', 'heroImage']);

    const [withoutFields] = normalizeConcepts({
      pages: { dir: 'g', fields: fieldset({ title: fields.text({ label: 'Title' }) }) },
    });
    expect(withoutFields.summaryFields).toEqual([]);
  });

  it('throws when a summaryFields key is not a declared field', () => {
    expect(() =>
      normalizeConcepts({
        posts: {
          dir: 'p',
          fields: fieldset({ title: fields.text({ label: 'Title' }) }),
          summaryFields: ['description'],
        },
      }),
    ).toThrow('cairn: concept "posts" summaryFields key "description" is not a declared field');
  });

  it('accepts a summaryFields key that names a declared field, guarding the Set-of-keys derivation', () => {
    const [descriptor] = normalizeConcepts({
      posts: {
        dir: 'p',
        fields: fieldset({
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
          fields: fieldset({
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
          fields: fieldset({
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
          fields: fieldset({
            title: fields.text({ label: 'Title' }),
            author: fields.reference({ concept: 'pages', label: 'Author' }),
          }),
        },
        pages: { dir: 'g', fields: fieldset({ title: fields.text({ label: 'Title' }) }) },
      }),
    ).not.toThrow();
  });
});

describe('normalizeConcepts taxonomyBase', () => {
  const taxonomyCfg = {
    dir: 'p',
    fields: fieldset({
      title: fields.text({ label: 'Title' }),
      topics: fields.multiselect({ label: 'Topics', taxonomy: true }),
    }),
  };

  it('defaults the base to /<taxonomyFieldName> when a taxonomy field exists', () => {
    const [posts] = normalizeConcepts({ posts: taxonomyCfg });
    expect(posts.taxonomyBase).toBe('/topics');
  });

  it('honors an explicit taxonomyBase over the default', () => {
    const [posts] = normalizeConcepts({ posts: { ...taxonomyCfg, taxonomyBase: '/tags' } });
    expect(posts.taxonomyBase).toBe('/tags');
  });

  it('leaves taxonomyBase undefined when the concept has no taxonomy field', () => {
    const [pages] = normalizeConcepts({
      pages: { dir: 'g', fields: fieldset({ title: fields.text({ label: 'Title' }) }) },
    });
    expect(pages.taxonomyBase).toBeUndefined();
  });

  it('throws when taxonomyBase is not root-relative', () => {
    expect(() => normalizeConcepts({ posts: { ...taxonomyCfg, taxonomyBase: 'tags' } })).toThrow(
      'cairn: concept "posts" taxonomyBase "tags" must start with "/"',
    );
  });

  it('throws when taxonomyBase is not URL-safe', () => {
    expect(() => normalizeConcepts({ posts: { ...taxonomyCfg, taxonomyBase: '/my topics' } })).toThrow(
      'cairn: concept "posts" taxonomyBase "/my topics" must be a root-relative, URL-safe path',
    );
  });
});

describe('findConcept', () => {
  it('finds a normalized concept by id, undefined when absent', () => {
    const descriptors = normalizeConcepts(testAdapter.content);
    expect(findConcept(descriptors, 'pages')?.dir).toBe('src/content/pages');
    expect(findConcept(descriptors, 'events')).toBeUndefined();
  });
});
