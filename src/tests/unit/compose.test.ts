import { describe, it, expect } from 'vitest';
import { composeRuntime } from '../../lib/content/compose.js';
import type { CairnAdapter, CairnExtension, PreviewConfig } from '../../lib/content/types.js';
import { defineFields } from '../../lib/content/schema.js';
import { testSiteConfig } from './_content-fixture.js';

function adapter(): CairnAdapter {
  return {
    siteName: 'T',
    content: { pages: { dir: 'src/content/pages', schema: defineFields([]) } },
    backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
    sender: { from: 'cms@test' },
    render: (md) => md,
  };
}

describe('composeRuntime extension carry-through', () => {
  it('carries extension admin panels and field types onto the runtime', () => {
    const ext: CairnExtension = {
      adminPanels: [{ id: 'calendar', label: 'Calendar', component: {} }],
      fieldTypes: [{ type: 'color' }],
    };
    const runtime = composeRuntime({ adapter: adapter(), siteConfig: testSiteConfig, extensions: [ext] });
    expect(runtime.adminPanels).toEqual([{ id: 'calendar', label: 'Calendar', component: {} }]);
    expect(runtime.fieldTypes).toEqual([{ type: 'color' }]);
  });

  it('defaults the carried arrays to empty when no extension contributes', () => {
    const runtime = composeRuntime({ adapter: adapter(), siteConfig: testSiteConfig, extensions: [] });
    expect(runtime.adminPanels).toEqual([]);
    expect(runtime.fieldTypes).toEqual([]);
  });
});

describe('composeRuntime preview pass-through', () => {
  it('carries the adapter preview config onto the runtime untouched', () => {
    // The showcase shape: a hashed stylesheet URL from a Vite `?url` import plus theme roots,
    // with a per-concept wrapper override (the ecxc shape: posts wrap differently from pages).
    const preview: PreviewConfig = {
      stylesheets: ['/_app/immutable/assets/app.B3xJk2.css'],
      bodyClass: 'bg-base-100',
      containerClass: 'prose mx-auto',
      byConcept: { posts: { bodyClass: 'post-body', containerClass: 'post-module' } },
    };
    const runtime = composeRuntime({ adapter: { ...adapter(), preview }, siteConfig: testSiteConfig });
    expect(runtime.preview).toBe(preview);
    expect(runtime.preview?.byConcept).toEqual({ posts: { bodyClass: 'post-body', containerClass: 'post-module' } });
  });

  it('leaves preview undefined when the adapter omits it', () => {
    expect(composeRuntime({ adapter: adapter(), siteConfig: testSiteConfig }).preview).toBeUndefined();
  });
});

describe('composeRuntime manifestPath', () => {
  it('defaults the manifest path', () => {
    expect(composeRuntime({ adapter: adapter(), siteConfig: testSiteConfig }).manifestPath).toBe('src/content/.cairn/index.json');
  });
  it('honors an adapter override', () => {
    expect(composeRuntime({ adapter: { ...adapter(), manifestPath: 'content/.cairn/idx.json' }, siteConfig: testSiteConfig }).manifestPath).toBe('content/.cairn/idx.json');
  });
});

describe('composeRuntime resolvedAssets', () => {
  it('resolves to disabled media when the adapter declares no assets', () => {
    const runtime = composeRuntime({ adapter: adapter(), siteConfig: testSiteConfig });
    expect(runtime.resolvedAssets).toEqual({ enabled: false });
  });
  it('resolves a declared assets block into a filled config', () => {
    const withAssets: CairnAdapter = { ...adapter(), assets: { bucketBinding: 'MEDIA_BUCKET' } };
    const runtime = composeRuntime({ adapter: withAssets, siteConfig: testSiteConfig });
    expect(runtime.resolvedAssets.enabled).toBe(true);
    if (!runtime.resolvedAssets.enabled) throw new Error('expected enabled');
    expect(runtime.resolvedAssets.bucketBinding).toBe('MEDIA_BUCKET');
    expect(runtime.resolvedAssets.publicBase).toBe('/media');
    expect(runtime.resolvedAssets.transformations).toBe(false);
  });
});

describe('composeRuntime mediaManifestPath', () => {
  it('defaults the media manifest path', () => {
    expect(composeRuntime({ adapter: adapter(), siteConfig: testSiteConfig }).mediaManifestPath).toBe('src/content/.cairn/media.json');
  });
  it('honors an adapter override', () => {
    const runtime = composeRuntime({
      adapter: { ...adapter(), mediaManifestPath: 'content/.cairn/m.json' },
      siteConfig: testSiteConfig,
    });
    expect(runtime.mediaManifestPath).toBe('content/.cairn/m.json');
  });
});
