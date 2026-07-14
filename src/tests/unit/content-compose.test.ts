import { describe, it, expect } from 'vitest';
import { composeRuntime } from '../../lib/content/compose.js';
import type { CairnAdapter } from '../../lib/content/types.js';
import { fieldset } from '../../lib/content/fieldset.js';
import { fields } from '../../lib/content/fields.js';
import { testAdapter, testSiteConfig } from './_content-fixture.js';
import { siteDescriptors } from '../../lib/delivery/site-descriptors.js';

describe('composeRuntime', () => {
  it('folds the adapter into a runtime carrying the normalized concepts and backend', async () => {
    const runtime = composeRuntime({ adapter: testAdapter, siteConfig: testSiteConfig });
    expect(runtime.concepts.map((c) => c.id)).toEqual(['posts', 'pages']);
    expect(runtime.backend).toEqual(testAdapter.backend);
    expect(await runtime.render({ body: 'x' })).toBe('x');
  });

  it('sources siteName from the site config, not the adapter', () => {
    const runtime = composeRuntime({
      adapter: testAdapter,
      siteConfig: { ...testSiteConfig, siteName: 'Sourced From Config' },
    });
    expect(runtime.siteName).toBe('Sourced From Config');
  });

  // Seam 4 contract: the media slot passes through untouched onto the runtime's `assets`.
  it('passes the media slot through, and omits it when absent', () => {
    expect(composeRuntime({ adapter: testAdapter, siteConfig: testSiteConfig }).assets).toBeUndefined();
    const withMedia: CairnAdapter = {
      ...testAdapter,
      media: { bucketBinding: 'MEDIA_BUCKET', publicBase: '/media' },
    };
    expect(composeRuntime({ adapter: withMedia, siteConfig: testSiteConfig }).assets).toEqual({ bucketBinding: 'MEDIA_BUCKET', publicBase: '/media' });
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
          routing: 'feed',
          permalink: '/:year/:slug',
          datePrefix: 'year',
          fields: fieldset({ date: fields.date({ label: 'Date' }) }),
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
    expect(runtime.concepts).toEqual(siteDescriptors(testAdapter, testSiteConfig));
  });
});
