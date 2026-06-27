import { describe, it, expect } from 'vitest';
import { composeRuntime } from '../../lib/content/compose.js';
import type { CairnAdapter, CairnExtension, ConceptConfig } from '../../lib/content/types.js';
import { fields } from '../../lib/content/fields.js';
import { fieldset } from '../../lib/content/fieldset.js';
import { testAdapter, testSiteConfig } from './_content-fixture.js';
import { siteDescriptors } from '../../lib/delivery/site-descriptors.js';

describe('composeRuntime', () => {
  it('folds the adapter into a runtime carrying the normalized concepts and backend', () => {
    const runtime = composeRuntime({ adapter: testAdapter, siteConfig: testSiteConfig });
    expect(runtime.concepts.map((c) => c.id)).toEqual(['posts', 'pages']);
    expect(runtime.backend).toEqual(testAdapter.backend);
    expect(runtime.render('x')).toBe('x');
  });

  it('sources siteName from the site config, not the adapter', () => {
    const runtime = composeRuntime({
      adapter: testAdapter,
      siteConfig: { ...testSiteConfig, siteName: 'Sourced From Config' },
    });
    expect(runtime.siteName).toBe('Sourced From Config');
  });

  // Seam 2 contract: an extension folds in additively, the same way the adapter does.
  it('folds an extension concept in after the adapter concepts', () => {
    const fragments: ConceptConfig = {
      dir: 'src/content/fragments',
      fields: fieldset({ title: fields.text({ label: 'Title' }) }),
    };
    const extension: CairnExtension = { content: { fragments } };
    const runtime = composeRuntime({ adapter: testAdapter, siteConfig: testSiteConfig, extensions: [extension] });
    expect(runtime.concepts.map((c) => c.id)).toEqual(['posts', 'pages', 'fragments']);
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
});

describe('composeRuntime URL policy', () => {
  it('derives the per-concept URL policy from the concept declaration', () => {
    const adapter: CairnAdapter = {
      ...testAdapter,
      content: {
        ...testAdapter.content,
        posts: { dir: 'src/content/posts', routing: 'feed', permalink: '/:year/:slug', datePrefix: 'year', fields: fieldset({}) },
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
