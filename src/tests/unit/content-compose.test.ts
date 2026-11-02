import { describe, it, expect } from 'vitest';
import { composeRuntime } from '../../lib/content/compose.js';
import type { CairnAdapter, ConceptDescriptor } from '../../lib/content/types.js';
import { fields } from '../../lib/content/fields.js';
import { testAdapter, testSiteConfig } from './_content-fixture.js';
import { buildSiteDescriptors } from '../../lib/delivery/site-descriptors.js';

describe('composeRuntime', () => {
  it('folds the adapter into a runtime carrying the normalized concepts and backend', async () => {
    const runtime = composeRuntime({ adapter: testAdapter, siteConfig: testSiteConfig });
    expect(runtime.concepts.map((c) => c.id)).toEqual(['posts', 'pages']);
    expect(runtime.backend).toEqual(testAdapter.backend);
    expect(runtime.email).toEqual(testAdapter.email);
  });

  it('sources siteName from the site config, not the adapter', () => {
    const runtime = composeRuntime({
      adapter: testAdapter,
      siteConfig: { ...testSiteConfig, siteName: 'Sourced From Config' },
    });
    expect(runtime.siteName).toBe('Sourced From Config');
  });

  // The runtime holds what it derives, not what the adapter already carries: the renderer, icons, and
  // raw media slot are read from the adapter, so the runtime type has no such members.
  it('does not copy the adapter renderer, icons, or raw media slot onto the runtime', () => {
    const runtime = composeRuntime({ adapter: testAdapter, siteConfig: testSiteConfig });
    // @ts-expect-error render lives on the adapter's rendering slot
    void runtime.render;
    // @ts-expect-error icons live on the adapter's rendering slot
    void runtime.icons;
    // @ts-expect-error the raw media slot lives on the adapter; the runtime carries `media`
    void runtime.assets;
    // @ts-expect-error the sender config is `email`
    void runtime.sender;
    expect('render' in runtime || 'icons' in runtime || 'assets' in runtime || 'sender' in runtime).toBe(false);
  });

  it('resolves the media slot into the runtime media config', () => {
    expect(composeRuntime({ adapter: testAdapter, siteConfig: testSiteConfig }).media).toEqual({ enabled: false });
    const withMedia: CairnAdapter = { ...testAdapter, media: { bucketBinding: 'MEDIA_BUCKET' } };
    expect(composeRuntime({ adapter: withMedia, siteConfig: testSiteConfig }).media).toMatchObject({ enabled: true, bucketBinding: 'MEDIA_BUCKET' });
  });

  // The tag vocabulary is the enforcement seam's source: composeRuntime validates the site config's
  // `vocabulary` key once and threads it onto the runtime, defaulting to an empty list when absent.
  it('threads the validated vocabulary from the site config onto the runtime', () => {
    const vocabulary = [{ value: 'a', label: 'A' }];
    const runtime = composeRuntime({ adapter: testAdapter, siteConfig: { ...testSiteConfig, vocabulary } });
    expect(runtime.vocabulary).toEqual(vocabulary);
  });

  it('defaults the runtime vocabulary to an empty list when the config omits the key', () => {
    expect(composeRuntime({ adapter: testAdapter, siteConfig: testSiteConfig }).vocabulary).toEqual([]);
  });

  it('fails the build when the site config vocabulary is malformed', () => {
    expect(() =>
      // @ts-expect-error a malformed vocabulary is the failure this guards against
      composeRuntime({ adapter: testAdapter, siteConfig: { ...testSiteConfig, vocabulary: 'not-an-array' } }),
    ).toThrow();
  });
});

describe('composeRuntime URL policy', () => {
  it('derives the per-concept URL policy from the concept declaration', () => {
    const adapter: CairnAdapter = {
      ...testAdapter,
      content: {
        ...testAdapter.content,
        posts: {
          dir: 'src/content/posts',
          routing: 'dated',
          permalink: '/:year/:slug',
          datePrefix: 'year',
          fields: { date: fields.date({ label: 'Date' }) },
        },
      },
    };
    const runtime = composeRuntime({ adapter, siteConfig: testSiteConfig });
    const posts = runtime.concepts.find((c) => c.id === 'posts')!;
    expect(posts.permalink).toBe('/:year/:slug');
    expect(posts.datePrefix).toBe('year');
  });

  it('applies the descriptor default when the concept declares no policy', () => {
    const posts = composeRuntime({ adapter: testAdapter, siteConfig: testSiteConfig }).concepts.find((c) => c.id === 'posts')!;
    expect(posts.permalink).toBe('/posts/:slug');
  });

  it('throws when no site config is supplied', () => {
    // @ts-expect-error a missing siteConfig is the failure this guards against
    expect(() => composeRuntime({ adapter: testAdapter })).toThrow(/site config/i);
  });

  it('derives the same concepts as the delivery path', () => {
    const runtime = composeRuntime({ adapter: testAdapter, siteConfig: testSiteConfig });
    const delivered = buildSiteDescriptors(testAdapter);
    // `validate` and the schema are fresh per normalize call (one binds the concept id as the
    // field-behavior owner label, and the other is built there), so the two paths agree in behavior
    // under different function identities: compare the data structurally, then the validator by
    // what it answers.
    const structural = (cs: ConceptDescriptor[]) => cs.map((c) => ({ ...c, validate: null, schema: c.schema.fields }));
    expect(structural(runtime.concepts)).toEqual(structural(delivered));
    expect(runtime.concepts.map((c) => c.validate({}, ''))).toEqual(delivered.map((c) => c.validate({}, '')));
  });
});
