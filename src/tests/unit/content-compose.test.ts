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
    expect(runtime.siteName).toBe('Test');
    expect(runtime.concepts.map((c) => c.id)).toEqual(['posts', 'pages']);
    expect(runtime.backend).toEqual(testAdapter.backend);
    expect(runtime.render('x')).toBe('x');
  });

  // Seam 2 contract: an extension folds in additively, the same way the adapter does.
  it('folds an extension concept in after the adapter concepts', () => {
    const fragments: ConceptConfig = {
      dir: 'src/content/fragments',
      schema: fieldset({ title: fields.text({ label: 'Title' }) }),
    };
    const extension: CairnExtension = { content: { fragments } };
    const runtime = composeRuntime({ adapter: testAdapter, siteConfig: testSiteConfig, extensions: [extension] });
    expect(runtime.concepts.map((c) => c.id)).toEqual(['posts', 'pages', 'fragments']);
  });

  // Seam 4 contract: the asset slot passes through untouched.
  it('passes the asset slot through, and omits it when absent', () => {
    expect(composeRuntime({ adapter: testAdapter, siteConfig: testSiteConfig }).assets).toBeUndefined();
    const withAssets: CairnAdapter = {
      ...testAdapter,
      assets: { bucketBinding: 'MEDIA_BUCKET', publicBase: '/media' },
    };
    expect(composeRuntime({ adapter: withAssets, siteConfig: testSiteConfig }).assets).toEqual({ bucketBinding: 'MEDIA_BUCKET', publicBase: '/media' });
  });
});

describe('composeRuntime URL policy', () => {
  it('derives the per-concept URL policy from the site config', () => {
    const siteConfig = { siteName: 'Test', content: { posts: { permalink: '/:year/:slug', datePrefix: 'year' as const } } };
    const runtime = composeRuntime({ adapter: testAdapter, siteConfig });
    const posts = runtime.concepts.find((c) => c.id === 'posts')!;
    expect(posts.permalink).toBe('/:year/:slug');
  });

  it('applies the descriptor default when the site config names no policy', () => {
    const posts = composeRuntime({ adapter: testAdapter, siteConfig: testSiteConfig }).concepts.find((c) => c.id === 'posts')!;
    expect(posts.permalink).toBeDefined();
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
